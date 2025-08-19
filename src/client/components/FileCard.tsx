import React from 'react';
import Button from './Button';

type Props = {
	title: string;
	url?: string;
	onPick: () => void;
	onRemove?: () => void;
	busy?: boolean;
};

export default function FileCard({ title, url, onPick, onRemove, busy }: Props) {
	const isPdf = url?.toLowerCase().includes('.pdf');
	return (
		<div className="rounded-2xl bg-white/6 border border-white/10 p-4">
			<div className="flex items-center justify-between">
				<div>
					<div className="text-white font-medium">{title}</div>
					{url ? (
						<div className="text-white/70 text-sm mt-1 break-all">
							{isPdf ? (
								<a className="underline" href={url} target="_blank" rel="noreferrer">View PDF</a>
							) : (
								<a className="underline" href={url} target="_blank" rel="noreferrer">Open</a>
							)}
						</div>
					) : (
						<div className="text-white/50 text-sm mt-1">No file uploaded</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button height="sm" variant="secondary" onClick={onPick} disabled={!!busy}>{url ? 'Replace' : 'Upload'}</Button>
					{url && onRemove && (
						<Button height="sm" variant="secondary" onClick={onRemove}>Remove</Button>
					)}
				</div>
			</div>
			{url && !isPdf && (
				<div className="mt-3">
					<img src={url} alt={title} className="w-full max-h-56 object-cover rounded-xl" />
				</div>
			)}
			{busy && (
				<div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
					<div className="h-full bg-white/60 animate-pulse" style={{ width: '50%' }} />
				</div>
			)}
		</div>
	);
}
