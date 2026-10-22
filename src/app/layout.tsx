import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "oGT CV Pool | AIESEC in India",
  description: "Outgoing Global Talent applicants from AIESEC in India.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// Sets the saved theme before the first paint, so there is no flash. Dark when nothing is saved.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above may change data-theme before React hydrates.
    <html lang="en" data-theme="dark" className={lato.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
