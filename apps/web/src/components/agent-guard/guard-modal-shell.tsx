"use client";

import { useEffect, type ReactNode } from "react";

type GuardModalShellProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidthClassName?: string;
};

export function GuardModalShell({
    isOpen,
    onClose,
    children,
    maxWidthClassName = "max-w-4xl",
}: GuardModalShellProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="theme-overlay fixed inset-0 z-50 p-4" onClick={onClose}>
            <div className="flex min-h-full items-center justify-center">
                <div
                    className={`relative max-h-[90vh] w-full overflow-y-auto ${maxWidthClassName}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="theme-modal-close absolute right-4 top-4 z-10"
                    >
                        Close
                    </button>

                    {children}
                </div>
            </div>
        </div>
    );
}
