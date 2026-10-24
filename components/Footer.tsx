import Link from 'next/link';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543517703596';

export default function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-ball py-7 text-ink">
      <div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-4 px-5 text-sm font-semibold md:flex-row md:items-end">
        <div>
          <p className="font-display text-2xl">Mundo Pádel</p>
          <p>Baltazar de Ávila 146 · Córdoba, Argentina</p>
        </div>
        <div className="md:text-right">
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:no-underline"
          >
            351 770-3596
          </a>
          <p>© {new Date().getFullYear()} Mundo Pádel</p>
          <p className="font-normal">
            Desarrollado por{' '}
            <Link
              href="https://www.developingbridges.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Developing Bridges
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
