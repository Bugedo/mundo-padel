'use client';

import { motion } from 'framer-motion';
import { Clock, ChevronDown, Zap, Utensils } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: '/photos/cancha1.jpg',
    },
    {
      image: '/photos/cancha2.jpg',
    },
    {
      image: '/photos/cancha3.jpg',
    },
  ];

  const handleScrollToTurnero = () => {
    const element = document.getElementById('turnero');
    if (element) {
      const offset = 80; // Offset para que no vaya tan abajo
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="relative bg-background text-neutral min-h-screen flex items-center overflow-hidden">
      {/* Background Carousel */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: index === currentSlide ? 1 : 0 }}
            transition={{ duration: 2 }}
          >
            <Image
              src={slide.image}
              alt="Mundo Pádel"
              fill
              className="object-cover"
              priority={index === 0}
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-20 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-6"
          >
            <Image
              src="/photos/logo.PNG"
              alt="Mundo Pádel"
              width={180}
              height={180}
              className="mx-auto"
            />
          </motion.div>

          {/* Main Title */}
          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <span className="text-neutral">Reservá tu turno en</span>
            <br />
            <span className="text-accent">Mundo Pádel</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-xl md:text-2xl text-neutral-muted leading-relaxed max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Elegí el horario que más te convenga y asegurá tu cancha fácil y rápido.
            <br />
            <span className="text-accent font-semibold">
              ¡La mejor experiencia de pádel te espera!
            </span>
          </motion.p>

          {/* Features */}
          <motion.div
            className="flex flex-wrap gap-6 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <div className="flex items-center gap-2 text-neutral-muted">
              <Clock size={20} className="text-accent" />
              <span>Reserva 24/7</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-muted">
              <Zap size={20} className="text-accent" />
              <span>3 Canchas de Última Tecnología</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-muted">
              <Utensils size={20} className="text-accent" />
              <span>Quincho Totalmente Equipado</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <button
              onClick={handleScrollToTurnero}
              className="group bg-accent text-dark px-12 py-6 text-2xl rounded-2xl font-bold hover:bg-accent-hover transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105"
            >
              RESERVA AHORA
            </button>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronDown size={32} className="text-neutral" />
        </motion.div>
      </motion.div>
    </section>
  );
}
