import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CryptoAnalyzer",
  description: "Real-time crypto and stock market analysis with composite buy/sell signal scoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
