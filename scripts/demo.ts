import { Address, Cell, ContractState, Transaction, beginCell, fromNano, toNano } from '@ton/core';
import { AgentGuard, AgentGuard_errors_backward } from '../build/AgentGuard/AgentGuard_AgentGuard';
import { CounterReceiver, storePing } from '../build/CounterReceiver/CounterReceiver_CounterReceiver';
import { NetworkProvider } from '@ton/blueprint';

const PING_OPCODE = BigInt(CounterReceiver.opcodes.Ping);
const POLICY_MODE_OPCODE_ONLY = 0n;
const POLICY_MODE_EXACT_BODY_HASH = 1n;
const BODY_HASH_DISABLED = 0n;

const GUARD_DEPLOY_VALUE = toNano('0.2');
const COUNTER_DEPLOY_VALUE = toNano('0.2');
const GUARD_FUNDING_VALUE = toNano('1');
const CREATE_SESSION_VALUE = toNano('0.1');
const EXECUTE_GAS_VALUE = toNano('0.2');

const OPCODE_ONLY_MAX_TOTAL = toNano('0.5');
const OPCODE_ONLY_MAX_PER_TX = toNano('0.2');
const OPCODE_ONLY_EXEC_VALUE = toNano('0.1');
const OPCODE_ONLY_NOTE = 11n;

const STRICT_MAX_TOTAL = toNano('0.3');
const STRICT_MAX_PER_TX = toNano('0.15');
const STRICT_EXEC_VALUE = toNano('0.05');
const STRICT_NOTE = 22n;
const STRICT_MISMATCH_NOTE = 23n;

const SESSION_LIFETIME_SECONDS = 3600n;
const STRICT_REJECTION_EXIT_CODE = AgentGuard_errors_backward.BODY_HASH_MISMATCH;

type SessionLike = Awaited<ReturnType<AgentGuard['getGetSession']>>;

type TransactionsReader = {
    getTransactions: (address: Address, lt: bigint, hash: Buffer, limit?: number) => Promise<Transaction[]>;
};

type GuardBalanceReader = {
    address: Address;
    getGetReservedTotal(): Promise<bigint>;
    getGetAvailableBalance(): Promise<bigint>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const section = (() => {
    let step = 0;

    return (title: string, detail?: string) => {
        step += 1;
        console.log(`\n=== Phase ${step}: ${title} ===`);
        if (detail) {
            console.log(detail);
        }
    };
})();

function assertDemo(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(`Demo assertion failed: ${message}`);
    }
}

function buildPingBody(note: bigint): Cell {
    return beginCell()
        .store(storePing({ $$type: 'Ping', note }))
        .endCell();
}

function cellHashInt(cell: Cell): bigint {
    return BigInt(`0x${cell.hash().toString('hex')}`);
}

function formatTon(amount: bigint): string {
    return `${fromNano(amount)} TON`;
}

function formatHash(hash: bigint): string {
    return hash === 0n ? 'disabled (0)' : `0x${hash.toString(16)}`;
}

function formatOpcode(opcode: bigint): string {
    return `0x${opcode.toString(16)}`;
}

function formatPolicyMode(policyMode: bigint): string {
    if (policyMode === POLICY_MODE_OPCODE_ONLY) {
        return 'opcode-only';
    }

    if (policyMode === POLICY_MODE_EXACT_BODY_HASH) {
        return 'exact-body-hash strict';
    }

    return `unknown(${policyMode.toString()})`;
}

function getVmExitCode(tx: Transaction): number | null {
    const { description } = tx;

    if (!('computePhase' in description)) {
        return null;
    }

    return description.computePhase.type === 'vm' ? description.computePhase.exitCode : null;
}

function isTransactionAborted(tx: Transaction): boolean | null {
    return 'aborted' in tx.description ? tx.description.aborted : null;
}

async function maybeWaitForLastTransaction(provider: NetworkProvider, fallbackDelayMs = 1500) {
    const lastSendResult = provider.sender().lastSendResult;
    const waitSupported =
        typeof lastSendResult === 'object' &&
        lastSendResult !== null &&
        'boc' in lastSendResult &&
        typeof lastSendResult.boc === 'string';

    if (waitSupported) {
        await provider.waitForLastTransaction();
        return;
    }

    await sleep(fallbackDelayMs);
}

