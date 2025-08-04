import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/context/DataContext";

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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DataProvider>
          <div className="main-container">
            <header className="banner">
              <div className="banner-content">
                <div className="banner-left">
                  <h1 className="banner-title">NetWORX Essentials</h1>
                  <p className="banner-subtitle">
                    Network Strategy Optimizer - Warehouse Space Optimization &
                    Freight Cost Minimization
                  </p>
                </div>
                <div className="banner-right">
                  <span className="powered-by-text">powered by </span>
                  <span className="continuum-text">&nbsp;CONTINUUM</span>
                </div>
              </div>
            </header>
            {children}
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
