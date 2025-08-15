export default function GuardApp() {
  return (
    <div className="min-h-[100dvh] p-4">
      <header className="max-w-md mx-auto flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-white/20" aria-hidden />
        <h1 className="text-xl font-semibold">Assignments</h1>
      </header>
      <main className="max-w-md mx-auto mt-6">
        <p className="text-white/70 text-sm">Signed with anon key via querystring.</p>
      </main>
    </div>
  )
}
