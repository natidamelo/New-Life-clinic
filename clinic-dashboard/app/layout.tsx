import type { Metadata } from "next";
import { ThemeProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Life Medium Clinic — Dashboard",
  description: "Clinical management dashboard for New Life Medium Clinic",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-alabaster dark:bg-deep-slate text-deep-slate dark:text-[#F8FAFC] min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
