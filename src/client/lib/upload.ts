import { useRef, useState } from 'react';
import { getSupabaseClient } from './supabase';

type UploadOpts = { bucket: string; pathPrefix: string };
type UploadResult = { path: string; url: string };

export function useUpload() {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [progress, setProgress] = useState(0);

	const MAX_SIZE = 15 * 1024 * 1024; // 15MB
	const ALLOWED = new Set(['image/jpeg','image/png','image/svg+xml','image/webp','application/pdf']);

	function attach(el: HTMLInputElement) {
		inputRef.current = el;
	}

	async function upload(file: File, opts: UploadOpts): Promise<UploadResult> {
		const isStub = (() => {
			const params = new URLSearchParams(window.location.search);
			// support env flag too
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const env = (import.meta as any)?.env?.VITE_STUB_API;
			return params.get('stub') === '1' || env === 'true' || env === '1';
		})();
		// In stub mode, skip strict validation to ease demos/tests
		if (!isStub) {
			if (file.size > MAX_SIZE) throw new Error('File too large (max 15MB)');
			if (!ALLOWED.has(file.type)) throw new Error('Unsupported file type. Use JPG, PNG, WebP, or PDF.');
		}
		setProgress(20);
		if (isStub) {
			const url = URL.createObjectURL(file);
			await new Promise((r) => setTimeout(r, 200));
			setProgress(100);
			return { path: `${opts.pathPrefix}/${Date.now()}_${sanitize(file.name)}`, url };
		}
		const sb = getSupabaseClient();
		const path = `${opts.pathPrefix}/${Date.now()}_${sanitize(file.name)}`;
		setProgress(50);
		const { error } = await sb.storage.from(opts.bucket).upload(path, file, {
			cacheControl: '3600',
			upsert: true,
			contentType: file.type || 'application/octet-stream',
		});
		if (error) throw new Error(error.message);
		setProgress(80);
		const { data: signed, error: signErr } = await sb.storage.from(opts.bucket).createSignedUrl(path, 3600);
		if (!signErr && signed?.signedUrl) { setProgress(100); return { path, url: signed.signedUrl }; }
		const { data: pub } = sb.storage.from(opts.bucket).getPublicUrl(path);
		setProgress(100);
		return { path, url: pub.publicUrl };
	}

	return { attach, upload, progress };
}

function sanitize(name: string) {
	return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}
