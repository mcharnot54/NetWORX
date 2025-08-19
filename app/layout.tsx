import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/context/DataContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DevErrorBoundary } from "@/components/DevErrorBoundary";
import { SafeNavigation } from "@/components/SafeNavigation";
import ConnectionStatus from "@/components/ConnectionStatus";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";

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
        <script
          src="/hmr-error-handler.js"
          async
          suppressHydrationWarning
        />
        <script
          src="/error-cleanup.js"
          async
          suppressHydrationWarning
        />
        <script
          src="/fetch-debug.js"
          async
          suppressHydrationWarning
        />
        <script
          src="/disable-hot-reload.js"
          async
          suppressHydrationWarning
        />
        <script
          src="/production-error-handler.js"
          async
          suppressHydrationWarning
        />
      </head>
      <body>
        <DevErrorBoundary>
          <GlobalErrorHandler>
            <ErrorBoundary>
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
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets%2F9ce0f418d64249b18f0cb96e0afc51db%2Fb2368c2083bd45189ccccb0c56de8b35?format=webp&width=800"
                          alt="Continuum"
                          className="continuum-logo"
                        />
                      </div>
                    </div>
                  </header>
                  <SafeNavigation />
                  {children}
                  <ConnectionStatus />
                </div>
              </DataProvider>
            </ErrorBoundary>
          </GlobalErrorHandler>
        </DevErrorBoundary>
      </body>
    </html>
  );
}