async function getLatestTransaction(provider: NetworkProvider, address: Address): Promise<Transaction | null> {
    const state: ContractState = await provider.getContractState(address);

    if (!state.last) {
        return null;
    }

    const contractProvider = provider.provider(address) as unknown as TransactionsReader;
    const transactions = await contractProvider.getTransactions(address, state.last.lt, state.last.hash, 1);

    return transactions[0] ?? null;
}

async function printGuardBalanceSnapshot(provider: NetworkProvider, guard: GuardBalanceReader, label: string) {
    const [contractState, reservedTotal, availableBalance] = await Promise.all([
        provider.getContractState(guard.address),
        guard.getGetReservedTotal(),
        guard.getGetAvailableBalance(),
    ]);

    console.log(
        `${label}: balance=${formatTon(contractState.balance)}, reserved=${formatTon(
            reservedTotal,
        )}, available=${formatTon(availableBalance)}`,
    );
}

function printSessionSnapshot(sessionId: bigint, session: SessionLike, label: string) {
    console.log(
        `${label}: session ${sessionId.toString()} | mode=${formatPolicyMode(
            session.policyMode,
        )} | allowedOp=${formatOpcode(session.allowedOp)} | bodyHash=${formatHash(session.bodyHash)}`,
    );
    console.log(
        `  target=${session.target.toString()} | spent=${formatTon(
            session.spentTotal,
        )} | nonceExpected=${session.nonceExpected.toString()} | locked=${formatTon(session.lockedAmount)}`,
    );
}

