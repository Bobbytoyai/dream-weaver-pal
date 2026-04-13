/**
 * RetroLoader — the ONE loading screen for all of Bobby.
 * Import and use everywhere instead of ad-hoc spinners.
 */
export default function RetroLoader({ message = "Chargement…" }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ backgroundColor: "#FDF6EC" }}
    >
      {/* Pixel progress bar */}
      <div
        className="w-48 h-4 border-[3px] border-black overflow-hidden"
        style={{ boxShadow: "3px 3px 0 rgba(0,0,0,.2)" }}
      >
        <div
          className="h-full bg-black animate-[retro-load_1.4s_ease-in-out_infinite]"
          style={{ transformOrigin: "left" }}
        />
      </div>

      {/* Message */}
      <p
        className="text-sm font-black uppercase tracking-wider text-black/70 animate-pulse"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        {message}
      </p>
    </div>
  );
}