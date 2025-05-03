import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Tracking from './Tracking.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Tracking />
  </StrictMode>,
)
