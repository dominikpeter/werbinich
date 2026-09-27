import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["700", "800"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const jet = JetBrains_Mono({ variable: "--font-jet", subsets: ["latin"], weight: ["400", "600"] });

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
    <html lang="de" className={`${syne.variable} ${grotesk.variable} ${jet.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">{children}</body>
    </html>
  );
}
