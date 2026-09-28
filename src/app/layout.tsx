import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// one clean family for everything, its mono twin for the AI's readouts (the terminal glow)
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description = "Wer bin ich? Das Partyspiel, bei dem die KI mithört: sprich deine Fragen, Jev rechnet mit, Luna gibt Tipps.";
export const metadata: Metadata = {
  metadataBase: new URL("https://werbinich.ai"),
  title: "werbinich.ai",
  description,
  appleWebApp: { capable: true, title: "Wer bin ich?", statusBarStyle: "black-translucent" },
  openGraph: { title: "werbinich.ai", description, siteName: "werbinich.ai", locale: "de_CH", type: "website" },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0b0a12" };

// the saved language before first paint
const langScript = `try{var l=localStorage.getItem("werbinich:lang");if(l)document.documentElement.lang=l}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${geist.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans safe-top safe-bottom">{children}</body>
    </html>
  );
}
