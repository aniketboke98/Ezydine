import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EzyDine POS | Manager Order Portal",
  description: "EzyDine Restaurant POS & Order Taking System for Floor Managers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F7F8FA] text-[#0B1B29] font-sans">
        {children}
      </body>
    </html>
  );
}
