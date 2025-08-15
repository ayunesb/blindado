import { useMemo } from 'react'

export function Account() {
  const id = useMemo(() => localStorage.getItem('anon') || 'demo-user', [])
  return (
    <section className="space-y-4">
      <div className="card p-5">
        <h2 className="text-xl font-semibold">Account</h2>
        <p className="text-white/70 mt-1">Signed in as <span className="font-mono">{id}</span> (demo)</p>
      </div>
      <button className="btn btn-outline" onClick={() => alert('Support: support@blindado.app')}>Contact support</button>
    </section>
  )
}
