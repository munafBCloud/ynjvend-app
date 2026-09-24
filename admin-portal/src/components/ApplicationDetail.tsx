import {
  useEffect,
  useState,
} from 'react'
import {
  approveBetaApplication,
  getBetaApplication,
} from '../services/adminApi'
import type {
  BetaApplication,
} from '../types/betaApplication'

interface ApplicationDetailProps {
  applicationId: string
  onClose: () => void
  onApplicationChanged: () => Promise<void>
}

function display(value?: string) {
  return value?.trim() || '—'
}

function formatDateTime(value?: string) {
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
      dateStyle: 'medium',
      timeStyle: 'short',
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

export function ApplicationDetail({
  applicationId,
  onClose,
  onApplicationChanged,
}: ApplicationDetailProps) {
  const [application, setApplication] =
    useState<BetaApplication | null>(null)

  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirming, setConfirming] =
    useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const result =
          await getBetaApplication(applicationId)

        if (active) {
          setApplication(result)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load application.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [applicationId])

  async function handleApprove() {
    if (
      !application ||
      approving ||
      application.status !== 'submitted'
    ) {
      return
    }

    setApproving(true)
    setError('')
    setSuccess('')

    try {
      const result =
        await approveBetaApplication(
          application.applicationId,
        )

      setApplication(result.application)
      setSuccess(result.message)
      setConfirming(false)

      await onApplicationChanged()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to approve application.',
      )
    } finally {
      setApproving(false)
    }
  }

  const canApprove =
    application?.status === 'submitted'

  return (
    <div
      className="detail-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !approving
        ) {
          onClose()
        }
      }}
    >
      <section
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-detail-title"
      >
        <div className="detail-header">
          <div>
            <p className="detail-eyebrow">
              BETA APPLICATION
            </p>

            <h3 id="application-detail-title">
              {application?.businessName ||
                'Application details'}
            </h3>

            {application && (
              <span
                className={`status-badge status-${application.status || 'unknown'}`}
              >
                {statusLabel(application.status)}
              </span>
            )}
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
            disabled={approving}
            aria-label="Close application details"
          >
            ×
          </button>
        </div>

        <div className="detail-body">
          {loading ? (
            <div className="detail-loading">
              Loading application…
            </div>
          ) : error && !application ? (
            <div className="error-message">
              {error}
            </div>
          ) : application ? (
            <>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message">
                  {success}
                </div>
              )}

              <section className="detail-section">
                <h4>Business</h4>

                <div className="detail-grid">
                  <div>
                    <span>Business name</span>
                    <strong>
                      {display(
                        application.businessName,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Distribution type</span>
                    <strong>
                      {display(
                        application.distributionType,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>SKU range</span>
                    <strong>
                      {display(application.skuRange)}
                    </strong>
                  </div>

                  <div>
                    <span>Team size</span>
                    <strong>
                      {display(application.teamSize)}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h4>Contact</h4>

                <div className="detail-grid">
                  <div>
                    <span>Name</span>
                    <strong>
                      {display(
                        application.contactName,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>
                      {display(application.email)}
                    </strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>
                      {display(application.phone)}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h4>Current operation</h4>

                <div className="detail-grid one-column">
                  <div>
                    <span>Current system</span>
                    <strong>
                      {display(
                        application.currentSystem,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Biggest problem</span>
                    <strong>
                      {display(
                        application.biggestProblem,
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h4>Onboarding</h4>

                <div className="detail-grid">
                  <div>
                    <span>Application ID</span>
                    <strong className="mono-value">
                      {application.applicationId}
                    </strong>
                  </div>

                  <div>
                    <span>Submitted</span>
                    <strong>
                      {formatDateTime(
                        application.submittedAt,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Company ID</span>
                    <strong className="mono-value">
                      {display(
                        application.companyId,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Provisioned</span>
                    <strong>
                      {formatDateTime(
                        application.provisionedAt,
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>

        {application && (
          <div className="detail-footer">
            {canApprove ? (
              confirming ? (
                <div className="approval-confirmation">
                  <div>
                    <strong>
                      Approve this business?
                    </strong>

                    <span>
                      This will provision the company
                      and owner account.
                    </span>
                  </div>

                  <div className="confirmation-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={approving}
                      onClick={() =>
                        setConfirming(false)
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={approving}
                      onClick={() =>
                        void handleApprove()
                      }
                    >
                      {approving
                        ? 'Provisioning…'
                        : 'Confirm approval'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="footer-note">
                    Review the application before
                    provisioning access.
                  </span>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                      setConfirming(true)
                    }
                  >
                    Approve application
                  </button>
                </>
              )
            ) : (
              <span className="footer-note">
                {application.status === 'provisioned'
                  ? 'This application has already been provisioned.'
                  : `No approval action is available while status is "${statusLabel(application.status)}".`}
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
