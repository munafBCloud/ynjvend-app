import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ApplicationQueue } from './ApplicationQueue'
import { Companies } from './Companies'

type AdminView =
  | 'applications'
  | 'companies'

export function AdminShell() {
  const { email, logout } = useAuth()
  const [activeView, setActiveView] =
    useState<AdminView>('applications')

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
            <button
              type="button"
              className={
                activeView === 'applications'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                setActiveView('applications')
              }
            >
              Applications
            </button>

            <button
              type="button"
              className={
                activeView === 'companies'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                setActiveView('companies')
              }
            >
              Companies
            </button>
          </nav>
        </div>

        <div className="sidebar-user">
          <span>Signed in as</span>
          <strong>{email}</strong>

          <button
            type="button"
            className="sign-out"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-content">
        {activeView === 'applications'
          ? <ApplicationQueue />
          : <Companies />}
      </main>
    </div>
  )
}
