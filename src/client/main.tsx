import React from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import App from './App'
// Optional Sentry (gated by VITE_SENTRY_DSN). Uses dynamic import to avoid bundling if not set.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const DSN = (import.meta as any)?.env?.VITE_SENTRY_DSN as string | undefined
				if (DSN) {
					// dynamic import via Function to avoid TS resolving module at build time
					// eslint-disable-next-line @typescript-eslint/no-implied-eval
					const importer = Function('return import')() as Promise<any>
					const mod = await importer.then((fn: any) => fn('@sentry/browser')).catch(() => null)
					mod?.init?.({ dsn: DSN, tracesSampleRate: 0.1 })
				}
		} catch {}
})()

const root = createRoot(document.getElementById('app')!)
const params = new URLSearchParams(location.search)
const sb = params.get('sb') || ''
root.render(<App sb={sb} />)
