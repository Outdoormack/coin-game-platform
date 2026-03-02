export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2a332e] via-[#1d231f] to-[#151a17] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/[0.92] rounded-xl border border-[#c9c2ae] p-8 text-center shadow-lg">
        <div className="text-5xl mb-4">🪙</div>
        <h1 className="text-2xl font-extrabold text-[#1e3b2a] tracking-wide mb-2">
          Third Space Treasury
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Scan a coin to play. Claim it. Trade it. Steal it. 
          <br />Every scan is a new surprise.
        </p>
        <div className="mt-6 pt-4 border-t border-[#c9c2ae]">
          <p className="text-xs text-gray-400">
            Tap an NFC coin with your phone to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
