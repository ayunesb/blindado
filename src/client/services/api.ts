import { getSupabaseClient } from '../lib/supabase';

type Staff = {
	id: string;
	name?: string;
	email?: string;
	role?: string;
	id_doc_url?: string;
	license_url?: string;
	photo_url?: string;
	status?: string;
};

type Vehicle = {
	id: string;
	make?: string;
	model?: string;
	plate?: string;
	registration_url?: string;
	insurance_url?: string;
	type?: string;
	status?: string;
};

type StaffUpsertPayload = {
	company_id?: string;
	name?: string;
	email?: string;
	address?: string;
	id_doc_url?: string;
	gun_permit_url?: string;
	driver_license_url?: string;
	photo_formal_url?: string;
	photo_casual_url?: string;
	id?: string;
};

type VehicleUpsertPayload = {
	id?: string;
	owner_type?: 'company' | 'freelancer';
	owner_id?: string;
	type?: string;
	make?: string;
	model?: string;
	plate?: string;
	registration_url?: string;
	insurance_url?: string;
	armored_level?: string;
	photo_url?: string;
};

const LS_KEYS = {
	staff: 'demo.staff',
	vehicles: 'demo.vehicles',
};

function readLS<T>(key: string): T[] {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T[]) : [];
	} catch {
		return [];
	}
}
function writeLS<T>(key: string, rows: T[]) {
	try {
		localStorage.setItem(key, JSON.stringify(rows));
	} catch {
		/* ignore */
	}
}

async function invoke(name: string, body: unknown) {
	try {
		const sb = getSupabaseClient();
		const { data, error } = await sb.functions.invoke(name, { body: body as Record<string, unknown> });
		if (error) throw new Error(error.message);
		return data;
	} catch {
		// Stub fallback in dev/demo when Supabase isn't configured
		await new Promise((r) => setTimeout(r, 120));
		return { ok: true, stub: true } as const;
	}
}

function isStub() {
	const params = new URLSearchParams(location.search);
	// support both query flag and env flag
	return params.get('stub') === '1' || (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_STUB_API === 'true';
}

function hasStubFlag(v: unknown): v is { stub?: boolean } {
	return typeof v === 'object' && v !== null && 'stub' in v;
}

export const api = {
	clientProfileUpsert: (payload: { name?: string; email?: string; id_doc_url?: string; proof_of_residence_url?: string }) => invoke('client_profile_upsert', payload),
	companyUpsert: (payload: { company_name?: string; contact_name?: string; contact_email?: string; tax_id?: string; payout_account_id?: string }) => invoke('company_upsert', payload),
	companyPermitsUpsert: (payload: { insurance_doc_url?: string; collective_gun_permit_url?: string }) => invoke('company_permits_upsert', payload),
	vehicleUpsert: async (payload: VehicleUpsertPayload) => {
		const res = await invoke('vehicle_upsert', payload);
		// Persist to localStorage in demo mode
		if ((hasStubFlag(res) && !!res.stub) || isStub()) {
			const rows = readLS<Vehicle>(LS_KEYS.vehicles);
			const id = payload.id || `veh-${Date.now()}`;
			const next: Vehicle = {
				id,
			make: payload.make,
			model: payload.model,
			plate: payload.plate,
			registration_url: payload.registration_url,
			insurance_url: payload.insurance_url,
				status: 'active',
			};
			const idx = rows.findIndex((r) => r.id === id);
			if (idx >= 0) rows[idx] = { ...rows[idx], ...next };
			else rows.unshift(next);
			writeLS(LS_KEYS.vehicles, rows);
			return { ok: true, id };
		}
		return res;
	},
		staffUpsert: async (payload: StaffUpsertPayload) => {
		const res = await invoke('company_staff_upsert', payload);
		// Persist to localStorage in demo mode
			if ((hasStubFlag(res) && !!res.stub) || isStub()) {
			const rows = readLS<Staff>(LS_KEYS.staff);
						const id = payload.id || `staff-${Date.now()}`;
			const next: Staff = {
				id,
							name: payload.name,
							email: payload.email,
					role: 'guard',
							id_doc_url: payload.id_doc_url,
							license_url: payload.driver_license_url,
							photo_url: payload.photo_formal_url,
				status: 'pending_review',
			};
			const idx = rows.findIndex((r) => r.id === id);
			if (idx >= 0) rows[idx] = { ...rows[idx], ...next };
			else rows.unshift(next);
			writeLS(LS_KEYS.staff, rows);
			return { ok: true, id };
		}
		return res;
	},
	freelancerApply: (payload: Record<string, unknown>) => invoke('freelancer_apply', payload),
	async listCompanyStaff(): Promise<Staff[]> {
		// Try Supabase direct query first
		try {
			const sb = getSupabaseClient();
			const { data, error } = await sb
				.from('guards')
				.select('id, first_name, last_name, photo_url, status, created_at')
				.order('created_at', { ascending: false });
			if (error) throw error;
			type GuardRow = { id: string; first_name?: string | null; last_name?: string | null; photo_url?: string | null; status?: string | null };
			return (data as GuardRow[] | null || []).map((g) => ({
				id: g.id,
				name: [g.first_name ?? '', g.last_name ?? ''].filter(Boolean).join(' ').trim() || 'Staff',
				photo_url: g.photo_url ?? '',
				status: g.status ?? 'pending_review',
			}));
		} catch {
			return readLS<Staff>(LS_KEYS.staff);
		}
	},
	async getStaff(id: string): Promise<Staff | null> {
		try {
			const sb = getSupabaseClient();
			const { data, error } = await sb
				.from('guards')
				.select('id, first_name, last_name, photo_url, status')
				.eq('id', id)
				.maybeSingle();
			if (error) throw error;
			if (!data) return null;
			type GuardRow = { id: string; first_name?: string | null; last_name?: string | null; photo_url?: string | null; status?: string | null };
			const g = data as GuardRow;
			return {
				id: g.id,
				name: [g.first_name ?? '', g.last_name ?? ''].filter(Boolean).join(' ').trim() || 'Staff',
				photo_url: g.photo_url ?? '',
				status: g.status ?? 'pending_review',
			};
		} catch {
			const rows = readLS<Staff>(LS_KEYS.staff);
			return rows.find((r) => r.id === id) || null;
		}
	},
	async listVehicles(): Promise<Vehicle[]> {
		try {
			const sb = getSupabaseClient();
			const { data, error } = await sb
				.from('vehicles')
				.select('id, type, plate, photo_url, status, created_at')
				.order('created_at', { ascending: false });
			if (error) throw error;
			type VehicleRow = { id: string; type?: string | null; plate?: string | null; status?: string | null };
			return (data as VehicleRow[] | null || []).map((v) => ({
				id: v.id,
				type: v.type ?? undefined,
				plate: v.plate ?? undefined,
				status: v.status ?? undefined,
			}));
		} catch {
			return readLS<Vehicle>(LS_KEYS.vehicles);
		}
	},
};
