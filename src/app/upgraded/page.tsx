export default function UpgradedPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1e3b2a] to-[#0f1f15] flex items-center justify-center p-4">
      <div className="max-w-[560px] w-full bg-[#f5efe4] rounded-3xl border-2 border-[#c9c2ae] p-10 shadow-2xl" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>

        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-[#1e3b2a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Third Space Treasury" className="w-20 h-20 object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-[#1e3b2a] leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            The Treasury Has Upgraded. <span className="text-3xl">🪙</span>
          </h1>
        </div>

        {/* Intro */}
        <p className="text-lg text-[#333] leading-relaxed mb-6">
          Your coins just got a lot more interesting.
        </p>
        <p className="text-lg text-[#333] leading-relaxed mb-6">
          Every coin has a digital side. Tap your phone to any coin and the Treasury opens — claim it, earn points, and climb the leaderboard.
        </p>

        {/* NFC Note */}
        <div className="bg-[#ede8d6] rounded-xl px-4 py-3 mb-7 text-sm italic text-[#666] leading-relaxed">
          NFC needs to be on. Samsung: scanner is on the back of the phone, lower-middle. iPhone: top edge near the camera. Just hold your phone close to the coin.
        </div>

        {/* What you need to know */}
        <h2 className="text-lg font-bold text-[#1e3b2a] mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Here&apos;s what you need to know:
        </h2>

        <ul className="space-y-2 mb-7 text-[15.5px] text-[#333] leading-relaxed">
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            Scan any coin to claim it. Enter your name, choose Earned or Stolen, done. Add a story or photo when you claim for bonus points. <em className="text-[#666]">(If the coin is unclaimed, choose Earned.)</em>
          </li>
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            <strong className="text-[#1e3b2a]">Take a selfie with your first coin when you claim it.</strong> We need all agents accounted for. Don&apos;t be the one missing.
          </li>
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            Every coin has a <strong className="text-[#1e3b2a]">hidden rarity</strong> and a <strong className="text-[#1e3b2a]">hidden effect</strong>. You won&apos;t know what you&apos;ve got until you scan it.
          </li>
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            Steals are digital — sneak a scan off someone&apos;s keychain to earn extra points. No need to take the physical coin.
          </li>
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            Install the app to your home screen when prompted — it works like a regular app.
          </li>
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            The full rules, effects, and scoring are in the <strong className="text-[#1e3b2a]">Constitution</strong> — tap it from any coin page.
          </li>
          <li className="pl-6 relative before:content-['•'] before:absolute before:left-1.5 before:text-[#1e3b2a] before:font-bold">
            Don&apos;t have your coins yet? <strong className="text-[#1e3b2a]">Get ahold of David.</strong>
          </li>
        </ul>

        {/* Shoutout */}
        <div className="text-center py-4 mb-3 text-base font-semibold text-[#1e3b2a]">
          🏆 Shoutout to Allyssa for winning the opening game.<br />
          The first champion of the new era.
        </div>

        {/* Feedback */}
        <div className="text-center text-sm text-[#666] mb-7">
          💬 Found a bug or have an idea? Hit the feedback button on any page — the Treasury is listening.
        </div>

        {/* Season badge + Leaderboard button */}
        <div className="mb-7 space-y-2">
          <div className="text-center text-sm font-bold text-[#1e3b2a] tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Season 1 · March 20 – May 31
          </div>
          <a
            href="/"
            className="block w-full text-center bg-[#1e3b2a] text-[#f7f3e6] font-bold text-lg py-4 rounded-2xl hover:bg-[#254b37] transition-colors"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            📊 Stats &amp; Leaderboard
          </a>
        </div>

        {/* Closing */}
        <div className="text-center">
          <p className="text-[17px] text-[#333] leading-relaxed mb-2">
            The leaderboard is live. The coins are waiting.
          </p>
          <p className="text-[19px] font-semibold text-[#1e3b2a] mb-5">
            Scan one. Take a selfie. See what happens.
          </p>
          <p className="text-base italic text-[#888] pt-5 border-t border-[#c9c2ae]">
            May fortune favor the bold… and the sneaky. ⚡
          </p>
        </div>

      </div>
    </main>
  );
}
