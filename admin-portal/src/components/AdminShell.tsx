import { useAuth } from '../auth/AuthContext'
import { ApplicationQueue } from './ApplicationQueue'

export function AdminShell() {
  const { email, logout } = useAuth()

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="brand-mark small">D</div>

            <div>
              <strong>DistroDex</strong>
              <span>Platform Admin</span>
            </div>
          </div>

          <nav>
            <button className="nav-item active">
              Applications
            </button>
          </nav>
        </div>

        <div className="sidebar-user">
          <span>Signed in as</span>
          <strong>{email}</strong>

          <button
            className="sign-out"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <ApplicationQueue />
      </main>
    </div>
  )
}
