'use client';

import { useEffect } from 'react';

interface Props {
  url: string;
  onClose: () => void;
}

export default function PhotoLightbox({ url, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-9 h-9 flex items-center justify-center text-lg font-bold hover:bg-black/80 z-10"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Image — tap backdrop to close, tap image itself does nothing */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Claim photo"
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
        style={{ touchAction: 'pinch-zoom' }}
      />
    </div>
  );
}
