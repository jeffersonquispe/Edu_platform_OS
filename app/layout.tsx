import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { EdyAssistant } from "@/components/EdyAssistant/EdyAssistant";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

// The header reads the auth session per request; skip static prerendering.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Course Platform — Learn at your own pace",
    template: "%s · Course Platform",
  },
  description:
    "Publish and learn online courses with interactive video lessons, quizzes, and progress tracking.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Course Platform",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline theme script: prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <SiteHeader />
        <main className="container" style={{ paddingBlock: "var(--space-8)" }}>
          {children}
        </main>
        <EdyAssistant />
      </body>
    </html>
  );
}
