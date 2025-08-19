// src/client/screens/OnboardScreen.tsx
import React, { useMemo, useState } from 'react';
import Button from '../components/Button';
import TextField from '../components/fields/TextField';
import { getSupabaseClient } from '../lib/supabase';
import { submitOnboarding, type Role } from '../services/onboard';

export default function OnboardScreen({ role: initialRole = 'client', onDone }: { role?: Role; onDone: () => void }) {
  const supabase = useMemo(() => {
    try { return getSupabaseClient(); } catch { return null; }
  }, []);
  const [role, setRole] = useState<Role>(initialRole);
  const [submitting, setSubmitting] = useState(false);

  // Client fields
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  // Company fields
  const [coName, setCoName] = useState('');
  const [coContact, setCoContact] = useState('');
  const [coEmail, setCoEmail] = useState('');
  // Guard fields
  const [gName, setGName] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gLicense, setGLicense] = useState('');

  function validate(): string | null {
    if (role === 'client') {
      if (cName.trim().length < 2) return 'Enter your full name.';
      if (!/.+@.+\..+/.test(cEmail)) return 'Enter a valid email.';
    }
    if (role === 'company') {
      if (coName.trim().length < 2) return 'Company name is required.';
      if (coContact.trim().length < 2) return 'Contact name is required.';
      if (!/.+@.+\..+/.test(coEmail)) return 'Enter a valid contact email.';
    }
    if (role === 'guard') {
      if (gName.trim().length < 2) return 'Enter your full name.';
      if (!/.+@.+\..+/.test(gEmail)) return 'Enter a valid email.';
      if (!gLicense.trim()) return 'Enter your license number.';
    }
    return null;
  }

  async function onSubmit() {
    setSubmitting(true);
    try {
      if (supabase) {
        const payload = role === 'client'
          ? { name: cName, email: cEmail }
          : role === 'company'
          ? { company_name: coName, contact_name: coContact, contact_email: coEmail }
          : { name: gName, email: gEmail, license_number: gLicense };
        const errorMsg = validate();
        if (errorMsg) throw new Error(errorMsg);
        await submitOnboarding(supabase, role, payload);
      }
      onDone();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="app-wrap pt-6">
      <h2 className="text-white text-[24px] font-semibold">Get Started</h2>
      <p className="text-white/70 mt-1">Select a path and tell us a bit about you.</p>

      {/* Role selector */}
      <div className="mt-4 flex gap-2">
        {(['client','company','guard'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            className={`h-10 px-4 rounded-2xl border text-[14px] ${role===r? 'bg-white text-black border-transparent':'text-white/80 border-white/15'}`}
            onClick={() => setRole(r)}
          >
            {r === 'client' ? 'Client' : r === 'company' ? 'Company' : 'Guard'}
          </button>
        ))}
      </div>

      {/* Forms */}
      {role === 'client' && (
        <div className="mt-5 space-y-4">
          <TextField label="Full Name" placeholder="Jane Doe" value={cName} onChange={setCName} />
          <TextField label="Email" placeholder="jane@company.com" value={cEmail} onChange={setCEmail} />
        </div>
      )}
      {role === 'company' && (
        <div className="mt-5 space-y-4">
          <TextField label="Company Name" placeholder="Blindado, Inc." value={coName} onChange={setCoName} />
          <TextField label="Contact Name" placeholder="Jane Doe" value={coContact} onChange={setCoContact} />
          <TextField label="Contact Email" placeholder="jane@company.com" value={coEmail} onChange={setCoEmail} />
        </div>
      )}
      {role === 'guard' && (
        <div className="mt-5 space-y-4">
          <TextField label="Full Name" placeholder="John Smith" value={gName} onChange={setGName} />
          <TextField label="Email" placeholder="john@example.com" value={gEmail} onChange={setGEmail} />
          <TextField label="License Number" placeholder="NY-123456" value={gLicense} onChange={setGLicense} />
        </div>
      )}

      <div className="mt-6">
        <Button onClick={onSubmit} disabled={!!validate() || submitting}>Continue</Button>
      </div>
    </section>
  );
}
