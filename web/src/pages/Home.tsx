import { Link } from 'react-router-dom'

export function Home() {
  return (
    <section className="space-y-6">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold">Escolta</h1>
        <p className="text-white/70 mt-1">Premium protection on demand.</p>
        <div className="mt-4">
          <Link to="/book" className="btn btn-primary">Book now</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-medium">Armored SUVs</h3>
          <p className="text-sm text-white/70">Discreet, safe, and comfortable.</p>
        </div>
        <div className="card p-4">
          <h3 className="font-medium">Elite Drivers</h3>
          <p className="text-sm text-white/70">Trained and vetted professionals.</p>
        </div>
      </div>
    </section>
  )
}
