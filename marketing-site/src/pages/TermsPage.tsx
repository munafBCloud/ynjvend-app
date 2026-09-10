const effectiveDate = "September 10, 2026";

export default function TermsPage() {
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
          <p className="section-kicker">FOUNDING BETA</p>

          <h1>Terms of Use</h1>

          <p className="legal-effective-date">
            Effective date: {effectiveDate}
          </p>

          <p>
            These Terms apply to use of the Distro'Dex website and
            participation in the Distro'Dex Founding Beta program.
          </p>
        </div>

        <div className="legal-sections">
          <section>
            <span className="legal-section-number">01</span>
            <div>
              <h2>Founding Beta applications</h2>

              <p>
                Submitting a Founding Beta application does not guarantee
                acceptance, access, availability, pricing, or participation in
                the beta program.
              </p>

              <p>
                Distro'Dex may determine the size, timing, eligibility, and
                composition of the Founding Beta program.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">02</span>
            <div>
              <h2>Beta software</h2>

              <p>
                Distro'Dex is under active development. Beta features may be
                incomplete, changed, suspended, replaced, or removed as the
                product evolves.
              </p>

              <p>
                Beta functionality may contain errors or experience
                interruptions and should not be treated as the sole system of
                record for critical business operations unless Distro'Dex
                expressly states otherwise.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">03</span>
            <div>
              <h2>Acceptable use</h2>

              <p>You agree not to use Distro'Dex to:</p>

              <ul>
                <li>Violate applicable laws or regulations</li>
                <li>Attempt unauthorized access to systems or accounts</li>
                <li>Interfere with or disrupt the service</li>
                <li>Introduce malicious code or automated abuse</li>
                <li>Misrepresent your identity or authority</li>
                <li>Use the service to infringe the rights of others</li>
              </ul>
            </div>
          </section>

          <section>
            <span className="legal-section-number">04</span>
            <div>
              <h2>Business information and data</h2>

              <p>
                You are responsible for information you submit to Distro'Dex
                and for ensuring you have appropriate authority to provide
                business, customer, inventory, or operational information used
                during beta participation.
              </p>

              <p>
                During the beta period, you should maintain appropriate copies
                or backups of information necessary to operate your business.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">05</span>
            <div>
              <h2>Feedback</h2>

              <p>
                Founding Beta participants may provide suggestions, workflow
                observations, feature requests, or other feedback about
                Distro'Dex.
              </p>

              <p>
                You permit Distro'Dex to use that feedback to evaluate,
                improve, develop, and commercialize the product without an
                obligation to implement a particular suggestion.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">06</span>
            <div>
              <h2>Ownership</h2>

              <p>
                Distro'Dex and its software, interfaces, branding, design,
                documentation, and related materials remain the property of
                their respective owners. Participation in the beta does not
                transfer ownership of Distro'Dex technology or intellectual
                property.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">07</span>
            <div>
              <h2>Availability</h2>

              <p>
                We may modify, pause, restrict, or discontinue portions of the
                website or Founding Beta program as needed for development,
                maintenance, security, operational, or business reasons.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">08</span>
            <div>
              <h2>No warranties during beta</h2>

              <p>
                To the extent permitted by applicable law, beta access is
                provided on an "as available" basis without guarantees that
                every feature will be uninterrupted, error-free, or suitable
                for every business workflow.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">09</span>
            <div>
              <h2>Limitation of responsibility</h2>

              <p>
                To the extent permitted by applicable law, Distro'Dex is not
                responsible for indirect or consequential losses arising from
                reliance on experimental beta functionality.
              </p>

              <p>
                Nothing in these Terms limits rights or remedies that cannot
                lawfully be limited.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">10</span>
            <div>
              <h2>Termination of beta access</h2>

              <p>
                Distro'Dex may end or suspend beta access, including where
                necessary to protect the service, other users, or the integrity
                of the beta program.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">11</span>
            <div>
              <h2>Changes to these Terms</h2>

              <p>
                These Terms may change as Distro'Dex develops. The effective
                date at the top of this page will be updated when revised
                Terms are published.
              </p>
            </div>
          </section>

          <section>
            <span className="legal-section-number">12</span>
            <div>
              <h2>Contact</h2>

              <p>
                Questions regarding these Terms may be directed to Distro'Dex
                using the contact method published on distrodexapp.com.
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
