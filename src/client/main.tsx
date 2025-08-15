import React from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import App from './App'

const root = createRoot(document.getElementById('app')!)
const params = new URLSearchParams(location.search)
const anon = params.get('anon') || ''
const sb = params.get('sb') || ''
root.render(<App anon={anon} sb={sb} />)
