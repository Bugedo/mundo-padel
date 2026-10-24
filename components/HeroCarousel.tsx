'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const slides = ['/photos/cancha1.jpg', '/photos/cancha2.jpg', '/photos/cancha3.jpg'];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setCurrentSlide((slide) => (slide + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {slides.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-[1800ms] motion-reduce:transition-none ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image src={src} alt="" fill priority={index === 0} className="object-cover" />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/95" />
    </div>
  );
}
