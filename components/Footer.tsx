import Link from 'next/link';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543517703596';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function Footer() {
  return (
    <footer className="bg-surface text-neutral py-6 border-t border-muted">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left space-y-1 text-sm">
          <p className="text-base font-semibold text-primary">Mundo Pádel</p>
          <p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              351 770-3596
            </a>
          </p>
          <p>Baltazar de Ávila 146</p>
          <p>Córdoba, Argentina</p>
          <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
        </div>

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
