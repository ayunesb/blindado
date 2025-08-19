import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { navigate } from '../router';
import { api } from '../services/api';

type Staff = { id: string; name?: string; photo_url?: string; status?: string };

export default function CompanyStaffListScreen() {
	const [rows, setRows] = useState<Staff[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let alive = true;
		api.listCompanyStaff().then((list) => { if (alive) { setRows(list); setLoading(false); } });
		return () => { alive = false; };
	}, []);
	return (
		<section className="app-wrap pt-6 space-y-4">
			<h2 className="text-[24px] font-semibold">Company Staff</h2>
			<p className="text-white/70">Manage staff documents and onboarding.</p>
			<Button onClick={() => navigate('company-staff-new')} data-testid="cs-add">Add Staff</Button>
			{loading ? (
				<div className="rounded-2xl bg-white/6 border border-white/10 p-4 text-white/70">Loading…</div>
			) : rows.length === 0 ? (
				<div className="rounded-2xl bg-white/6 border border-white/10 p-4 text-white/70">No staff yet.</div>
			) : (
				<ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10">
					{rows.map((s) => (
						<li key={s.id} className="flex items-center gap-3 bg-white/5 px-4 py-3 hover:bg-white/10 cursor-pointer" onClick={() => navigate('company-staff/:id', { id: s.id })}>
							{ s.photo_url ? (
								<img src={s.photo_url} alt={s.name||'Staff'} className="h-8 w-8 rounded-full object-cover" />
							) : (
								<div className="h-8 w-8 rounded-full bg-white/10" />
							)}
							<div className="flex-1">
								<div className="text-white">{s.name || 'Staff'}</div>
								<div className="text-xs text-white/60">{s.status || 'pending'}</div>
							</div>
							<div className="text-white/50 text-sm">›</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
