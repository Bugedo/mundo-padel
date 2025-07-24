'use client';

import Hero from '@/components/Hero';

export default function Home() {
  return (
    <>
      <Hero />
      <section
        id="turnero"
        className="bg-surface text-primary py-20 px-6 md:px-20 min-h-[60vh] flex items-center justify-center"
      >
        <h2 className="text-3xl font-semibold">Acá va el turnero pronto</h2>
      </section>
    </>
  );
}
