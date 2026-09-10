const effectiveDate = "September 10, 2026";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="section-shell legal-header-inner">
          <a className="brand" href="/" aria-label="Distro'Dex home">
            <div className="brand-mark">
              <span>D</span>
            </div>

            <div className="brand-copy">
              <strong>DISTRO'DEX</strong>
              <span>DISTRIBUTION OS</span>
            </div>
          </a>

          <a className="legal-back-link" href="/">
            ← Back to Distro'Dex
          </a>
        </div>
      </header>

      <section className="section-shell legal-content">
        <div className="legal-intro">
          <p className="section-kicker">PRIVACY</p>

          <h1>Privacy Policy</h1>

          <p className="legal-effective-date">
            Effective date: {effectiveDate}
          </p>

          <p>
            This Privacy Policy explains how Distro'Dex collects, uses, and
            protects information submitted through distrodexapp.com and the
            Distro'Dex Founding Beta application process.
          </p>
        </div>

        <div className="legal-sections">
          <section>
            <span className="legal-section-number">01</span>
            <div>
              <h2>Information we collect</h2>

              <p>
                When you submit a Founding Beta application, we may collect
                information you provide directly to us, including:
              </p>

              <ul>
                <li>Business name</li>
                <li>Contact name</li>
                <li>Email address</li>
                <li>Phone number, when provided</li>
                <li>Distribution or business type</li>
                <li>Approximate SKU range</li>
                <li>Approximate team size</li>
                <li>Current operational systems or tools</li>
                <li>Business challenges and workflow information</li>
                <li>Additional notes you choose to submit</li>
              </ul>

              <p>
                We also create operational information associated with a beta
                application, such as an application identifier, submission
                status, and submission timestamp.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">02</span>
            <div>
              <h2>How we use information</h2>

              <p>We use submitted information to:</p>

              <ul>
                <li>Review and evaluate Founding Beta applications</li>
                <li>Contact prospective beta participants when appropriate</li>
                <li>Understand distributor workflows and operational needs</li>
                <li>Improve and develop Distro'Dex features</li>
                <li>Operate, secure, troubleshoot, and protect the service</li>
                <li>Maintain records relating to the beta program</li>
              </ul>

              <p>
                We do not currently use the Founding Beta application form to
                sell advertising or create advertising profiles.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">03</span>
            <div>
              <h2>Service providers and infrastructure</h2>

              <p>
                Distro'Dex uses third-party infrastructure and service
                providers to operate the website and application workflow.
                These providers may process information as necessary to host,
                transmit, secure, store, or deliver the service.
              </p>

              <p>
                Distro'Dex currently uses Amazon Web Services infrastructure
                for website delivery, application processing, data storage,
                and internal email notifications.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">04</span>
            <div>
              <h2>Data retention</h2>

              <p>
                We retain beta application information for as long as it is
                reasonably useful for evaluating the beta program, developing
                Distro'Dex, maintaining business records, or meeting legal and
                security requirements.
              </p>

              <p>
                We may delete information when it is no longer reasonably
                needed for those purposes.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">05</span>
            <div>
              <h2>Data security</h2>

              <p>
                We use administrative and technical safeguards intended to
                protect information handled by Distro'Dex. No internet-based
                system can guarantee absolute security, and users should avoid
                submitting unnecessary sensitive information through the
                Founding Beta form.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">06</span>
            <div>
              <h2>Your choices</h2>

              <p>
                You may choose not to submit a Founding Beta application. If
                you have already submitted information and want to request
                correction or deletion, you may contact Distro'Dex using the
                contact method published on the website.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">07</span>
            <div>
              <h2>Children's privacy</h2>

              <p>
                Distro'Dex is a business software service intended for
                businesses and working professionals. It is not directed to
                children.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">08</span>
            <div>
              <h2>Changes to this policy</h2>

              <p>
                We may update this Privacy Policy as Distro'Dex develops. When
                we make changes, we will update the effective date shown at the
                top of this page.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">09</span>
            <div>
              <h2>Contact</h2>

              <p>
                Questions about this Privacy Policy or information submitted
                to Distro'Dex may be directed to us through the contact method
                published on distrodexapp.com.
              </p>
            </div>
          </section>
        </div>
      </section>

      <footer className="legal-footer">
        <div className="section-shell legal-footer-inner">
          <span>© 2026 Distro'Dex. All rights reserved.</span>

          <div>
            <a href="/">Home</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