export async function run(provider: NetworkProvider) {
    const owner = provider.sender();
    if (!owner.address) {
        throw new Error('Sender has no address');
    }

    const ownerAddress = owner.address;

    // Demo keeps owner and agent as the same wallet for convenience.
    // Session policy enforcement still happens fully on-chain.
    const agent = owner;
    const agentAddress = ownerAddress;

    console.log('AgentGuard demo: bounded delegation with two policy modes.');
    console.log(
        'Demo setup: owner and agent use the same wallet for convenience; the session policy still gates execution.',
    );

    section('Deploy guard', 'Deploying AgentGuard and the CounterReceiver target used throughout the walkthrough.');

    const guard = provider.open(await AgentGuard.fromInit(ownerAddress));
    await guard.send(owner, { value: GUARD_DEPLOY_VALUE }, null);
    await provider.waitForDeploy(guard.address);
    console.log(`AgentGuard deployed at ${guard.address.toString()}`);

    const counter = provider.open(await CounterReceiver.fromInit(1n));
    await counter.send(owner, { value: COUNTER_DEPLOY_VALUE }, null);
    await provider.waitForDeploy(counter.address);
    console.log(`CounterReceiver deployed at ${counter.address.toString()}`);

    section('Fund guard', 'Funding the guard so sessions can reserve spend while preserving the storage reserve.');

    await owner.send({
        to: guard.address,
        value: GUARD_FUNDING_VALUE,
    });
    await maybeWaitForLastTransaction(provider);
    await printGuardBalanceSnapshot(provider, guard, 'Guard balances after funding');

    section(
        'Create opcode-only session',
        'policyMode=0 accepts any body with the configured opcode. bodyHash must stay disabled (0).',
    );

    const opcodeSessionId = await guard.getGetNextSessionId();
    console.log(
        `Creating session ${opcodeSessionId.toString()} with allowedOp=${formatOpcode(
            PING_OPCODE,
        )}, policyMode=0, bodyHash=0.`,
    );

    await guard.send(
        owner,
        { value: CREATE_SESSION_VALUE },
        {
            $$type: 'CreateSession',
            agent: agentAddress,
            target: counter.address,
            allowedOp: PING_OPCODE,
            policyMode: POLICY_MODE_OPCODE_ONLY,
            bodyHash: BODY_HASH_DISABLED,
            expiry: BigInt(Math.floor(Date.now() / 1000)) + SESSION_LIFETIME_SECONDS,
            maxTotal: OPCODE_ONLY_MAX_TOTAL,
            maxPerTx: OPCODE_ONLY_MAX_PER_TX,
        },
    );
    await maybeWaitForLastTransaction(provider);

    const opcodeSession = await guard.getGetSession(opcodeSessionId);
    assertDemo(
        opcodeSession.policyMode === POLICY_MODE_OPCODE_ONLY,
        'Opcode-only session was not stored with policyMode=0',
    );
    assertDemo(opcodeSession.bodyHash === BODY_HASH_DISABLED, 'Opcode-only session bodyHash was not zero');
    printSessionSnapshot(opcodeSessionId, opcodeSession, 'Opcode-only session created');
    await printGuardBalanceSnapshot(provider, guard, 'Guard balances after opcode-only session creation');

    section('Execute allowed opcode-only call', 'Any Ping body is allowed here because only the opcode is pinned.');

    const opcodeOnlyBody = buildPingBody(OPCODE_ONLY_NOTE);
    console.log(
        `Executing session ${opcodeSessionId.toString()} with Ping(note=${OPCODE_ONLY_NOTE.toString()}) and value=${formatTon(
            OPCODE_ONLY_EXEC_VALUE,
        )}.`,
    );

    await guard.send(
        agent,
        { value: EXECUTE_GAS_VALUE },
        {
            $$type: 'Execute',
            sessionId: opcodeSessionId,
            nonce: 0n,
            value: OPCODE_ONLY_EXEC_VALUE,
            body: opcodeOnlyBody,
        },
    );
    await maybeWaitForLastTransaction(provider);

    const opcodeSessionAfterExec = await guard.getGetSession(opcodeSessionId);
    const counterAfterOpcodeOnly = await counter.getGetCount();
    assertDemo(
        counterAfterOpcodeOnly === OPCODE_ONLY_NOTE,
        'Opcode-only execution did not update the target as expected',
    );
    assertDemo(opcodeSessionAfterExec.nonceExpected === 1n, 'Opcode-only execution did not increment nonceExpected');
    assertDemo(
        opcodeSessionAfterExec.spentTotal === OPCODE_ONLY_EXEC_VALUE,
        'Opcode-only execution did not consume the expected session quota',
    );
    console.log(`Opcode-only execution succeeded. CounterReceiver count is now ${counterAfterOpcodeOnly.toString()}.`);
    printSessionSnapshot(opcodeSessionId, opcodeSessionAfterExec, 'Opcode-only session after execution');
    await printGuardBalanceSnapshot(provider, guard, 'Guard balances after opcode-only execution');

    section('Create exact-body-hash session', 'policyMode=1 pins both the opcode and one exact message body hash.');

    const strictSessionId = await guard.getGetNextSessionId();
    const strictBody = buildPingBody(STRICT_NOTE);
    const strictBodyHash = cellHashInt(strictBody);
    console.log(
        `Creating session ${strictSessionId.toString()} with allowedOp=${formatOpcode(
            PING_OPCODE,
        )}, policyMode=1, pinned body Ping(note=${STRICT_NOTE.toString()}).`,
    );
    console.log(`Pinned body hash: ${formatHash(strictBodyHash)}`);

    await guard.send(
        owner,
        { value: CREATE_SESSION_VALUE },
        {
            $$type: 'CreateSession',
            agent: agentAddress,
            target: counter.address,
            allowedOp: PING_OPCODE,
            policyMode: POLICY_MODE_EXACT_BODY_HASH,
            bodyHash: strictBodyHash,
            expiry: BigInt(Math.floor(Date.now() / 1000)) + SESSION_LIFETIME_SECONDS,
            maxTotal: STRICT_MAX_TOTAL,
            maxPerTx: STRICT_MAX_PER_TX,
        },
    );
    await maybeWaitForLastTransaction(provider);

    const strictSession = await guard.getGetSession(strictSessionId);
    assertDemo(
        strictSession.policyMode === POLICY_MODE_EXACT_BODY_HASH,
        'Strict session was not stored with policyMode=1',
    );
    assertDemo(
        strictSession.bodyHash === strictBodyHash,
        'Strict session body hash does not match the pinned payload hash',
    );
    printSessionSnapshot(strictSessionId, strictSession, 'Strict session created');
    await printGuardBalanceSnapshot(provider, guard, 'Guard balances after strict session creation');

    section(
        'Execute exact matching payload',
        'The exact pinned Ping body should pass because both opcode and body hash match.',
    );

    await guard.send(
        agent,
        { value: EXECUTE_GAS_VALUE },
        {
            $$type: 'Execute',
            sessionId: strictSessionId,
            nonce: 0n,
            value: STRICT_EXEC_VALUE,
            body: strictBody,
        },
    );
    await maybeWaitForLastTransaction(provider);

    const strictSessionAfterMatch = await guard.getGetSession(strictSessionId);
    const counterAfterStrictMatch = await counter.getGetCount();
    assertDemo(
        counterAfterStrictMatch === OPCODE_ONLY_NOTE + STRICT_NOTE,
        'Strict execution did not update the target as expected',
    );
    assertDemo(strictSessionAfterMatch.nonceExpected === 1n, 'Strict execution did not increment nonceExpected');
    assertDemo(
        strictSessionAfterMatch.spentTotal === STRICT_EXEC_VALUE,
        'Strict execution did not consume the expected session quota',
    );
    console.log(`Strict execution succeeded. CounterReceiver count is now ${counterAfterStrictMatch.toString()}.`);
    printSessionSnapshot(strictSessionId, strictSessionAfterMatch, 'Strict session after exact-match execution');
    await printGuardBalanceSnapshot(provider, guard, 'Guard balances after strict exact-match execution');

    section(
        'Attempt same opcode with different payload',
        'This uses the same target and Ping opcode, but changes the payload body. Strict mode should reject it.',
    );

    const mismatchedBody = buildPingBody(STRICT_MISMATCH_NOTE);
    const mismatchedBodyHash = cellHashInt(mismatchedBody);
    console.log(
        `Attempting Ping(note=${STRICT_MISMATCH_NOTE.toString()}) with the same opcode ${formatOpcode(PING_OPCODE)}.`,
    );
    console.log(
        `Pinned strict hash is ${formatHash(
            strictBodyHash,
        )}; attempted body hash is ${formatHash(mismatchedBodyHash)}.`,
    );

    await guard.send(
        agent,
        { value: EXECUTE_GAS_VALUE },
        {
            $$type: 'Execute',
            sessionId: strictSessionId,
            nonce: strictSessionAfterMatch.nonceExpected,
            value: STRICT_EXEC_VALUE,
            body: mismatchedBody,
        },
    );
    await maybeWaitForLastTransaction(provider);

    section(
        'Show rejection / failure result',
        'AgentGuard should block the forwarded call because the body hash changed while the session is strict.',
    );

    const [strictSessionAfterReject, counterAfterReject, latestGuardTx] = await Promise.all([
        guard.getGetSession(strictSessionId),
        counter.getGetCount(),
        getLatestTransaction(provider, guard.address),
    ]);

    assertDemo(
        strictSessionAfterReject.nonceExpected === strictSessionAfterMatch.nonceExpected,
        'Rejected strict execution unexpectedly advanced the nonce',
    );
    assertDemo(
        strictSessionAfterReject.spentTotal === strictSessionAfterMatch.spentTotal,
        'Rejected strict execution unexpectedly consumed session quota',
    );
    assertDemo(
        counterAfterReject === counterAfterStrictMatch,
        'Rejected strict execution unexpectedly changed target state',
    );

    const strictRejectExitCode = latestGuardTx ? getVmExitCode(latestGuardTx) : null;
    const strictRejectAborted = latestGuardTx ? isTransactionAborted(latestGuardTx) : null;

    if (strictRejectExitCode !== null) {
        console.log(
            `Latest AgentGuard transaction exit code: ${strictRejectExitCode.toString()}${
                strictRejectExitCode === STRICT_REJECTION_EXIT_CODE ? ' (BODY_HASH_MISMATCH)' : ''
            }`,
        );
    } else {
        console.log('Latest AgentGuard transaction exit code could not be decoded from the available provider data.');
    }

    if (strictRejectAborted !== null) {
        console.log(`Latest AgentGuard transaction aborted: ${strictRejectAborted}`);
    }

    assertDemo(
        strictRejectExitCode === null || strictRejectExitCode === STRICT_REJECTION_EXIT_CODE,
        'Strict rejection exit code did not match BODY_HASH_MISMATCH',
    );

    console.log('Strict-mode protection confirmed: same target + same opcode + different payload was rejected.');
    console.log(
        'No quota was consumed, the strict session nonce did not advance, and the target counter stayed unchanged.',
    );

    section(
        'Show final session state / balances',
        'Final snapshots for operators: one broader opcode-only session and one exact-payload strict session.',
    );

    printSessionSnapshot(opcodeSessionId, opcodeSessionAfterExec, 'Final opcode-only session state');
    printSessionSnapshot(strictSessionId, strictSessionAfterReject, 'Final strict session state');
    await printGuardBalanceSnapshot(provider, guard, 'Final guard balances');
    console.log(`Final CounterReceiver count: ${counterAfterReject.toString()}`);
    console.log(
        'Demo summary: bounded delegation, broader opcode-only authorization, stricter exact payload authorization, and same-opcode payload tampering blocked.',
    );
}
