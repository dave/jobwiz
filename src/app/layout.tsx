import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getServerSession } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";

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
        <Providers initialSession={session}>
          <div className="min-h-screen flex flex-col">
            <Header initialIsLoggedIn={!!session} />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
