import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getServerSession } from "@/lib/supabase/server";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Ace That Interview - Interview Prep Platform",
  description: "Tailored interview prep courses for top companies",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <body className={poppins.className}>
        <Providers initialSession={session}>{children}</Providers>
      </body>
    </html>
  );
}
