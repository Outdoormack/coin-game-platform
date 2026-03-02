'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  title: string;
  season_score: number;
  streak_weeks: number;
}

const RANK_ICONS: Record<number, string> = {
  1: '👑',
  2: '🥈',
  3: '🥉',
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.ok) setEntries(data.leaderboard);
    } catch {
      console.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-xs text-gray-500">Loading...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-gray-500 italic">No players yet. Be the first to claim!</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-[#c9c2ae]">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5">Player</th>
            <th className="py-1.5 text-right">Score</th>
            <th className="py-1.5 text-right">Streak</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.rank} className="border-b border-[#c9c2ae]/50">
              <td className="py-1.5 pr-2 font-bold">
                {RANK_ICONS[entry.rank] || entry.rank}
              </td>
              <td className="py-1.5">
                <span className="font-bold text-[#1e3b2a]">{entry.display_name}</span>
                <span className="text-gray-400 ml-1 text-[10px]">{entry.title}</span>
              </td>
              <td className="py-1.5 text-right font-bold text-[#1e3b2a]">
                {entry.season_score.toFixed(1)}
              </td>
              <td className="py-1.5 text-right text-gray-500">
                {entry.streak_weeks > 0 ? `🔥${entry.streak_weeks}w` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
