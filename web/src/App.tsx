import { Route, Routes, Navigate, Link, useLocation } from 'react-router-dom'
import { Home } from './pages/Home'
import { Book } from './pages/Book'
import { Quote } from './pages/Quote'
import { Bookings } from './pages/Bookings'
import { Account } from './pages/Account'
import { TabBar } from './components/TabBar'

export default function App() {
  const loc = useLocation()
  const hideTabs = loc.pathname.startsWith('/quote')
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/home" className="font-semibold tracking-wide">Escolta</Link>
          <nav className="text-sm text-white/70 space-x-4">
            <Link className="hover:text-white" to="/book">Book</Link>
            <Link className="hover:text-white" to="/bookings">Bookings</Link>
            <Link className="hover:text-white" to="/account">Account</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/book" element={<Book />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
      {!hideTabs && (
        <footer className="sticky bottom-0 z-20 border-t border-white/10 bg-background/80 backdrop-blur">
          <div className="max-w-md mx-auto">
            <TabBar />
          </div>
        </footer>
      )}
    </div>
  )
}
