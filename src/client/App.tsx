// src/client/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useHashRoute, Route } from './router';
import Button from './components/Button';
import ValuePropCard from './components/ValuePropCard';
import ProfileCard from './components/ProfileCard';
import BottomNav from './components/BottomNav';
import BottomSheet from './components/BottomSheet';
import Modal from './components/Modal';
import Toast from './components/Toast';
import TextField from './components/fields/TextField';
import DateField from './components/fields/DateField';
import TimeField from './components/fields/TimeField';
import DurationField from './components/fields/DurationField';
import { PROTECTORS } from './data/profiles';
import { computeQuote } from '../shared/quote';

type Props = { anon: string; sb: string };

// localStorage key
const LS_KEY = 'blindado.bookings';

type BookingDraft = {
  pickupLocation: string;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm
  durationHours: number;
};

type Booking = BookingDraft & {
  id: string;
  createdAt: string;
  status: 'Pending' | 'Confirmed';
  quote: {
    basePerHour: number;
    hours: number;
    blackCar: number;
    taxes: number;
    total: number;
  };
};

function nowLocalISODate() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
}

function validateDraft(d: BookingDraft) {
  const errors: Partial<Record<keyof BookingDraft, string>> = {};
  if (!d.pickupLocation || d.pickupLocation.trim().length < 3) {
    errors.pickupLocation = 'Enter at least 3 characters.';
  }
  if (!d.pickupDate) {
    errors.pickupDate = 'Select a date.';
  } else {
    const today = nowLocalISODate();
    if (d.pickupDate < today) errors.pickupDate = 'Date cannot be in the past.';
  }
  if (!d.pickupTime) {
    errors.pickupTime = 'Select a time.';
  }

  if (d.durationHours < 2 || d.durationHours > 24) {
    errors.durationHours = 'Choose 2–24 hours.';
  }

  // lead time ≥ 30 min
  if (d.pickupDate && d.pickupTime) {
    const dt = new Date(`${d.pickupDate}T${d.pickupTime}:00`);
    const lead = dt.getTime() - Date.now();
    if (lead < 30 * 60 * 1000) {
      errors.pickupTime = 'Choose a time at least 30 minutes from now.';
    }
  }
  return errors;
}

