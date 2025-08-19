import React, { useState } from 'react';
import Button from '../components/Button';
import FileCard from '../components/FileCard';
import { useUpload } from '../lib/upload';
import { api } from '../services/api';

export default function CompanyStaffDetailScreen({ id, onDone, onToast }: { id: string; onDone: () => void; onToast: (m: string) => void }) {
	const { attach, upload, progress } = useUpload();
	const [idDocUrl, setIdDocUrl] = useState('');
	const [licenseUrl, setLicenseUrl] = useState('');
	const [photoUrl, setPhotoUrl] = useState('');

	async function pick(kind: 'id'|'license'|'photo') {
		const inp = document.createElement('input'); inp.type='file'; inp.accept= kind==='photo' ? 'image/*' : 'image/*,application/pdf'; attach(inp);
		inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; const res = await upload(f, { bucket:'company_docs', pathPrefix:`companies/self/staff/${id}/${kind}` }); if (kind==='id') setIdDocUrl(res.url); else if (kind==='license') setLicenseUrl(res.url); else setPhotoUrl(res.url); };
		inp.click();
	}

	async function onSave() {
		await api.staffUpsert({ id, id_doc_url: idDocUrl, driver_license_url: licenseUrl, photo_formal_url: photoUrl });
		onToast('Staff updated'); onDone();
	}

	return (
		<section className="app-wrap pt-6 space-y-4">
			<h2 className="text-[24px] font-semibold">Edit Staff</h2>
			<div className="text-white/70 text-sm">ID: {id}</div>
			<FileCard title="ID Document" url={idDocUrl} onPick={() => pick('id')} busy={progress>0 && progress<100} />
			<FileCard title="License" url={licenseUrl} onPick={() => pick('license')} busy={progress>0 && progress<100} />
			<FileCard title="Photo" url={photoUrl} onPick={() => pick('photo')} busy={progress>0 && progress<100} />
			<Button onClick={onSave}>Save</Button>
		</section>
	);
}
