'use client';

import { useState, useEffect } from 'react';
import { ClaimResponse } from '@/lib/types';
import ScoreReveal from './ScoreReveal';

interface Props {
  coinExternalId: string;
  currentHolderName: string | null;
}

export default function ClaimForm({ coinExternalId, currentHolderName }: Props) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'earned' | 'stolen' | null>(null);
  const [storyText, setStoryText] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Remember player name
  useEffect(() => {
    const saved = localStorage.getItem('playerName');
    if (saved) setName(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Enter your name'); return; }
    if (!mode) { setError('Choose earned or stolen'); return; }

    setSubmitting(true);
    localStorage.setItem('playerName', name.trim());

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinExternalId,
          playerName: name.trim(),
          mode,
          storyText: storyText.trim() || undefined,
        }),
      });

      const data: ClaimResponse = await res.json();

      if (!data.ok) {
        setError(data.error || 'Something went wrong');
        setSubmitting(false);
        return;
      }

      setResult(data);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show score reveal after successful claim
  if (result?.ok && result.score) {
    return (
      <div>
        <ScoreReveal
          score={result.score}
          playerName={result.playerName || name}
          seasonRank={result.seasonRank || 0}
          mode={mode!}
          previousHolderName={currentHolderName}
        />
        <button
          onClick={() => window.location.reload()}
          className="w-full mt-4 py-3 rounded-xl bg-[#1e3b2a] text-[#f7f3e6] font-bold text-sm hover:bg-[#254b37] transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-xs font-bold text-[#1e3b2a] mb-1">Your name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your name"
          autoComplete="name"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6f4f] focus:border-transparent"
          required
        />
      </div>

      {/* Mode toggle */}
      <div>
        <label className="block text-xs font-bold text-[#1e3b2a] mb-1">How&apos;d you get it?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('earned')}
            className={`py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
              mode === 'earned'
                ? 'border-[#2f6f4f] bg-[#2f6f4f] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            ✅ Earned
          </button>
          <button
            type="button"
            onClick={() => setMode('stolen')}
            className={`py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
              mode === 'stolen'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            🗡️ Stolen
          </button>
        </div>
      </div>

      {/* Optional extras toggle */}
      <button
        type="button"
        onClick={() => setShowExtras(!showExtras)}
        className="text-xs text-[#2f6f4f] font-bold hover:underline"
      >
        {showExtras ? '▼ Hide extras' : '▶ Add story or photo (+bonus pts)'}
      </button>

      {showExtras && (
        <div className="space-y-2">
          <div>
            <label htmlFor="story" className="block text-xs font-bold text-[#1e3b2a] mb-1">
              Your story <span className="font-normal text-gray-500">(+0.2 pts)</span>
            </label>
            <textarea
              id="story"
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              placeholder="How'd this go down?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2f6f4f]"
            />
          </div>
          {/* TODO: Photo upload */}
          <p className="text-xs text-gray-400">📸 Photo upload coming soon (+0.2 pts)</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !mode}
        className="w-full py-3 rounded-xl bg-[#1e3b2a] text-[#f7f3e6] font-extrabold text-base hover:bg-[#254b37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Claiming...' : '🪙 Claim this coin'}
      </button>
    </form>
  );
}
