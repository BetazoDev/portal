import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM",
  description: "Gestor de proyectos y tareas por cliente.",
};

/**
 * Corre antes de pintar para que no haya destello de tema equivocado.
 * Sigue la preferencia del sistema salvo que el usuario haya elegido.
 */
const guionDeTema = `
try {
  var guardado = localStorage.getItem('tema');
  var oscuro = guardado ? guardado === 'oscuro'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', oscuro);
} catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Las variables de fuente van en <html>, no en <body>: la regla base de
    // Tailwind aplica font-sans sobre html y ahí tienen que estar definidas.
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: guionDeTema }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