export default function App({ anon, sb }: Props) {
  const { route, navigate } = useHashRoute();
  const [toast, setToast] = useState<string>('');

  // Booking state
  const [draft, setDraft] = useState<BookingDraft>({
    pickupLocation: '',
    pickupDate: nowLocalISODate(),
    pickupTime: '',
    durationHours: 2,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingDraft, string>>>({});

  // Quote inputs (tokenized defaults)
  const basePerHour = 120;
  const blackCar = 80;
  const taxRate = 0.08875;

  const canNext = useMemo(() => Object.keys(validateDraft(draft)).length === 0, [draft]);

  useEffect(() => {
    // Ensure a default #/home on first load
    if (!window.location.hash) navigate('home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist bookings
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Booking[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  function onNext() {
    const e = validateDraft(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      return;
    }
    navigate('quote');
  }

  function onConfirm() {
    const q = computeQuote({
      basePerHour,
      hours: draft.durationHours,
      blackCar,
      taxRate,
    });
    const booking: Booking = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Pending',
      quote: {
        basePerHour,
        hours: draft.durationHours,
        blackCar,
        taxes: q.taxes,
        total: q.total,
      },
      ...draft,
    };
    setBookings((prev) => [booking, ...prev]);
    setToast('Request submitted. We\u2019ll contact you shortly.');
    navigate('bookings');
  }

  return (
    <div className="min-h-screen pb-28">
      {/* HERO */}
      <header className="relative h-[280px] overflow-hidden">
        <img src="/assets/brand/ic-car-suv.svg" alt="Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <img src="/brand/icons/shield.svg" alt="Blindado" className="w-8 h-8" />
            <span className="text-white/80 text-sm">Premium Protection</span>
          </div>
          <h1 className="px-0 -mt-1 text-white text-[40px] leading-[44px] font-semibold tracking-[-0.02em]">
            Book Armed Protectors in New York City
          </h1>
        </div>
      </header>

      <main>
        {/* Primary CTA */}
        <div className="px-6 mt-6">
          <Button onClick={() => navigate('book')}>Book a Protector</Button>
        </div>

        {/* Value Props */}
        <section className="mt-6 space-y-4 px-6" aria-label="Why Blindado">
          <ValuePropCard
            title="Vetted Professionals"
            subtitle="Former law enforcement & military with executive protection training."
            icon={<span className="text-2xl">🛡️</span>}
          />
          <ValuePropCard
            title="On-Demand Coverage"
            subtitle="Book for 2–24 hours with instant quote and transparent pricing."
            icon={<span className="text-2xl">⚡</span>}
          />
          <ValuePropCard
            title="Black Car Option"
            subtitle="Professional drivers & secure transport available as an add-on."
            icon={<span className="text-2xl">🚘</span>}
          />
        </section>

        {/* Profiles Carousel */}
        <section className="mt-6" aria-label="Meet the Protectors">
          <h2 className="px-6 text-white text-[28px] font-semibold">Meet the Protectors</h2>
          <div
            className="mt-4 pl-6 pr-4 flex gap-4 overflow-x-auto snap-x snap-mandatory"
            aria-roledescription="carousel"
          >
            {PROTECTORS.map((p) => (
              <ProfileCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* Bookings screen */}
        {route === 'bookings' && (
          <section className="px-6 pt-6">
            {bookings.length === 0 ? (
              <div className="h-[40vh] flex flex-col items-center justify-center text-center">
                <p className="text-white/70 text-[16px]">No bookings yet.</p>
                <div className="mt-4 w-full max-w-sm">
                  <Button onClick={() => navigate('home')}>Book a Protector</Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {bookings.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-2xl bg-white/6 border border-white/8 p-4 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-white font-medium">
                        {new Date(`${b.pickupDate}T${b.pickupTime}:00`).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                      <div className="text-white/70 text-sm truncate">
                        {b.pickupLocation} • {b.durationHours}h
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/80 font-semibold">${b.quote.total.toFixed(2)}</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-white">{b.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Account screen */}
        {route === 'account' && (
          <section className="px-6 pt-6 space-y-4">
            <div className="rounded-2xl bg-white/6 border border-white/8 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-lg">
                {/* initials placeholder */}
                B
              </div>
              <div className="min-w-0">
                <div className="text-white font-medium">Blindado Client</div>
                <div className="text-white/60 text-sm truncate">connected: {sb ? 'Supabase' : 'None'}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/6 border border-white/8">
              <Row label="Payment method" value="•••• 4242" />
              <Divider />
              <Row label="Support" value="help@blindado.app" />
              <Divider />
              <Row label="Terms & Privacy" />
              <Divider />
              <Row label="Sign out" destructive />
            </div>
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav
        active={route}
        onChange={(r) => {
          // In this app, "Protector" maps to 'home'
          navigate(r);
        }}
      />

      {/* Booking Bottom Sheet (over Home) */}
      <BottomSheet isOpen={route === 'book' || route === 'quote'} onClose={() => navigate('home')}>
        <div className="px-5 pt-2 pb-4">
          {/* Back chevron */}
          <button
            onClick={() => navigate('home')}
            aria-label="Close"
            className="absolute left-4 top-4 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded-full p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <h3 className="text-white text-[20px] font-semibold px-1 mt-2 mb-4">Booking Details</h3>

          <div className="space-y-5">
            <TextField
              label="Pickup Location"
              placeholder="e.g., The Mark Hotel, 25 E 77th St"
              value={draft.pickupLocation}
              onChange={(v) => setDraft((d) => ({ ...d, pickupLocation: v }))}
              error={errors.pickupLocation}
              icon={<span className="text-xl">📍</span>}
            />
            <DateField
              label="Pickup Date"
              value={draft.pickupDate}
              onChange={(v) => setDraft((d) => ({ ...d, pickupDate: v }))}
              min={nowLocalISODate()}
              error={errors.pickupDate}
              icon={<span className="text-xl">📅</span>}
            />
            <TimeField
              label="Pickup Time"
              value={draft.pickupTime}
              onChange={(v) => setDraft((d) => ({ ...d, pickupTime: v }))}
              error={errors.pickupTime}
              icon={<span className="text-xl">⏰</span>}
            />
            <DurationField
              valueHours={draft.durationHours}
              onChange={(n) => setDraft((d) => ({ ...d, durationHours: n }))}
              error={errors.durationHours}
            />
          </div>

          {/* Sticky Next */}
          <div className="sticky bottom-0 bg-gradient-to-t from-black/30 to-transparent pt-3 safe-bottom px-0 mt-4">
            <Button onClick={onNext} disabled={!canNext} className={!canNext ? 'opacity-50 cursor-not-allowed' : ''}>
              Next
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Quote Modal */}
      <Modal open={route === 'quote'} onClose={() => navigate('book')} ariaLabel="Instant Quote">
        <h4 className="text-white text-[20px] font-semibold mb-3">Instant Quote</h4>
        {/* Breakdown */}
        <div className="space-y-1">
          <RowKV k="Base (per hour)" v={`$${basePerHour.toFixed(2)}`} />
          <RowKV k="Hours" v={`${draft.durationHours}`} />
          <RowKV k="Black Car" v={`$${blackCar.toFixed(2)}`} />
          <div className="my-3 border-t border-white/10" />
          {(() => {
            const q = computeQuote({
              basePerHour,
              hours: draft.durationHours,
              blackCar,
              taxRate,
            });
            return (
              <>
                <RowKV k="Taxes & Fees" v={`$${q.taxes.toFixed(2)}`} />
                <div className="mt-2 text-white font-semibold flex items-center justify-between h-12 text-[18px]">
                  <span>Total</span>
                  <span>${q.total.toFixed(2)}</span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Button variant="secondary" height="md" rounded="md" onClick={() => navigate('book')}>
            Back
          </Button>
          <Button height="md" rounded="md" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Toast open={!!toast} message={toast} onClose={() => setToast('')} />
    </div>
  );
}

function Row({ label, value, destructive }: { label: string; value?: string; destructive?: boolean }) {
  return (
    <div className="h-14 px-4 flex items-center justify-between">
      <span className={destructive ? 'text-red-400' : 'text-white'}>{label}</span>
      {value && <span className="text-white/70">{value}</span>}
    </div>
  );
}
function Divider() {
  return <div className="h-px bg-white/10 mx-4" />;
}
function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between h-12 text-[16px] text-white/90">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
