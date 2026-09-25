import {
  useEffect,
  useState,
} from 'react'
import {
  getCompanies,
  getCompany,
} from '../services/adminApi'
import type { Company } from '../types/company'

function displayBusinessName(company: Company): string {
  return (
    company.businessName ??
    company.companyName ??
    'Unnamed company'
  )
}

function displayDate(value?: string): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function displayValue(value?: string): string {
  return value?.trim() || '—'
}

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null)

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadCompanies() {
      try {
        setLoading(true)
        setError('')

        const response = await getCompanies()

        if (active) {
          setCompanies(response.companies)
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load companies.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadCompanies()

    return () => {
      active = false
    }
  }, [])

  async function openCompany(companyId: string) {
    try {
      setDetailLoading(true)
      setError('')

      const response = await getCompany(companyId)

      setSelectedCompany(response.company)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load company.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  if (selectedCompany) {
    return (
      <section className="companies-view">
        <button
          className="back-button"
          type="button"
          onClick={() => setSelectedCompany(null)}
        >
          ← Back to companies
        </button>

        <div className="company-detail-heading">
          <div>
            <p className="section-eyebrow">Company</p>
            <h1>{displayBusinessName(selectedCompany)}</h1>
          </div>

          <span className="status-pill">
            {displayValue(selectedCompany.status)}
          </span>
        </div>

        <div className="company-detail-grid">
          <article className="detail-card">
            <p className="section-eyebrow">
              Account
            </p>

            <dl className="company-data-list">
              <div>
                <dt>Status</dt>
                <dd>{displayValue(selectedCompany.status)}</dd>
              </div>

              <div>
                <dt>Plan</dt>
                <dd>{displayValue(selectedCompany.plan)}</dd>
              </div>

              <div>
                <dt>Onboarding</dt>
                <dd>
                  {displayValue(
                    selectedCompany.onboardingStatus,
                  )}
                </dd>
              </div>

              <div>
                <dt>Created</dt>
                <dd>
                  {displayDate(selectedCompany.createdAt)}
                </dd>
              </div>

              <div>
                <dt>Updated</dt>
                <dd>
                  {displayDate(selectedCompany.updatedAt)}
                </dd>
              </div>
            </dl>
          </article>

          <article className="detail-card">
            <p className="section-eyebrow">
              Primary contact
            </p>

            <dl className="company-data-list">
              <div>
                <dt>Name</dt>
                <dd>
                  {displayValue(
                    selectedCompany.primaryContactName,
                  )}
                </dd>
              </div>

              <div>
                <dt>Email</dt>
                <dd>
                  {displayValue(
                    selectedCompany.primaryContactEmail,
                  )}
                </dd>
              </div>

              <div>
                <dt>Phone</dt>
                <dd>{displayValue(selectedCompany.phone)}</dd>
              </div>
            </dl>
          </article>

          <article className="detail-card">
            <p className="section-eyebrow">
              System
            </p>

            <dl className="company-data-list">
              <div>
                <dt>Company ID</dt>
                <dd className="system-value">
                  {selectedCompany.companyId}
                </dd>
              </div>

              <div>
                <dt>Beta application</dt>
                <dd className="system-value">
                  {displayValue(
                    selectedCompany.betaApplicationId,
                  )}
                </dd>
              </div>

              <div>
                <dt>Setup completed</dt>
                <dd>
                  {displayDate(
                    selectedCompany.setupCompletedAt,
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="detail-card">
            <p className="section-eyebrow">
              Business address
            </p>

            <dl className="company-data-list">
              <div>
                <dt>Address</dt>
                <dd>
                  {displayValue(selectedCompany.address)}
                </dd>
              </div>

              <div>
                <dt>City</dt>
                <dd>{displayValue(selectedCompany.city)}</dd>
              </div>

              <div>
                <dt>State</dt>
                <dd>{displayValue(selectedCompany.state)}</dd>
              </div>

              <div>
                <dt>Postal code</dt>
                <dd>
                  {displayValue(selectedCompany.postalCode)}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    )
  }

  return (
    <section className="companies-view">
      <div className="companies-heading">
        <div>
          <p className="section-eyebrow">
            Platform tenants
          </p>
          <h1>Companies</h1>
          <p>
            Provisioned DistroDex company accounts.
          </p>
        </div>

        <div className="company-count">
          {companies.length} companies
        </div>
      </div>

      {error && (
        <div className="portal-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="company-loading">
          Loading companies…
        </div>
      ) : companies.length === 0 ? (
        <div className="company-empty">
          No companies found.
        </div>
      ) : (
        <div className="company-table-wrapper">
          <table className="company-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Primary contact</th>
                <th>Status</th>
                <th>Onboarding</th>
                <th>Plan</th>
                <th>Created</th>
                <th aria-label="Open company" />
              </tr>
            </thead>

            <tbody>
              {companies.map((company) => (
                <tr key={company.companyId}>
                  <td>
                    <strong>
                      {displayBusinessName(company)}
                    </strong>
                    <span className="company-id-preview">
                      {company.companyId}
                    </span>
                  </td>

                  <td>
                    <span>
                      {displayValue(
                        company.primaryContactName,
                      )}
                    </span>
                    <span className="company-secondary">
                      {displayValue(
                        company.primaryContactEmail,
                      )}
                    </span>
                  </td>

                  <td>
                    {displayValue(company.status)}
                  </td>

                  <td>
                    {displayValue(
                      company.onboardingStatus,
                    )}
                  </td>

                  <td>
                    {displayValue(company.plan)}
                  </td>

                  <td>
                    {displayDate(company.createdAt)}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="company-open-button"
                      disabled={detailLoading}
                      onClick={() =>
                        void openCompany(company.companyId)
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
