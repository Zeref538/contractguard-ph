import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './lib/auth'
import { App } from './app'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
