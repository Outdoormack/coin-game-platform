import { supabase, DEFAULT_GROUP_ID } from '@/lib/supabase';
import { Coin } from '@/lib/types';
import ClaimForm from '@/components/ClaimForm';
import Leaderboard from '@/components/Leaderboard';
import RecentClaims from '@/components/RecentClaims';

const RARITY_DISPLAY: Record<string, { label: string; stars: string; color: string }> = {
  common: { label: 'Common', stars: '', color: 'text-gray-500' },
  uncommon: { label: 'Uncommon', stars: '⭐', color: 'text-blue-600' },
  rare: { label: 'Rare', stars: '⭐⭐', color: 'text-yellow-600' },
  legendary: { label: 'Legendary', stars: '⭐⭐⭐', color: 'text-purple-600' },
};

const EFFECT_DISPLAY: Record<string, { icon: string; label: string }> = {
  standard: { icon: '', label: '' },
  thief: { icon: '🗡️', label: 'Thief' },
  shield: { icon: '🛡️', label: 'Shield' },
  wildcard: { icon: '🎲', label: 'Wildcard' },
  cursed: { icon: '💀', label: 'Cursed' },
  chain: { icon: '🔗', label: 'Chain' },
  magnet: { icon: '🧲', label: 'Magnet' },
  bounty_hunter: { icon: '🎯', label: 'Bounty Hunter' },
  mirror: { icon: '🪞', label: 'Mirror' },
  rust: { icon: '🔧', label: 'Rust Restorer' },
};

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  active: { icon: '', label: '', color: '' },
  hot: { icon: '🔥', label: 'HOT', color: 'bg-red-100 text-red-700 border-red-300' },
  frozen: { icon: '❄️', label: 'FROZEN', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  rusted: { icon: '🟤', label: 'RUSTED', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  bounty: { icon: '🎯', label: 'BOUNTY', color: 'bg-purple-100 text-purple-700 border-purple-300' },
};

interface PageProps {
  params: Promise<{ coinId: string }>;
}

export default async function CoinPage({ params }: PageProps) {
  const { coinId } = await params;

  // Fetch coin data
  const { data: coin } = await supabase
    .from('coins')
    .select('*, current_holder:players!coins_current_holder_id_fkey(display_name, title)')
    .eq('group_id', DEFAULT_GROUP_ID)
    .eq('external_id', coinId)
    .single();

  if (!coin) {
    return (
      <main className="min-h-screen bg-[#151a17] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-[#1e3b2a]">Coin Not Found</h1>
          <p className="mt-2 text-sm text-gray-600">This coin ID wasn&apos;t recognized. Check the URL or contact the game admin.</p>
        </div>
      </main>
    );
  }

  if (!coin.active) {
    return (
      <main className="min-h-screen bg-[#151a17] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-[#1e3b2a]">Coin Inactive</h1>
          <p className="mt-2 text-sm text-gray-600">This coin is currently inactive. Ask the game admin if this is expected.</p>
        </div>
      </main>
    );
  }

  const typedCoin = coin as Coin & { current_holder: { display_name: string; title: string } | null };
  const rarity = RARITY_DISPLAY[typedCoin.rarity] || RARITY_DISPLAY.common;
  const effect = EFFECT_DISPLAY[typedCoin.current_effect] || EFFECT_DISPLAY.standard;
  const status = STATUS_DISPLAY[typedCoin.status] || STATUS_DISPLAY.active;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2a332e] via-[#1d231f] to-[#151a17] p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header Card */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-4 shadow-lg">
          {/* Top bar */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-lg font-bold text-[#1e3b2a] tracking-wide">Third Space Treasury</h1>
          </div>

          {/* Coin info */}
          <div className="text-center space-y-2">
            {typedCoin.heading && (
              <h2 className="text-lg font-extrabold text-[#1e3b2a]">{typedCoin.heading}</h2>
            )}

            {/* Rarity + Effect badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {typedCoin.rarity !== 'common' && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${rarity.color} bg-white/50`}>
                  {rarity.stars} {rarity.label}
                </span>
              )}
              {effect.icon && (
                <span className="text-xs font-bold px-2 py-1 rounded-full border border-[#c9c2ae] bg-white/50">
                  {effect.icon} {effect.label}
                </span>
              )}
              {status.icon && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${status.color}`}>
                  {status.icon} {status.label}
                </span>
              )}
            </div>

            {/* Current holder */}
            {typedCoin.current_holder && (
              <p className="text-sm text-gray-600">
                Currently held by: <strong>{typedCoin.current_holder.display_name}</strong>
                <span className="text-xs text-gray-400 ml-1">({typedCoin.current_holder.title})</span>
              </p>
            )}
            {!typedCoin.current_holder && (
              <p className="text-sm text-gray-500 italic">Unclaimed — be the first!</p>
            )}
          </div>

          {/* Claim Form */}
          <div className="mt-4">
            <ClaimForm
              coinExternalId={coinId}
              currentHolderName={typedCoin.current_holder?.display_name || null}
            />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-4 shadow-lg">
          <h3 className="text-sm font-extrabold text-[#1e3b2a] mb-2">🏆 Leaderboard</h3>
          <Leaderboard />
        </div>

        {/* Recent Claims */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-4 shadow-lg">
          <h3 className="text-sm font-extrabold text-[#1e3b2a] mb-2">⚡ Recent Chaos</h3>
          <RecentClaims />
        </div>
      </div>
    </main>
  );
}
