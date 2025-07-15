import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetWORX Essentials",
  description:
    "Network Strategy Optimizer - Warehouse Space Optimization and Freight Cost Minimization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="main-container">
          <header className="banner">
            <h1 className="banner-title">NetWORX Essentials</h1>
            <p className="banner-subtitle">
              Network Strategy Optimizer - Warehouse Space Optimization &
              Freight Cost Minimization
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
