import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Life Medium Clinic | Clinical Operations Dashboard",
  description: "Production-grade Clinic Management Dashboard with strict 60-30-10 clinical hierarchy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
