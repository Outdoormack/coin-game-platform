'use client';

import { useState, useEffect } from 'react';
import Leaderboard from '@/components/Leaderboard';
import RecentClaims from '@/components/RecentClaims';
import InstallPrompt from '@/components/InstallPrompt';

interface PlayerStats {
  display_name: string;
  title: string;
  level: number;
  xp: number;
  season_score: number;
  lifetime_score: number;
  season_rank: number | null;
  current_holdings: number;
  total_claims: number;
  total_steals: number;
  coins_discovered: number;
  streak_weeks: number;
  total_coins: number;
  email: string | null;
}

interface Badge {
  earned_at: string;
  badge_definitions: { name: string; icon: string } | null;
}

export default function Home() {
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState<PlayerStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Restore last player from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('playerName');
    if (saved) {
      setNameInput(saved);
      fetchPlayer(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlayer = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setNotFound(false);
    setPlayer(null);
    try {
      const savedName = localStorage.getItem('playerName');
      const isSelf = savedName && savedName.toLowerCase() === name.trim().toLowerCase();
      const res = await fetch(`/api/player?name=${encodeURIComponent(name.trim())}${isSelf ? '&self=1' : ''}`);
      const data = await res.json();
      if (data.ok) {
        setPlayer(data.player);
        setBadges(data.badges || []);
        const savedName = localStorage.getItem('playerName');
        const viewingOwn = !!(savedName && savedName.toLowerCase() === name.trim().toLowerCase());
        setIsOwnProfile(viewingOwn);
        setEmailInput(viewingOwn ? (data.player.email || '') : '');
        setEmailSaved(false);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlayer(nameInput);
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    setEmailSaving(true);
    try {
      await fetch('/api/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: player.display_name, email: emailInput }),
      });
      setEmailSaved(true);
      setPlayer(prev => prev ? { ...prev, email: emailInput } : prev);
    } finally {
      setEmailSaving(false);
    }
  };

  const streakLabel = (weeks: number) => {
    if (weeks === 0) return null;
    return `🔥 ${weeks}-week streak`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2a332e] via-[#1d231f] to-[#151a17] p-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-5 shadow-lg text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Third Space Treasury" className="w-16 h-16 object-contain mx-auto mb-2" />
          <h1 className="text-xl font-extrabold text-[#1e3b2a] tracking-wide">Third Space Treasury</h1>
          <p className="text-xs text-gray-500 mt-1 italic">In Chaos We Compete. In Coin We Trust.</p>
        </div>

        {/* ── PLAYER STATS ── */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-5 shadow-lg">
          <h2 className="text-sm font-extrabold text-[#1e3b2a] mb-3 uppercase tracking-wide">Check Player Stats</h2>

          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Your name"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2f6f4f]"
            />
            <button
              type="submit"
              disabled={loading || !nameInput.trim()}
              className="px-4 py-2 rounded-lg bg-[#1e3b2a] text-white text-sm font-bold hover:bg-[#254b37] disabled:opacity-50 transition-colors"
            >
              {loading ? '…' : 'Go'}
            </button>
          </form>

          {notFound && (
            <p className="text-sm text-red-500 text-center">No player found — scan a coin first to get on the board!</p>
          )}

          {player && (
            <div className="space-y-3">
              {/* Name + title */}
              <div className="text-center pb-3 border-b border-[#c9c2ae]">
                <p className="text-lg font-extrabold text-[#1e3b2a]">{player.display_name}</p>
                <p className="text-xs text-gray-500">{player.title} · Level {player.level} · {player.xp} XP</p>
                {player.season_rank && (
                  <p className="text-xs font-bold text-[#2f6f4f] mt-0.5">#{player.season_rank} this season</p>
                )}
                {streakLabel(player.streak_weeks) && (
                  <p className="text-xs text-orange-500 font-bold mt-0.5">{streakLabel(player.streak_weeks)}</p>
                )}
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Season Score" value={player.season_score.toFixed(1) + ' pts'} highlight />
                <Stat label="Lifetime Score" value={player.lifetime_score.toFixed(1) + ' pts'} />
                <Stat label="Total Claims" value={player.total_claims.toString()} />
                <Stat label="Total Steals" value={player.total_steals.toString()} />
                <Stat label="Coins Holding" value={player.current_holdings.toString()} />
                <Stat label="Coins Discovered" value={`${player.coins_discovered} of ${player.total_coins}`} />
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="pt-2 border-t border-[#c9c2ae]">
                  <p className="text-xs font-bold text-[#1e3b2a] mb-2">Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-[#f7f3e6] border border-[#c9c2ae] rounded-full px-2 py-0.5"
                        title={b.badge_definitions?.name}
                      >
                        {b.badge_definitions?.icon} {b.badge_definitions?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Theft alerts email — only shown for your own profile */}
              {isOwnProfile && (
                <div className="pt-2 border-t border-[#c9c2ae]">
                  <p className="text-xs font-bold text-[#1e3b2a] mb-1">🗡️ Theft Alerts</p>
                  <p className="text-[11px] text-gray-500 mb-2">
                    For classified alerts regarding crimes against your holdings. (Optional)
                  </p>
                  <form onSubmit={saveEmail} className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => { setEmailInput(e.target.value); setEmailSaved(false); }}
                      placeholder="your@email.com"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2f6f4f]"
                    />
                    <button
                      type="submit"
                      disabled={emailSaving}
                      className="px-3 py-2 rounded-lg bg-[#1e3b2a] text-white text-xs font-bold hover:bg-[#254b37] disabled:opacity-50 transition-colors"
                    >
                      {emailSaving ? '…' : emailSaved ? '✓ Saved' : 'Save'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NAV BUTTONS ── */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/constitution-mobile.html"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-[#c9c2ae] bg-white/[0.92] text-sm font-bold text-[#1e3b2a] hover:bg-[#f7f3e6] transition-colors shadow-lg"
          >
            📜 The Constitution
          </a>
          <a
            href="/photos"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-[#c9c2ae] bg-white/[0.92] text-sm font-bold text-[#1e3b2a] hover:bg-[#f7f3e6] transition-colors shadow-lg"
          >
            📸 Photo Album
          </a>
        </div>

        {/* ── LEADERBOARD ── */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-5 shadow-lg">
          <h2 className="text-sm font-extrabold text-[#1e3b2a] mb-3 uppercase tracking-wide">Leaderboard</h2>
          <Leaderboard />
        </div>

        {/* ── RECENT CHAOS ── */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-5 shadow-lg">
          <h2 className="text-sm font-extrabold text-[#1e3b2a] mb-3 uppercase tracking-wide">Recent Chaos</h2>
          <RecentClaims />
        </div>

        <div className="text-center py-2">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSfDbpxQEi-CaCL6vLVgx9yuXxrz-0npOxhY7w4DvLRtTl3O4A/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
          >
            💬 Send Feedback
          </a>
        </div>

        <p className="text-center text-[10px] text-white/30 pb-2">
          Tap an NFC coin to claim · third-space-treasury.com
        </p>

      </div>

      <InstallPrompt />
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-[#1e3b2a] text-white' : 'bg-[#f7f3e6] text-[#1e3b2a]'}`}>
      <p className={`text-lg font-extrabold leading-none ${highlight ? 'text-white' : 'text-[#1e3b2a]'}`}>{value}</p>
      <p className={`text-[10px] mt-1 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{label}</p>
    </div>
  );
}
