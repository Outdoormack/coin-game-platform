'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PhotoLightbox from '@/components/PhotoLightbox';

interface PhotoEntry {
  id: string;
  photo_url: string;
  story_text: string | null;
  mode: string;
  claimed_at: string;
  player: { display_name: string } | null;
  coin: { external_id: string; heading: string | null } | null;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select(`
          id,
          photo_url,
          story_text,
          mode,
          claimed_at,
          player:players!claims_player_id_fkey(display_name),
          coin:coins!claims_coin_id_fkey(external_id, heading)
        `)
        .not('photo_url', 'is', null)
        .order('claimed_at', { ascending: false })
        .limit(100);

      setPhotos((data as unknown as PhotoEntry[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2a332e] via-[#1d231f] to-[#151a17] p-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-[#1e3b2a]">📸 Photo Album</h1>
            <a href="/" className="text-xs text-[#1e3b2a] font-semibold underline underline-offset-2">← Home</a>
          </div>
          <p className="text-xs text-gray-500">Every coin has a story. Some have proof.</p>
        </div>

        {/* Gallery */}
        {loading && (
          <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-8 text-center text-sm text-gray-400 shadow-lg">
            Loading photos…
          </div>
        )}

        {!loading && photos.length === 0 && (
          <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-8 text-center shadow-lg">
            <p className="text-gray-500 text-sm">No photos yet.</p>
            <p className="text-gray-400 text-xs mt-1">Be the first to document the chaos.</p>
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {photos.map(entry => (
              <button
                key={entry.id}
                onClick={() => setLightboxUrl(entry.photo_url)}
                className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] shadow overflow-hidden text-left hover:shadow-md active:scale-95 transition-transform"
              >
                {/* Photo thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.photo_url}
                  alt="Claim photo"
                  className="w-full aspect-square object-cover"
                />
                {/* Caption */}
                <div className="p-2 space-y-0.5">
                  <p className="text-xs font-semibold text-[#1e3b2a] truncate">
                    {entry.player?.display_name || 'Unknown'}
                    <span className="font-normal text-gray-400 ml-1">
                      {entry.mode === 'stolen' ? '🗡️ stole' : '✅ earned'}
                    </span>
                  </p>
                  {entry.story_text && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{entry.story_text}</p>
                  )}
                  <p className="text-[10px] text-gray-400">
                    {new Date(entry.claimed_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric'
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </main>
  );
}
