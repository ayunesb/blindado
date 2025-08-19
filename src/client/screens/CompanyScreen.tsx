// src/client/screens/CompanyScreen.tsx
import React, { useState } from 'react';
import Button from '../components/Button';
import TextField from '../components/fields/TextField';
import { api } from '../services/api';

export default function CompanyScreen({ onDone, onToast }: { onDone: () => void; onToast: (m: string) => void }) {
	const [companyName, setCompanyName] = useState('');
	const [contactName, setContactName] = useState('');
	const [contactEmail, setContactEmail] = useState('');
	const [taxId, setTaxId] = useState('');
	const [payoutAccountId, setPayoutAccountId] = useState('');

	async function onSave() {
		await api.companyUpsert({ company_name: companyName, contact_name: contactName, contact_email: contactEmail, tax_id: taxId, payout_account_id: payoutAccountId });
		onToast('Company saved');
		onDone();
	}
	return (
			<section className="app-wrap pt-6 space-y-4">
				<h2 className="text-[24px] font-semibold">Company</h2>
				<TextField label="Company Name" placeholder="Acme Security LLC" value={companyName} onChange={setCompanyName} />
				<TextField label="Contact Name" placeholder="John Manager" value={contactName} onChange={setContactName} />
				<TextField label="Contact Email" placeholder="ops@acme.com" value={contactEmail} onChange={setContactEmail} />
				<TextField label="Tax ID" placeholder="XX-XXXXXXX" value={taxId} onChange={setTaxId} />
				<TextField label="Payout Account ID" placeholder="acct_... (Stripe)" value={payoutAccountId} onChange={setPayoutAccountId} />
				<Button onClick={onSave}>Save</Button>
			</section>
	);
}
