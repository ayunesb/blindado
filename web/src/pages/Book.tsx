import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { computeQuote } from '../shared/quote'

export function Book() {
  const [date, setDate] = useState('')
  const [hours, setHours] = useState(4)
  const [vehicle, setVehicle] = useState<'sedan'|'suv'>('suv')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = computeQuote({ hours, vehicle })
    const payload = new URLSearchParams({
      hours: String(hours),
      vehicle,
      date,
      price: String(q.total)
    })
    const prefix = params.get('anon') ? `?anon=${params.get('anon')}` : ''
    navigate(`/quote${prefix && `&${prefix}`}`.replace('?&', '?') + `&${payload.toString()}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="card p-4 space-y-4">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Hours</label>
          <input className="input" type="number" min={2} max={24} value={hours} onChange={e=>setHours(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Vehicle</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button type="button" onClick={()=>setVehicle('sedan')} className={`btn ${vehicle==='sedan'?'btn-primary':'btn-outline'}`}>Sedan</button>
            <button type="button" onClick={()=>setVehicle('suv')} className={`btn ${vehicle==='suv'?'btn-primary':'btn-outline'}`}>SUV</button>
          </div>
        </div>
        <button className="btn btn-primary w-full" type="submit">Get instant quote</button>
      </div>
    </form>
  )
}
