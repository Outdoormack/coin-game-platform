'use client';

import { useState, useEffect } from 'react';
import PhotoLightbox from './PhotoLightbox';

interface RecentClaim {
  id: string;
  mode: string;
  total_points: number;
  coin_effect: string | null;
  coin_rarity: string | null;
  story_text: string | null;
  photo_url: string | null;
  claimed_at: string;
  player_name: string;
  player_title: string;
  previous_holder_name: string | null;
}

export default function RecentClaims() {
  const [claims, setClaims] = useState<RecentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadRecent = async () => {
    try {
      const res = await fetch('/api/recent');
      const data = await res.json();
      if (data.ok) setClaims(data.recent);
    } catch {
      console.error('Failed to load recent claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
    const interval = setInterval(loadRecent, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-xs text-gray-500">Loading...</p>;
  }

  if (claims.length === 0) {
    return <p className="text-xs text-gray-500 italic">No claims yet.</p>;
  }

  return (
    <>
    {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    <div className="max-h-64 overflow-y-auto space-y-0 divide-y divide-[#c9c2ae]/50">
      {claims.map(claim => {
        const verb = claim.mode === 'stolen' ? 'stole' : 'claimed';
        const icon = claim.mode === 'stolen' ? '🗡️' : '✅';
        const timeAgo = getTimeAgo(claim.claimed_at);

        return (
          <div key={claim.id} className="py-2 first:pt-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="mr-1">{icon}</span>
                  <strong className="text-[#1e3b2a]">{claim.player_name}</strong>
                  {' '}{verb} a coin
                  {claim.previous_holder_name && claim.mode === 'stolen' && (
                    <span className="text-gray-500"> from {claim.previous_holder_name}</span>
                  )}
                </p>
                {claim.story_text && (
                  <p className="text-xs text-gray-600 mt-0.5 italic truncate">
                    &ldquo;{claim.story_text}&rdquo;
                  </p>
                )}
                {claim.photo_url && (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(claim.photo_url!)}
                    className="inline-flex items-center gap-1 text-[10px] text-[#2f6f4f] font-bold mt-0.5 hover:underline"
                  >
                    📸 View photo
                  </button>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-[#2f6f4f]">
                  +{claim.total_points.toFixed(1)}
                </span>
                <p className="text-[10px] text-gray-400">{timeAgo}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}
