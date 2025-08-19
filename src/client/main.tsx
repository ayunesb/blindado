import React from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import App from './App'

const root = createRoot(document.getElementById('app')!)
const params = new URLSearchParams(location.search)
const sb = params.get('sb') || ''
// Optional Sentry
if ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SENTRY_DSN) {
	// Dynamic import to avoid bundling unless configured
	import('@sentry/browser')
		.then((Sentry: typeof import('@sentry/browser')) => {
			Sentry.init({
				dsn: (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SENTRY_DSN,
				tracesSampleRate: 0.2,
			});
		})
		.catch(() => {
			/* ignore */
		});
}
root.render(<App sb={sb} />)
