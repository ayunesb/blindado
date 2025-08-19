import React, { useState } from 'react';
import Button from '../components/Button';
import TextField from '../components/fields/TextField';
import FileCard from '../components/FileCard';
import { useUpload } from '../lib/upload';
import { api } from '../services/api';

export default function ApplyScreen({ onDone, onToast }: { onDone: () => void; onToast: (m: string) => void }) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [license, setLicense] = useState('');
	const { attach, upload, progress } = useUpload();
	const [resumeUrl, setResumeUrl] = useState('');
	const [vehicleDocUrl, setVehicleDocUrl] = useState('');

	async function pick(kind: 'resume'|'vehicle') {
		const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*,application/pdf'; attach(inp);
		inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; const res = await upload(f, { bucket:'profiles', pathPrefix:`guards/self/apply/${kind}` }); if (kind==='resume') setResumeUrl(res.url); else setVehicleDocUrl(res.url); };
		inp.click();
	}

	async function onSubmit() {
		await api.freelancerApply({ name, email, driver_license_url: license ? `drivers/self/${license}` : undefined, id_doc_url: resumeUrl, vehicle: vehicleDocUrl ? { doc_url: vehicleDocUrl } : undefined });
		onToast('Application submitted'); onDone();
	}

	return (
		<section className="app-wrap pt-6 space-y-4">
			<h2 className="text-[24px] font-semibold">Apply to Join</h2>
			<TextField label="Full Name" placeholder="Alex Protector" value={name} onChange={setName} testId="apply-name" />
			<TextField label="Email" placeholder="alex@example.com" value={email} onChange={setEmail} testId="apply-email" />
			<TextField label="License Number" placeholder="NY-123456" value={license} onChange={setLicense} testId="apply-license" />
			<FileCard title="Resume / CV" url={resumeUrl} onPick={() => pick('resume')} busy={progress>0 && progress<100} testId="apply-resume" />
			<FileCard title="Vehicle (optional)" url={vehicleDocUrl} onPick={() => pick('vehicle')} busy={progress>0 && progress<100} testId="apply-vehicle" />
			<Button onClick={onSubmit} data-testid="apply-submit">Submit Application</Button>
		</section>
	);
}
