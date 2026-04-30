import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Answer Engine Readiness Score",
  description:
    "See whether your copy gives AI enough to understand, trust and recommend you.",
  openGraph: {
    title: "Answer Engine Readiness Score",
    description:
      "Paste web, PR or brand copy to see whether it is clear, specific, verifiable and easy for AI assistants to extract.",
    images: ["/readiness-visual.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Answer Engine Readiness Score",
    description:
      "Paste web, PR or brand copy to see whether it is clear, specific, verifiable and easy for AI assistants to extract.",
    images: ["/readiness-visual.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
 
