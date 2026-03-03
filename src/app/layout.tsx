import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CryptoAnalyzer",
  description: "Real-time crypto and stock market analysis with composite buy/sell signal scoring",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CryptoAnalyzer",
  },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <SessionProvider>
          {children}
          <ServiceWorkerRegister />
        </SessionProvider>
      </body>
    </html>
  );
}
