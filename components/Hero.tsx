'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

export default function Hero() {
  const handleScrollToTurnero = () => {
    const element = document.getElementById('turnero');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-background text-primary min-h-[80vh] flex items-center px-6 md:px-20 py-16">
      <div className="flex flex-col md:flex-row w-full items-center justify-between gap-12">
        {/* Left Side: Text */}
        <motion.div
          className="text-center md:text-left max-w-xl space-y-6"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-neutral">
            Reservá tu turno en Mundo Pádel
          </h1>
          <p className="text-lg text-neutral">
            Elegí el horario que más te convenga y asegurá tu cancha fácil y rápido.
          </p>
        </motion.div>

        {/* Right Side: Call to Action Button */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <button
            onClick={handleScrollToTurnero}
            className="bg-primary text-light px-8 py-4 text-lg rounded-lg font-semibold hover:bg-primary-hover transition"
          >
            Reservar ahora
          </button>
        </motion.div>
      </div>
    </section>
  );
}
