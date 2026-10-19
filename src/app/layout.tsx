import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Betz Buddy AI",
  description: "A human-in-the-loop desk for no-vig fair odds, expected value, and stake size.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
