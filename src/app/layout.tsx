import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobWiz - Interview Prep Platform",
  description: "Tailored interview prep courses for top companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
