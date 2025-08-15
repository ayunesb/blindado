import { useEffect, useState } from 'react'
import { getBookings, Booking } from '../shared/storage'

export function Bookings() {
  const [items, setItems] = useState<Booking[]>([])
  useEffect(() => { setItems(getBookings()) }, [])

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Your bookings</h2>
      {items.length === 0 ? (
        <p className="text-white/70">No bookings yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(b => (
            <li key={b.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.date} · {b.vehicle.toUpperCase()} · {b.hours}h</p>
                <p className="text-sm text-white/70">${b.price.toFixed(2)} · {b.status}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
