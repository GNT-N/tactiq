import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Chakra Petch porte des angles coupés dans ses propres lettres : elles
// riment avec le biseau des panneaux au lieu de simplement coexister.
// Réservée aux titres et libellés — elle fatigue sur du texte long.
const titre = Chakra_Petch({
  variable: "--police-titre",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Plex Sans et Plex Mono viennent de la même superfamille : les résumés
// et les données s'accordent sans se ressembler.
const texte = IBM_Plex_Sans({
  variable: "--police-texte",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const donnee = IBM_Plex_Mono({
  variable: "--police-donnee",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Tactiq",
  description: "CRM de prospection",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${titre.variable} ${texte.variable} ${donnee.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
