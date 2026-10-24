import '@/styles/globals.css';
import { Bagel_Fat_One, Bricolage_Grotesque } from 'next/font/google';
import { UserProvider } from '@/context/UserContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const bagelFatOne = Bagel_Fat_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-bagel',
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bagelFatOne.variable} ${bricolageGrotesque.variable}`}>
      <head>
        <title>Mundo Pádel - Reserva tu turno</title>
        <meta
          name="description"
          content="Reserva tu turno en Mundo Pádel fácil y rápido. Elegí el horario que más te convenga y asegurá tu cancha."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href="/favicon.ico" />

        {/* Theme colors */}
        <meta name="theme-color" content="#F3E21B" />
        <meta name="msapplication-TileColor" content="#F3E21B" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mundo-padel.vercel.app/" />
        <meta property="og:title" content="Mundo Pádel - Reserva tu turno" />
        <meta
          property="og:description"
          content="Reserva tu turno en Mundo Pádel fácil y rápido. Elegí el horario que más te convenga y asegurá tu cancha."
        />
        <meta property="og:image" content="/android-chrome-512x512.png" />
        <meta property="og:locale" content="es_AR" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://mundo-padel.vercel.app/" />
        <meta property="twitter:title" content="Mundo Pádel - Reserva tu turno" />
        <meta
          property="twitter:description"
          content="Reserva tu turno en Mundo Pádel fácil y rápido"
        />
        <meta property="twitter:image" content="/android-chrome-512x512.png" />

        {/* Additional meta tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Mundo Pádel" />
        <meta name="keywords" content="pádel, reservas, canchas, deporte, turnos" />
      </head>
      <body className="flex min-h-screen flex-col bg-line text-ink">
        <UserProvider>
          <Header />
          <main className="flex-1 pt-[76px]">{children}</main>
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
