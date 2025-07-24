import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-background text-muted py-6 mt-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Contact Info */}
        <div className="text-center md:text-left space-y-1 text-sm">
          <p className="text-base font-semibold text-primary">Mundo Pádel</p>
          <p>351 770-3596</p>
          <p>Baltazar de Ávila 146</p>
          <p>Córdoba, Argentina</p>
          <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
        </div>

        {/* Developer Credit */}
        <div className="text-center md:text-right text-sm">
          <p>
            Powered by{' '}
            <Link
              href="https://www.developingbridges.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Developing Bridges
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
