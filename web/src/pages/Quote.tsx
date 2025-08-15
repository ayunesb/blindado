import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { saveBooking } from '../shared/storage'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export function Quote() {
  const q = useQuery()
  const navigate = useNavigate()
  const price = Number(q.get('price') ?? '0')
  const hours = Number(q.get('hours') ?? '0')
  const vehicle = q.get('vehicle') ?? 'suv'
  const date = q.get('date') ?? ''

  useEffect(() => {
    if (!hours || !date) navigate('/book')
  }, [hours, date, navigate])

  function pay() {
    // Simulate successful payment, then persist and go to bookings.
    saveBooking({ id: crypto.randomUUID(), date, hours, vehicle, price, status: 'confirmed' })
    navigate('/bookings')
  }

  return (
    <section className="space-y-4">
      <div className="card p-5">
        <h2 className="text-xl font-semibold">Instant Quote</h2>
        <p className="text-white/70">{hours}h · {vehicle.toUpperCase()} · {date}</p>
        <p className="text-3xl mt-4 font-semibold">${price.toFixed(2)}</p>
        <button className="btn btn-primary w-full mt-4" onClick={pay}>Pay and confirm</button>
      </div>
      <p className="text-xs text-white/60">Demo mode — payment simulated.</p>
    </section>
  )
}
