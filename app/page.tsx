import Turnero from '@/components/turnero/Turnero';

const courts = [
  ['Cancha 1', 'Martín y Sofi', 'Diego y Caro'],
  ['Cancha 2', 'Nico y Lucía', 'Juan y Ana'],
  ['Cancha 3', 'Pablo y Flor', 'Tomi y Vale'],
];

export default function Home() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543517703596';

  return (
    <>
      <section className="bg-ball pb-14 pt-9 sm:pb-[72px]" aria-labelledby="home-title">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
          <div className="pt-2 lg:pt-8">
            <h1
              id="home-title"
              className="font-display max-w-[7ch] text-[clamp(4rem,9vw,8.25rem)] leading-[.92] tracking-[-.01em]"
            >
              Reservá tu cancha
            </h1>
            <p className="mt-5 max-w-[30ch] text-lg sm:text-xl">
              Elegí día y horario, entrá con Google y listo. Te confirmamos por WhatsApp.
            </p>
            <div className="mt-7 grid gap-1 font-semibold">
              <span>3 canchas techadas</span>
              <span>Lunes a domingo, de 8 a 24 h</span>
            </div>
          </div>
          <Turnero />
        </div>
      </section>

      <section
        id="social"
        className="bg-ink py-[72px] text-line sm:py-[88px]"
        aria-labelledby="social-title"
      >
        <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] items-center gap-12 px-5 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2
              id="social-title"
              className="font-display max-w-[10ch] text-[clamp(3.5rem,7vw,6.5rem)] leading-[.92] text-ball"
            >
              Social de los viernes
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg text-[#E9E7E2] sm:text-[19px]">
              Comida y bebida libre, partidos de 15 minutos y gente nueva en cada ronda. No importa
              tu nivel: el sistema arma partidos parejos.
            </p>
            <ol className="mt-7 grid list-none gap-4 p-0">
              {[
                'Escaneá el QR al llegar y entrá con tu cuenta de Google.',
                'Quedás en la lista de presentes.',
                'Cada 15 minutos tu celular te dice en qué cancha jugás y con quién.',
              ].map((step, index) => (
                <li key={step} className="grid grid-cols-[34px_1fr] gap-3">
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-ball font-extrabold text-ink">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div
            className="mx-auto w-full max-w-[300px] rounded-[40px] bg-line p-[14px] text-ink ring-[10px] ring-[#3A3936]"
            aria-label="Vista de ejemplo del jugador"
          >
            <div className="overflow-hidden rounded-[28px] bg-glass">
              <div className="bg-court px-[18px] pb-[18px] pt-[22px] text-line">
                <small className="font-semibold opacity-85">Ronda 3 · ahora</small>
                <p className="font-display mt-1 text-[46px] leading-none text-ball">Cancha 2</p>
                <p className="mt-1 text-[15px] font-extrabold">Quedan 11:42</p>
              </div>
              <div className="m-[14px] grid gap-2 rounded-[18px] bg-line p-[14px]">
                <p className="flex justify-between font-semibold text-court">
                  <span>Vos y Lucía</span>
                  <span>13</span>
                </p>
                <p className="font-display text-center text-lg">vs</p>
                <p className="flex justify-between font-semibold">
                  <span>Juan y Ana</span>
                  <span>12</span>
                </p>
              </div>
              <p className="mx-[14px] mb-4 text-sm">
                <b className="block">Próxima ronda</b>Descansás una y volvés en la ronda 5.
              </p>
              <button
                type="button"
                className="mx-[14px] mb-4 w-[calc(100%_-_28px)] rounded-full border-2 border-ink bg-transparent px-3 py-2 text-sm font-semibold"
              >
                Me voy del Social
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-court py-[72px] text-line" aria-labelledby="tv-title">
        <div className="mx-auto max-w-[1180px] px-5">
          <h2
            id="tv-title"
            className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[.92] text-ball"
          >
            Así se ve en la tele del club
          </h2>
          <div className="mt-7 grid gap-[14px] md:grid-cols-3">
            {courts.map(([court, teamOne, teamTwo]) => (
              <article
                key={court}
                className="relative grid gap-1 overflow-hidden rounded-[18px] border-[3px] border-line p-4 before:absolute before:inset-x-0 before:top-1/2 before:border-t-2 before:border-dashed before:border-line/40"
              >
                <h3 className="font-display text-[26px] leading-none text-ball">{court}</h3>
                <p className="relative z-10 text-lg font-semibold">{teamOne}</p>
                <p className="relative z-10 mb-[18px] text-lg font-semibold">{teamTwo}</p>
              </article>
            ))}
          </div>
          <p className="mt-[18px] opacity-90">
            Esperan esta ronda: Ramiro, Belén, Gonza, Mica, Fede, Juli · Ronda 3 · quedan 11:42
          </p>
        </div>
      </section>

      <section id="info" className="bg-line py-[72px]" aria-label="Información del club">
        <div className="mx-auto grid max-w-[1180px] gap-7 px-5 md:grid-cols-3">
          <div>
            <h2 className="mb-1 text-[22px] font-extrabold">Dónde estamos</h2>
            <p>Baltazar de Ávila 146, Córdoba, Argentina. Estacionamiento en la puerta.</p>
          </div>
          <div>
            <h2 className="mb-1 text-[22px] font-extrabold">Horarios</h2>
            <p>Todos los días de 8 a 24 h. Social: viernes desde las 20.</p>
          </div>
          <div>
            <h2 className="mb-1 text-[22px] font-extrabold">Contacto</h2>
            <p>
              <a
                className="font-semibold underline underline-offset-4"
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp del club
              </a>{' '}
              para dudas y turnos fijos.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
