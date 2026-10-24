'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function SocialQr({ value }: { value: string }) {
  // Generated locally so the check-in token never leaves the browser.
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: 360, margin: 2 }).then((url) => {
      if (!cancelled) setSource(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!source) return <div className="aspect-square w-full max-w-[360px] rounded-xl bg-white/10" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- data URL generated in the browser.
  return <img src={source} alt="Código QR de check-in" className="w-full max-w-[360px] rounded-xl bg-white p-3" />;
}
