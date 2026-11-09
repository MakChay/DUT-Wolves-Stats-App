interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading your workspace…' }: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#0b0d10] px-6 text-center text-[#f5f6f7]"
    >
      <img
        src="/wolves-mark-white.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] opacity-[0.045]"
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="grid h-24 w-24 animate-pulse place-items-center rounded-[1.75rem] border border-[#31c5d8]/35 bg-white/[0.045] shadow-[0_0_3rem_rgba(49,197,216,0.12)] motion-reduce:animate-none">
          <img src="/wolves-mark-white.png" alt="" className="h-16 w-16 object-contain" />
        </div>
        <p className="mt-6 text-xs font-extrabold tracking-[0.28em] text-[#f5f6f7]">DUT WOLVES</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.38em] text-[#31c5d8]">Stats</p>
        <div
          role="progressbar"
          aria-label="Loading workspace"
          className="mt-8 h-0.5 w-32 overflow-hidden bg-white/15"
        >
          <span className="block h-full w-2/5 animate-pulse bg-[#31c5d8] motion-reduce:animate-none" />
        </div>
        <p className="mt-4 text-xs text-[#a9afb7]">{message}</p>
        <p className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-[#a9afb7]/70">
          BASKETBALL · ONE PACK
        </p>
      </div>
    </div>
  )
}
