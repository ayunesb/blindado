// src/client/screens/CompanyPermitsScreen.tsx
import React, { useState } from 'react';
import Button from '../components/Button';
import FileCard from '../components/FileCard';
import { useUpload } from '../lib/upload';
import { api } from '../services/api';

export default function CompanyPermitsScreen({ onDone, onToast }: { onDone: () => void; onToast: (m: string) => void }) {
	const { attach, upload, progress } = useUpload();
	const [insuranceUrl, setInsuranceUrl] = useState('');
	const [permitUrl, setPermitUrl] = useState('');

	async function pick(kind: 'insurance'|'collective_permit') {
	const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf';
	attach(inp);
	inp.onchange = async () => {
	const f = inp.files?.[0]; if (!f) return;
	const res = await upload(f, { bucket: 'company_docs', pathPrefix: `companies/self/${kind}` });
	if (kind === 'insurance') setInsuranceUrl(res.url); else setPermitUrl(res.url);
	};
	inp.click();
	}

	async function onSave() {
	await api.companyPermitsUpsert({ insurance_doc_url: insuranceUrl, collective_gun_permit_url: permitUrl });
	onToast('Permits saved');
	onDone();
	}

	return (
	<section className="app-wrap pt-6 space-y-4">
	<h2 className="text-[24px] font-semibold">Company Permits</h2>
	<FileCard title="Insurance" url={insuranceUrl} onPick={() => pick('insurance')} busy={progress>0 && progress<100} />
	<FileCard title="Collective Gun Permit" url={permitUrl} onPick={() => pick('collective_permit')} busy={progress>0 && progress<100} />
	<Button onClick={onSave}>Save</Button>
	</section>
	);
}
