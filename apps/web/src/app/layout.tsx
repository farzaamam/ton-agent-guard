import type { Metadata } from "next";
import "./globals.css";
import { TonProvider } from "@/components/providers/ton-connect-provider";

export const metadata: Metadata = {
  title: "AgentGuard",
  description: "Session-based execution guard for TON agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TonProvider>{children}</TonProvider>
      </body>
    </html>
  );
}
