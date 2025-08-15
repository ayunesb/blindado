import { NavLink } from 'react-router-dom'

const items = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/book', label: 'Book', icon: '🛡️' },
  { to: '/bookings', label: 'Bookings', icon: '📅' },
  { to: '/account', label: 'Account', icon: '👤' },
]

export function TabBar() {
  return (
    <div className="grid grid-cols-4">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-14 text-xs gap-1 ${
              isActive ? 'text-white' : 'text-white/70'
            } hover:text-white`
          }
        >
          <span aria-hidden>{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
