import type { Metadata } from "next";
import { Caveat, Patrick_Hand } from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "DPlaner — Plan Your Day, Your Way",
  description:
    "A hand-drawn daily planner with timetables, kanban todos, analytics, and activity tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --font-hand: ${caveat.style.fontFamily}, cursive;
            --font-body: ${patrickHand.style.fontFamily}, cursive;
          }
        `}</style>
      </head>
      <body className={`${caveat.variable} ${patrickHand.variable}`}>
        {children}
      </body>
    </html>
  );
}
