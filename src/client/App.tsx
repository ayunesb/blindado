export default function App({ anon, sbUrl }: { anon: string; sbUrl: string }) {
  return (
    <div className="min-h-[100dvh] p-4">
      <header className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white/20" aria-hidden />
          <span className="tracking-wide font-semibold">ESCOLTA</span>
        </div>
        <span className="text-white/60 text-sm">NYC</span>
      </header>

      <main className="max-w-md mx-auto mt-6 space-y-4">
        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
          <h1 className="text-2xl font-semibold">Book Armed Protectors</h1>
          <p className="text-white/70 mt-1 text-sm">Premium protection on demand.</p>
          <button className="mt-4 inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-full">Book now</button>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
            <div className="text-sm text-white/70">Signed as</div>
            <div className="font-mono text-sm truncate">{anon || 'guest'}</div>
          </div>
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
            <div className="text-sm text-white/70">Supabase</div>
            <div className="text-xs text-white/60 truncate">{sbUrl ? 'provided' : 'not set'}</div>
          </div>
        </section>
      </main>
    </div>
  )
}
