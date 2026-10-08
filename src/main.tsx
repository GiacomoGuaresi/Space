import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './index.css'
import { App } from './ui/App'
import { ConAccesso } from './ui/ConAccesso'

const radice = document.getElementById('root')
if (!radice) throw new Error('Manca #root in index.html')

createRoot(radice).render(
  <StrictMode>
    <ConAccesso>
      <App />
    </ConAccesso>
  </StrictMode>,
)
