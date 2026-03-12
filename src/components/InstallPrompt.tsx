'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'tst_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User already dismissed — don't show
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window as unknown as Record<string, unknown>).MSStream;

    setIsIOS(ios);

    if (ios) {
      // iOS Safari: no install API — show manual instructions after delay
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    } else {
      // Android Chrome: intercept native prompt
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setTimeout(() => setShow(true), 3000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-[#1e3b2a] text-[#f7f3e6] rounded-2xl shadow-2xl p-4 flex gap-3 items-start border border-[#2e5a40]">

        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-[#2e5a40]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Third Space Treasury" className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Add to Home Screen</p>

          {isIOS ? (
            <p className="text-xs text-[#c8d8c8] mt-1 leading-snug">
              Tap the <strong className="text-[#f7f3e6]">Share</strong> button{' '}
              <span className="inline-block">⬆️</span> then{' '}
              <strong className="text-[#f7f3e6]">&ldquo;Add to Home Screen&rdquo;</strong> for quick access.
            </p>
          ) : (
            <p className="text-xs text-[#c8d8c8] mt-1 leading-snug">
              Install the Treasury app for quick access — no App Store needed.
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="bg-[#f7f3e6] text-[#1e3b2a] text-xs font-bold px-4 py-1.5 rounded-full hover:bg-white transition-colors"
              >
                Install
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-[#c8d8c8] text-xs px-3 py-1.5 rounded-full hover:text-white transition-colors"
            >
              {isIOS ? 'Got it' : 'Not now'}
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-[#c8d8c8] hover:text-white text-lg leading-none mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
