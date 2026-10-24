import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y condiciones | Mundo Pádel',
};

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function TermsPage() {
  return (
    <section className="bg-background py-14 sm:py-20">
      <article className="mx-auto max-w-[70ch] px-5 text-neutral">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Mundo Pádel</p>
        <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
          Términos y condiciones
        </h1>
        <p className="mt-5 text-neutral-muted">Última actualización: 24 de octubre de 2026.</p>

        <div className="mt-10 space-y-8 text-[1.05rem] leading-relaxed">
          <section>
            <h2 className="text-2xl font-extrabold text-accent">Uso del turnero</h2>
            <p className="mt-3">
              El turnero de Mundo Pádel permite solicitar y gestionar reservas de cancha. Usalo con
              información real y cuidá el acceso a tu cuenta. Las reservas quedan sujetas a la
              confirmación del club; una solicitud enviada no garantiza por sí sola la
              disponibilidad de la cancha.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Reservas y cancelaciones</h2>
            <p className="mt-3">
              Si necesitás cancelar o modificar una reserva, avisá con anticipación por{' '}
              {whatsappNumber ? (
                <a
                  className="font-semibold text-neutral underline decoration-accent underline-offset-4 hover:text-accent"
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              ) : (
                'WhatsApp'
              )}
              , de acuerdo con la política vigente del club. El club puede rechazar, modificar o
              cancelar turnos ante errores de disponibilidad, razones operativas o de seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Social de los viernes</h2>
            <p className="mt-3">
              Para participar del Social, tratá con respeto a las demás personas, seguí las
              indicaciones del equipo del club y respetá la rotación de partidos. El género y nivel
              de juego que informás se usan para ayudar a armar partidos parejos, no para excluir
              participantes. No se tolerarán conductas agresivas, discriminatorias, de acoso o que
              pongan en riesgo a otras personas; el club podrá retirar a quien no cumpla estas
              reglas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Contacto</h2>
            <p className="mt-3">
              Ante cualquier consulta, escribinos a{' '}
              <a
                className="font-semibold text-neutral underline decoration-accent underline-offset-4 hover:text-accent"
                href="mailto:contactomundopadel@gmail.com"
              >
                contactomundopadel@gmail.com
              </a>{' '}
              o acercate a Mundo Pádel, Baltazar de Ávila 146, Córdoba, Argentina.
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
