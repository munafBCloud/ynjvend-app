import { useAuth } from './auth/AuthContext'
import { AdminShell } from './components/AdminShell'
import { Login } from './components/Login'
import './App.css'

function App() {
  const {
    authenticated,
    loading,
  } = useAuth()

  if (loading) {
    return (
      <main className="loading-page">
        <div className="brand-mark">D</div>
        <p>Loading DistroDex Management…</p>
      </main>
    )
  }

  return authenticated
    ? <AdminShell />
    : <Login />
}

export default App
