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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
                <div className="powered-by">
                  <span className="powered-by-text">powered by:</span>
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2F9ce0f418d64249b18f0cb96e0afc51db%2Fbde17f6b2e9b404e87cfbb3b14c653d4?format=webp&width=800"
                    alt="Continuum"
                    className="continuum-logo"
                  />
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
