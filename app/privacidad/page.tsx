import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad | Mundo Pádel',
};

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function PrivacyPage() {
  return (
    <section className="bg-background py-14 sm:py-20">
      <article className="mx-auto max-w-[70ch] px-5 text-neutral">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Mundo Pádel</p>
        <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
          Política de privacidad
        </h1>
        <p className="mt-5 text-neutral-muted">Última actualización: 24 de octubre de 2026.</p>

        <div className="mt-10 space-y-8 text-[1.05rem] leading-relaxed">
          <section>
            <h2 className="text-2xl font-extrabold text-accent">Qué datos obtenemos</h2>
            <p className="mt-3">
              Cuando iniciás sesión con Google, recibimos tu nombre, correo electrónico y foto de
              perfil. Además, si usás nuestros servicios, podés cargar tu teléfono y, para el
              evento Social, tu género y nivel de juego.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Para qué los usamos</h2>
            <p className="mt-3">
              Usamos estos datos para gestionar reservas, identificarte en tu cuenta, contactarte
              por WhatsApp cuando sea necesario y armar partidos equilibrados en el Social. Solo
              pedimos la información necesaria para esas finalidades.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Dónde se guardan y con quién se comparten</h2>
            <p className="mt-3">
              La información se guarda en Supabase. No vendemos tus datos ni los compartimos con
              terceros, salvo con los proveedores de infraestructura que necesitamos para prestar
              el servicio: Supabase, Vercel y Google para el inicio de sesión. Cada uno trata los
              datos según sus propias políticas y medidas de seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Tus derechos</h2>
            <p className="mt-3">
              Podés pedir acceso, actualización, baja o borrado de tus datos escribiendo a{' '}
              <a
                className="font-semibold text-neutral underline decoration-accent underline-offset-4 hover:text-accent"
                href="mailto:contactomundopadel@gmail.com"
              >
                contactomundopadel@gmail.com
              </a>
              . También podés contactarnos por{' '}
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
              . Atenderemos tu solicitud dentro de los plazos aplicables.
            </p>
            <p className="mt-3">
              Esta política se rige por la Ley 25.326 de Protección de los Datos Personales de la
              República Argentina.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-accent">Contacto</h2>
            <p className="mt-3">
              Mundo Pádel · Baltazar de Ávila 146, Córdoba, Argentina ·{' '}
              <a
                className="font-semibold text-neutral underline decoration-accent underline-offset-4 hover:text-accent"
                href="mailto:contactomundopadel@gmail.com"
              >
                contactomundopadel@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
