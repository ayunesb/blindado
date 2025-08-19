// src/client/screens/ProfileEditScreen.tsx
import React, { useState } from 'react';
import Button from '../components/Button';
import FileCard from '../components/FileCard';
import { useUpload } from '../lib/upload';
import { api } from '../services/api';

export default function ProfileEditScreen({ onDone, onToast }: { onDone: () => void; onToast: (m: string) => void }) {
	const [idUrl, setIdUrl] = useState('');
	const [porUrl, setPorUrl] = useState('');
	const { attach, upload, progress } = useUpload();

	async function pickAndUpload(pathPrefix: string, setter: (u: string) => void) {
		const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf';
		attach(inp);
		inp.onchange = async () => {
			const f = inp.files?.[0]; if (!f) return;
			const res = await upload(f, { bucket: 'profiles', pathPrefix });
			setter(res.url);
		};
		inp.click();
	}

	async function onSave() {
		await api.clientProfileUpsert({ id_doc_url: idUrl, proof_of_residence_url: porUrl });
		onToast('Saved');
		onDone();
	}

	return (
		<section className="app-wrap pt-6 space-y-4">
			<h2 className="text-[24px] font-semibold">Edit Profile</h2>
			<FileCard title="ID / Passport" url={idUrl} onPick={() => pickAndUpload('users/self/id_doc', setIdUrl)} busy={progress>0 && progress<100} testId="pe-id" />
			<FileCard title="Proof of Residence" url={porUrl} onPick={() => pickAndUpload('users/self/proof_of_residence', setPorUrl)} busy={progress>0 && progress<100} testId="pe-por" />
			<Button onClick={onSave} data-testid="pe-save">Save</Button>
		</section>
	);
}
