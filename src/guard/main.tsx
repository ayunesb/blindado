import React from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import GuardApp from './GuardApp'

createRoot(document.getElementById('app')!).render(<GuardApp />)
