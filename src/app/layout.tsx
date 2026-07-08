import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rooma Ceritarasa — Restaurant Reservation",
  description: "Sistem reservasi restoran Rooma Ceritarasa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
