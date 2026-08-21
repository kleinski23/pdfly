import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are self-hosted: the app makes no third-party requests, ever.
import '@fontsource/bangers/400.css'
import '@fontsource-variable/archivo'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
