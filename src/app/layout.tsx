import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Logic Simulator",
  description: "A browser-based digital circuit simulator with polished wiring."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
