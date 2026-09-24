import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getBetaApplications } from '../services/adminApi'
import { ApplicationDetail } from './ApplicationDetail'
import type {
  BetaApplication,
} from '../types/betaApplication'

function formatDate(value?: string) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(date)
}

function statusLabel(status?: string) {
  if (!status) {
    return 'Unknown'
  }

  return status
    .split(/[-_]/)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ')
}

export function ApplicationQueue() {
  const [applications, setApplications] = useState<
    BetaApplication[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string | null>(null)

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getBetaApplications()
      setApplications(data.applications ?? [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load applications.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadApplications()
  }, [loadApplications])

  const counts = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter(
        (application) =>
          application.status === 'submitted',
      ).length,
      provisioned: applications.filter(
        (application) =>
          application.status === 'provisioned',
      ).length,
    }
  }, [applications])

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            FOUNDING BETA
          </p>
          <h2>Applications</h2>
          <p>
            Review incoming businesses and monitor
            onboarding status.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={() => void loadApplications()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Total</span>
          <strong>{counts.total}</strong>
        </article>

        <article className="metric-card">
          <span>Awaiting review</span>
          <strong>{counts.submitted}</strong>
        </article>

        <article className="metric-card">
          <span>Provisioned</span>
          <strong>{counts.provisioned}</strong>
        </article>
      </section>

      <section className="table-card">
        <div className="table-heading">
          <div>
            <h3>Application queue</h3>
            <p>
              Newest applications appear first.
            </p>
          </div>
        </div>

        {error && (
          <div className="error-message table-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            Loading applications…
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            No beta applications found.
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Company</th>
                </tr>
              </thead>

              <tbody>
                {applications.map((application) => (
                  <tr
                    key={application.applicationId}
                    className="application-row"
                    tabIndex={0}
                    role="button"
                    onClick={() =>
                      setSelectedApplicationId(
                        application.applicationId,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' ||
                        event.key === ' '
                      ) {
                        event.preventDefault()
                        setSelectedApplicationId(
                          application.applicationId,
                        )
                      }
                    }}
                  >
                    <td>
                      <strong>
                        {application.businessName ||
                          'Unnamed business'}
                      </strong>
                      <span className="table-secondary">
                        {application.email || '—'}
                      </span>
                    </td>

                    <td>
                      {application.contactName || '—'}
                    </td>

                    <td>
                      {formatDate(
                        application.submittedAt,
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${application.status || 'unknown'}`}
                      >
                        {statusLabel(
                          application.status,
                        )}
                      </span>
                    </td>

                    <td className="company-id">
                      {application.companyId || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedApplicationId && (
        <ApplicationDetail
          applicationId={selectedApplicationId}
          onClose={() =>
            setSelectedApplicationId(null)
          }
          onApplicationChanged={loadApplications}
        />
      )}
    </>
  )
}
