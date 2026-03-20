import { supabase, DEFAULT_GROUP_ID } from '@/lib/supabase';
import { Coin } from '@/lib/types';
import ClaimForm from '@/components/ClaimForm';
import CoinInfo from '@/components/CoinInfo';
import Leaderboard from '@/components/Leaderboard';
import RecentClaims from '@/components/RecentClaims';
import InstallPrompt from '@/components/InstallPrompt';


interface PageProps {
  params: Promise<{ coinId: string }>;
}

export default async function CoinPage({ params }: PageProps) {
  const { coinId } = await params;

  // Fetch coin data + announcement in parallel
  const [{ data: coin }, { data: announcementSetting }] = await Promise.all([
    supabase
      .from('coins')
      .select('*, current_holder:players!coins_current_holder_id_fkey(display_name, title)')
      .eq('group_id', DEFAULT_GROUP_ID)
      .eq('external_id', coinId)
      .single(),
    supabase
      .from('group_settings')
      .select('value')
      .eq('group_id', DEFAULT_GROUP_ID)
      .eq('key', 'announcement_text')
      .single(),
  ]);

  const announcementText = announcementSetting?.value?.trim() || null;

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2a332e] via-[#1d231f] to-[#151a17] p-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Announcement Banner */}
        {announcementText && (
          <div className="bg-[#f7f3e6] border border-[#c9c2ae] rounded-xl px-4 py-3 flex items-start gap-3 shadow">
            <span className="text-lg leading-none mt-0.5">📣</span>
            <p className="text-sm font-medium text-[#1e3b2a] leading-snug">{announcementText}</p>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-4 shadow-lg">
          {/* Top bar */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-lg font-bold text-[#1e3b2a] tracking-wide">Third Space Treasury</h1>
          </div>

          {/* Coin info — badges hidden until you're the holder */}
          <CoinInfo
            rarity={typedCoin.rarity}
            effect={typedCoin.current_effect || 'standard'}
            status={typedCoin.status}
            heading={typedCoin.heading}
            message={typedCoin.message}
            currentHolderName={typedCoin.current_holder?.display_name || null}
            currentHolderTitle={typedCoin.current_holder?.title || null}
          />

          {/* Claim Form */}
          <div className="mt-4">
            <ClaimForm
              coinExternalId={coinId}
              currentHolderName={typedCoin.current_holder?.display_name || null}
            />
          </div>

          {/* Navigation buttons */}
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/constitution-mobile.html"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-[#c9c2ae] bg-[#f7f3e6] text-sm font-bold text-[#1e3b2a] hover:bg-[#ede8d6] transition-colors"
              >
                📜 The Constitution
              </a>
              <a
                href="/photos"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-[#c9c2ae] bg-[#f7f3e6] text-sm font-bold text-[#1e3b2a] hover:bg-[#ede8d6] transition-colors"
              >
                📸 Photo Album
              </a>
            </div>
            <a
              href="/"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border-2 border-[#c9c2ae] bg-[#f7f3e6] text-sm font-bold text-[#1e3b2a] hover:bg-[#ede8d6] transition-colors"
            >
              📊 Player Stats &amp; Leaderboard
            </a>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSfDbpxQEi-CaCL6vLVgx9yuXxrz-0npOxhY7w4DvLRtTl3O4A/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-[#1e3b2a] transition-colors"
            >
              💬 Send Feedback
            </a>
          </div>
        </div>

        {/* How to Play */}
        <details className="bg-white/[0.92] rounded-xl border border-[#c9c2ae] shadow-lg group" open>
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between select-none">
            <h3 className="text-sm font-extrabold text-[#1e3b2a]">📖 How to Play</h3>
            <span className="text-xs text-gray-400 group-open:hidden">tap to expand</span>
            <span className="text-xs text-gray-400 hidden group-open:inline">tap to collapse</span>
          </summary>
          <div className="px-4 pb-4 space-y-3 text-sm text-gray-700">
            <ul className="space-y-2">
              <li><span className="font-semibold text-[#1e3b2a]">Scan to claim.</span> Tap your phone to any Treasury coin to open its vault, then enter your name and claim it. (Make sure NFC is turned on. On Samsung, the NFC scanner is in the middle of the back of the phone. On iPhone, it&apos;s along the top edge near the camera.)</li>
              <li><span className="font-semibold text-[#1e3b2a]">Earned or Stolen?</span> If you won the physical coin from another player through an act of chaos — choose <em>Earned</em> to increase your holdings. If someone else holds it and you got your hands on it — choose <em>Stolen</em>. Steals are worth more points but don&apos;t add to your holdings. (If the coin is unclaimed, choose <em>Earned</em>.)</li>
              <li><span className="font-semibold text-[#1e3b2a]">No double-dipping.</span> You can&apos;t claim the same coin twice in a row. Create some chaos and pass the coin to someone else first.</li>
              <li><span className="font-semibold text-[#1e3b2a]">No hoarding.</span> Don&apos;t physically hold more than five coins at once (Article IV).</li>
              <li><span className="font-semibold text-[#1e3b2a]">Bonus points.</span> Add a story and/or photo when you claim to earn extra points. Make it good — the ledger tells all.</li>
            </ul>
            <p className="text-xs italic text-gray-500">Scan to claim. Trade boldly. Sneak cleverly. Brag responsibly.</p>
            <p className="text-xs italic text-gray-500">May fortune favor the bold… and the sneaky.</p>
          </div>
        </details>

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

      <InstallPrompt />
    </main>
  );
}
