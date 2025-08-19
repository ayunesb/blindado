import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import TextField from '../components/fields/TextField';
import FileCard from '../components/FileCard';
import { useUpload } from '../lib/upload';
import { api } from '../services/api';

export default function CompanyVehiclesScreen({ onDone, onToast }: { onDone: () => void; onToast: (m: string) => void }) {
	const [make, setMake] = useState('');
	const [model, setModel] = useState('');
	const [plate, setPlate] = useState('');
	const { attach, upload, progress } = useUpload();
	const [registrationUrl, setRegistrationUrl] = useState('');
	const [insuranceUrl, setInsuranceUrl] = useState('');
	const [list, setList] = useState<{ id: string; plate?: string; status?: string }[]>([]);
	const [loading, setLoading] = useState(true);

	async function pick(kind: 'registration'|'insurance') {
		const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*,application/pdf'; attach(inp);
		inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; const res = await upload(f, { bucket:'company_docs', pathPrefix:`companies/self/vehicles/${plate||'vehicle'}/${kind}` }); if (kind==='registration') setRegistrationUrl(res.url); else setInsuranceUrl(res.url); };
		inp.click();
	}

	async function onSave() {
		await api.vehicleUpsert({ owner_type: 'company', type: 'car', make, model, plate, registration_url: registrationUrl, insurance_url: insuranceUrl });
		onToast('Vehicle saved'); onDone();
	}

	useEffect(() => {
		let alive = true;
		api.listVehicles().then((rows) => { if (alive) { setList(rows); setLoading(false); } });
		return () => { alive = false; };
	}, []);

	return (
		<section className="app-wrap pt-6 space-y-4">
			<h2 className="text-[24px] font-semibold">Company Vehicles</h2>
			<TextField label="Make" placeholder="Cadillac" value={make} onChange={setMake} testId="cv-make" />
			<TextField label="Model" placeholder="Escalade" value={model} onChange={setModel} testId="cv-model" />
			<TextField label="Plate" placeholder="NY ABC-1234" value={plate} onChange={setPlate} testId="cv-plate" />
			<FileCard title="Registration" url={registrationUrl} onPick={() => pick('registration')} busy={progress>0 && progress<100} />
			<FileCard title="Insurance" url={insuranceUrl} onPick={() => pick('insurance')} busy={progress>0 && progress<100} />
			<Button onClick={onSave} data-testid="cv-save">Save Vehicle</Button>

			<div className="pt-6">
				<h3 className="text-lg font-semibold mb-2">Your Vehicles</h3>
				{loading ? (
					<div className="rounded-2xl bg-white/6 border border-white/10 p-4 text-white/70">Loading…</div>
				) : list.length === 0 ? (
					<div className="rounded-2xl bg-white/6 border border-white/10 p-4 text-white/70">No vehicles yet.</div>
				) : (
					<ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10">
						{list.map((v) => (
							<li key={v.id} className="flex items-center gap-3 bg-white/5 px-4 py-3">
								<div className="h-8 w-12 rounded bg-white/10" />
								<div className="flex-1">
									<div className="text-white">{v.plate || 'Vehicle'}</div>
									<div className="text-xs text-white/60">{v.status || 'active'}</div>
								</div>
								<div className="text-white/50 text-sm">›</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
// placeholder, will be implemented in next patch
