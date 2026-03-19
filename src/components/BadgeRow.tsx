'use client';

import { useState } from 'react';

interface Badge {
  icon: string;
  label: string;
  color: string;
  description: string;
}

interface Props {
  rarity: string;
  effect: string;
  status: string;
}

const RARITY_INFO: Record<string, Badge | null> = {
  common: null,
  uncommon: {
    icon: '⭐',
    label: 'Uncommon',
    color: 'text-blue-600',
    description: 'This coin is worth 2 points — rarer than most. Not everyone will find one of these.',
  },
  rare: {
    icon: '⭐⭐',
    label: 'Rare',
    color: 'text-yellow-600',
    description: 'This coin is worth 3 points. Only a handful exist in the game. Nice find.',
  },
  legendary: {
    icon: '⭐⭐⭐',
    label: 'Legendary',
    color: 'text-purple-600',
    description: 'This coin is worth 5 points. There are very few legendaries in circulation. You found one.',
  },
};

const EFFECT_INFO: Record<string, Badge | null> = {
  standard: null,
  thief: {
    icon: '🗡️',
    label: 'Thief',
    color: 'text-gray-700',
    description: 'When you claim this coin, you steal 1 point from the previous holder. They lose it, you gain it on top of the base value.',
  },
  shield: {
    icon: '🛡️',
    label: 'Shield',
    color: 'text-gray-700',
    description: 'After you claim this coin, it cannot be claimed by anyone else for 48 hours. Hold it safe.',
  },
  wildcard: {
    icon: '🎲',
    label: 'Wildcard',
    color: 'text-gray-700',
    description: 'Forget the base value — this coin rolls a random 1 to 6 points on every claim. Could be great, could be rough.',
  },
  cursed: {
    icon: '💀',
    label: 'Cursed',
    color: 'text-gray-700',
    description: "Worth 0 points to you. BUT the next person who claims it gets triple the base value. Hot potato — pass it along.",
  },
  chain: {
    icon: '🔗',
    label: 'Chain',
    color: 'text-gray-700',
    description: 'Earns +1 bonus point for every unique person who has ever claimed this coin in the current season. The more it circulates, the more it\'s worth.',
  },
  magnet: {
    icon: '🧲',
    label: 'Magnet',
    color: 'text-gray-700',
    description: 'Your next claim (any coin) within 24 hours is worth double. Claim this, then move fast.',
  },
  bounty_hunter: {
    icon: '🎯',
    label: 'Bounty Hunter',
    color: 'text-gray-700',
    description: 'If the previous holder is in the top 3 on the leaderboard, you get an extra +3 bonus. Hunt the leaders.',
  },
  mirror: {
    icon: '🪞',
    label: 'Mirror',
    color: 'text-gray-700',
    description: "This coin copies the rarity of the last coin you claimed. Just grabbed a Legendary? This one is too.",
  },
  rust: {
    icon: '🔧',
    label: 'Rust Restorer',
    color: 'text-gray-700',
    description: "This coin is immune to rusting. It can never decay, no matter how long it sits. A rare perk in a world of chaos.",
  },
};

const STATUS_INFO: Record<string, Badge | null> = {
  active: null,
  hot: {
    icon: '🔥',
    label: 'HOT',
    color: 'bg-red-100 text-red-700 border-red-300',
    description: 'This coin is HOT — points are doubled for a limited time. Claim it now.',
  },
  frozen: {
    icon: '❄️',
    label: 'FROZEN',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    description: "This coin is frozen thanks to a Shield effect. It can't be claimed until the freeze expires.",
  },
  rusted: {
    icon: '🟤',
    label: 'RUSTED',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    description: "This coin sat idle for too long and rusted. The holder lost 1 point. Claim it to restore it and earn a +1 restore bonus.",
  },
  bounty: {
    icon: '🎯',
    label: 'BOUNTY',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    description: 'A bounty has been placed on this coin. Extra points up for grabs — go get it.',
  },
};

function InfoPopup({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <span className="text-3xl">{badge.icon}</span>
          <h3 className="text-base font-extrabold text-[#1e3b2a] mt-1">{badge.label}</h3>
        </div>
        <p className="text-sm text-gray-600 text-center leading-relaxed">{badge.description}</p>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl bg-[#1e3b2a] text-white font-bold text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function BadgeRow({ rarity, effect, status }: Props) {
  const [activeBadge, setActiveBadge] = useState<Badge | null>(null);

  const rarityBadge = RARITY_INFO[rarity];
  const effectBadge = EFFECT_INFO[effect];
  const statusBadge = STATUS_INFO[status];

  if (!rarityBadge && !effectBadge && !statusBadge) return null;

  return (
    <>
      {activeBadge && <InfoPopup badge={activeBadge} onClose={() => setActiveBadge(null)} />}

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {rarityBadge && (
          <button
            type="button"
            onClick={() => setActiveBadge(rarityBadge)}
            className={`text-xs font-bold px-2 py-1 rounded-full border ${rarityBadge.color} bg-white/50 hover:opacity-80 transition-opacity`}
          >
            {rarityBadge.icon} {rarityBadge.label} ⓘ
          </button>
        )}
        {effectBadge && (
          <button
            type="button"
            onClick={() => setActiveBadge(effectBadge)}
            className="text-xs font-bold px-2 py-1 rounded-full border border-[#c9c2ae] bg-white/50 hover:opacity-80 transition-opacity"
          >
            {effectBadge.icon} {effectBadge.label} ⓘ
          </button>
        )}
        {statusBadge && (
          <button
            type="button"
            onClick={() => setActiveBadge(statusBadge)}
            className={`text-xs font-bold px-2 py-1 rounded-full border ${statusBadge.color} hover:opacity-80 transition-opacity`}
          >
            {statusBadge.icon} {statusBadge.label} ⓘ
          </button>
        )}
      </div>
    </>
  );
}
