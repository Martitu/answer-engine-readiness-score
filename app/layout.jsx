import "./globals.css";

export const metadata = {
  title: "Answer Engine Readiness Score",
  description: "A quick copy hygiene check for AI-ready clarity.",
  openGraph: {
    title: "Answer Engine Readiness Score",
    description: "A quick copy hygiene check for AI-ready clarity.",
    images: ["/thumbnail.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Answer Engine Readiness Score",
    description: "A quick copy hygiene check for AI-ready clarity.",
    images: ["/thumbnail.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
