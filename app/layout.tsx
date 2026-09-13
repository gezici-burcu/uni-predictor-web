import type { Metadata } from "next";
import { Header } from "./components/header";
import "./globals.css";
import { AppProviders } from "@/src/contexts/AppProviders";

export const metadata: Metadata = {
  title: "Uni-Predictor Web",
  description: "Üniversite sıralama simülasyonu ve karar destek platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="antialiased">
      <body className="min-h-screen text-slate-950">
        <AppProviders>
          <div className="app-shell">
            <Header />
            <main className="app-main mx-auto w-full max-w-[1680px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
