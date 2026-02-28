import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VirtualCity — The Digital Luxury Experience",
  description:
    "Enter a living, breathing virtual city. Casino, sports betting, real estate, and more in a fully immersive 3D world.",
  keywords: ["virtual city", "casino", "sports betting", "3D world", "digital entertainment"],
  openGraph: {
    title: "VirtualCity",
    description: "The premier virtual entertainment destination",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
