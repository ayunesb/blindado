export default function GuardApp() {
  return (
    <div className="min-h-[100dvh]">
      <header className="app-wrap flex items-center gap-2 pt-4">
        <div className="w-6 h-6 rounded bg-white/20" aria-hidden />
        <h1 className="text-xl font-semibold">Assignments</h1>
      </header>
      <main className="app-wrap mt-6">
        <p className="text-white/70 text-sm">Signed with anon key via querystring.</p>
      </main>
    </div>
  )
}
