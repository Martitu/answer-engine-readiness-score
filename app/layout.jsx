import "./globals.css";

export const metadata = {
  title: "Answer Engine Readiness Score",
  description: "Paste any draft. Receive a readiness score and strategic refinements."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
