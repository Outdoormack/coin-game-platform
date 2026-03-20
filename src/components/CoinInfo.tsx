'use client';

import { useEffect, useState } from 'react';
import BadgeRow from './BadgeRow';

interface Props {
  rarity: string;
  effect: string;
  status: string;
  heading: string | null;
  message: string | null;
  currentHolderName: string | null;
  currentHolderTitle: string | null;
}

export default function CoinInfo({
  rarity,
  effect,
  status,
  heading,
  message,
  currentHolderName,
  currentHolderTitle,
}: Props) {
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    // Only reveal badges if the current viewer IS the holder
    const savedName = localStorage.getItem('playerName');
    if (savedName && currentHolderName && savedName.toLowerCase() === currentHolderName.toLowerCase()) {
      setShowBadges(true);
    }
  }, [currentHolderName]);

  return (
    <div className="text-center space-y-2">
      {heading && (
        <h2 className="text-lg font-extrabold text-[#1e3b2a]">{heading}</h2>
      )}
      {message && (
        <p className="text-sm text-gray-600 italic">{message}</p>
      )}

      {/* Badges: only visible to current holder */}
      {showBadges ? (
        <BadgeRow rarity={rarity} effect={effect} status={status} />
      ) : (
        <p className="text-xs text-gray-400 italic">🔒 Rarity &amp; effect revealed after claiming</p>
      )}

      {/* Current holder */}
      {currentHolderName ? (
        <p className="text-sm text-gray-600">
          Currently held by: <strong>{currentHolderName}</strong>
          {currentHolderTitle && (
            <span className="text-xs text-gray-400 ml-1">({currentHolderTitle})</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-500 italic">Unclaimed — be the first!</p>
      )}
    </div>
  );
}
