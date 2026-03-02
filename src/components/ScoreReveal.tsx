'use client';

import { useState, useEffect } from 'react';
import { ScoreBreakdown } from '@/lib/types';

interface Props {
  score: ScoreBreakdown;
  playerName: string;
  seasonRank: number;
  mode: 'earned' | 'stolen';
  previousHolderName: string | null;
}

export default function ScoreReveal({ score, playerName, seasonRank, mode, previousHolderName }: Props) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showTotal, setShowTotal] = useState(false);

  useEffect(() => {
    // Reveal lines one by one
    const messages = score.messages;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      if (current >= messages.length) {
        clearInterval(interval);
        setTimeout(() => setShowTotal(true), 300);
      }
      setVisibleLines(current);
    }, 400);

    return () => clearInterval(interval);
  }, [score.messages]);

  const isBigScore = score.total_points >= 5;
  const actionVerb = mode === 'stolen' ? 'stole' : 'claimed';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="text-center">
        <div className="text-2xl mb-1">
          {isBigScore ? '🎆' : '🪙'}
        </div>
        <h3 className="text-lg font-extrabold text-[#1e3b2a]">
          {playerName} {actionVerb} the coin!
        </h3>
        {previousHolderName && mode === 'stolen' && (
          <p className="text-xs text-gray-500">Taken from {previousHolderName}</p>
        )}
      </div>

      {/* Score breakdown - reveals line by line */}
      <div className="bg-[#f7f3e6] rounded-lg border border-[#c9c2ae] p-3 font-mono text-sm space-y-1">
        {score.messages.map((msg, i) => {
          const isVisible = i < visibleLines;
          const isDivider = msg.includes('─────');
          const isTotal = msg.startsWith('Total:');

          if (isDivider) {
            return (
              <div
                key={i}
                className={`border-t border-[#c9c2ae] my-1 transition-opacity duration-300 ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
              />
            );
          }

          return (
            <div
              key={i}
              className={`transition-all duration-300 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2'
              } ${isTotal ? 'font-extrabold text-base text-[#1e3b2a]' : 'text-gray-700'}`}
            >
              {msg}
            </div>
          );
        })}
      </div>

      {/* Rank reveal */}
      {showTotal && seasonRank > 0 && (
        <div className="text-center animate-fade-in">
          <p className="text-sm text-gray-600">
            Season rank: <strong className="text-[#1e3b2a]">#{seasonRank}</strong>
          </p>
        </div>
      )}

      {/* Big score celebration */}
      {showTotal && isBigScore && (
        <div className="text-center text-xl animate-bounce">
          🎉🔥🏆
        </div>
      )}
    </div>
  );
}
