import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FX5U Control Center",
  description: "Mitsubishi PLC control dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
