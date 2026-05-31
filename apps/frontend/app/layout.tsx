import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Track daily habits and build streaks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <header className="sticky top-0 z-40 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-6">
              <span className="text-base font-semibold tracking-tight">
                Habit Tracker
              </span>
              <span className="text-sm text-muted">Dashboard</span>
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
