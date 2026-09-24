import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './amplify'
import { AuthProvider } from './auth/AuthContext'
import App from './App'

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
