import Turnero from '@/components/turnero/Turnero';
import HeroCarousel from '@/components/HeroCarousel';
import Image from 'next/image';

const courts = [
  ['Cancha 1', 'Martín y Sofi', 'Diego y Caro'],
  ['Cancha 2', 'Nico y Lucía', 'Juan y Ana'],
  ['Cancha 3', 'Pablo y Flor', 'Tomi y Vale'],
];

export default function Home() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543517703596';

  return (
    <>
      <section
        className="relative isolate overflow-hidden bg-background pb-14 pt-9 sm:pb-[72px]"
        aria-labelledby="home-title"
      >
        <HeroCarousel />
        <div className="relative mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
          <div className="pt-2 lg:pt-8">
            <h1
              id="home-title"
              className="max-w-[8ch] text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-[.95] tracking-[-.03em]"
            >
              Reservá tu cancha
            </h1>
            <p className="mt-5 max-w-[34ch] text-lg text-neutral sm:text-xl">
              Elegí día y horario, entrá con Google y listo. Te confirmamos por WhatsApp.
            </p>
            <div className="mt-7 grid gap-1 font-semibold text-neutral-muted">
              <span>3 canchas techadas</span>
              <span>Lunes a domingo, de 8 a 24 h</span>
            </div>
          </div>
          <Turnero />
        </div>
      </section>

      <section
        id="social"
        className="relative isolate overflow-hidden bg-surface py-[72px] text-neutral sm:py-[88px]"
        aria-labelledby="social-title"
      >
        <Image
          src="/photos/canchapelota.jpg"
          alt=""
          fill
          className="-z-10 object-cover opacity-20"
        />
        <div className="absolute inset-0 -z-10 bg-background/80" />
        <div className="relative mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] items-center gap-12 px-5 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2
              id="social-title"
              className="max-w-[12ch] text-[clamp(3rem,6vw,5.5rem)] font-extrabold leading-[.95] text-accent"
            >
              Social de los viernes
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg text-neutral sm:text-[19px]">
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
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-accent font-extrabold text-dark">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div
            className="mx-auto w-full max-w-[300px] rounded-[40px] border border-muted bg-surface-light p-[14px] text-neutral shadow-2xl"
            aria-label="Vista de ejemplo del jugador"
          >
            <div className="overflow-hidden rounded-[28px] border border-muted bg-background">
              <div className="bg-surface px-[18px] pb-[18px] pt-[22px] text-neutral">
                <small className="font-semibold opacity-85">Ronda 3 · ahora</small>
                <p className="mt-1 text-[42px] font-extrabold leading-none text-accent">Cancha 2</p>
                <p className="mt-1 text-[15px] font-extrabold">Quedan 11:42</p>
              </div>
              <div className="m-[14px] grid gap-2 rounded-[18px] border border-muted bg-surface-light p-[14px]">
                <p className="flex justify-between font-semibold text-accent">
                  <span>Vos y Lucía</span>
                  <span>13</span>
                </p>
                <p className="text-center text-lg font-extrabold">vs</p>
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
                className="mx-[14px] mb-4 w-[calc(100%_-_28px)] rounded-full border border-neutral-muted bg-transparent px-3 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
              >
                Me voy del Social
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-[72px] text-neutral" aria-labelledby="tv-title">
        <div className="mx-auto max-w-[1180px] px-5">
          <h2
            id="tv-title"
            className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[.95] text-accent"
          >
            Así se ve en la tele del club
          </h2>
          <div className="mt-7 grid gap-[14px] md:grid-cols-3">
            {courts.map(([court, teamOne, teamTwo]) => (
              <article
                key={court}
                className="relative grid gap-1 overflow-hidden rounded-[18px] border border-muted bg-surface p-4 before:absolute before:inset-x-0 before:top-1/2 before:border-t-2 before:border-dashed before:border-muted"
              >
                <h3 className="text-[26px] font-extrabold leading-none text-accent">{court}</h3>
                <p className="relative z-10 text-lg font-semibold">{teamOne}</p>
                <p className="relative z-10 mb-[18px] text-lg font-semibold">{teamTwo}</p>
              </article>
            ))}
          </div>
          <p className="mt-[18px] text-neutral-muted">
            Esperan esta ronda: Ramiro, Belén, Gonza, Mica, Fede, Juli · Ronda 3 · quedan 11:42
          </p>
        </div>
      </section>

      <section
        id="info"
        className="border-y border-muted bg-surface py-[72px] text-neutral"
        aria-label="Información del club"
      >
        <div className="mx-auto grid max-w-[1180px] gap-7 px-5 md:grid-cols-3">
          <div>
            <h2 className="mb-1 text-[22px] font-extrabold text-accent">Dónde estamos</h2>
            <p className="text-neutral-muted">
              Baltazar de Ávila 146, Córdoba, Argentina. Estacionamiento en la puerta.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[22px] font-extrabold text-accent">Horarios</h2>
            <p className="text-neutral-muted">
              Todos los días de 8 a 24 h. Social: viernes desde las 20.
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-[22px] font-extrabold text-accent">Contacto</h2>
            <p className="text-neutral-muted">
              <a
                className="font-semibold text-neutral underline decoration-accent underline-offset-4 hover:text-accent"
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
