import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LazorkitProvider } from "@/providers/LazorkitProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lazorkit Subscriptions - Gasless Recurring Payments",
  description: "Subscribe to services with Face ID. No seed phrases, no gas fees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LazorkitProvider>
          {children}
        </LazorkitProvider>
      </body>
    </html>
  );
}
