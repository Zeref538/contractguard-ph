import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { IconContext } from '@phosphor-icons/react'
import { AuthProvider } from './lib/auth'
import { App } from './app'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </IconContext.Provider>
  </StrictMode>
)
