import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Shariah Gap Screener — US Stocks",
  description:
    "High-quality gap-up screener for Shariah-compliant US stocks. Long-only, conservative, trader-focused.",
  keywords: "shariah stocks, gap screener, US stocks, halal investing, gap up",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Sidebar />
        <main className="main-content">
          <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
