const operationalAreas = [
  "Inventory",
  "Customers",
  "Orders",
  "Invoices",
];

const dashboardStats = [
  {
    label: "Inventory Items",
    value: "1,248",
    detail: "+32 received today",
  },
  {
    label: "Orders Today",
    value: "24",
    detail: "8 ready to fulfill",
  },
  {
    label: "Open Invoices",
    value: "$8,420",
    detail: "12 active invoices",
  },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Distro'Dex home">
          <div className="brand-mark">
            <span>D</span>
          </div>

          <div className="brand-copy">
            <strong>DISTRO'DEX</strong>
            <span>DISTRIBUTION OS</span>
          </div>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#barcode">Barcode Receiving</a>
          <a href="#beta">Founding Beta</a>
          <a href="#login">Log In</a>
        </nav>

        <a className="header-cta" href="#beta">
          Apply for Beta
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            Built for independent distributors
          </p>

          <h1>
            Outgrown spreadsheets.
            <span> Not ready for an ERP?</span>
          </h1>

          <p className="hero-description">
            Distro'Dex brings inventory, customers, orders, and
            invoices together in one streamlined operations
            platform built for growing distributors.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#beta">
              Apply for Beta Access
            </a>

            <a className="button button-secondary" href="#product">
              See How It Works
            </a>
          </div>

          <div className="operational-areas">
            {operationalAreas.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>
        </div>

        <div className="product-preview" id="product">
          <div className="preview-window">
            <div className="preview-topbar">
              <div>
                <span className="preview-kicker">DISTRO'DEX</span>
                <strong>Operations Overview</strong>
              </div>

              <span className="live-status">
                <i />
                Live
              </span>
            </div>

            <div className="preview-stats">
              {dashboardStats.map((stat) => (
                <article className="preview-card" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.detail}</small>
                </article>
              ))}
            </div>

            <div className="preview-lower">
              <div className="activity-panel">
                <div className="panel-heading">
                  <strong>Recent Activity</strong>
                  <span>Today</span>
                </div>

                <div className="activity-row">
                  <i />
                  <div>
                    <strong>Inventory received</strong>
                    <span>48 units added to inventory</span>
                  </div>
                  <time>9:41 AM</time>
                </div>

                <div className="activity-row">
                  <i />
                  <div>
                    <strong>Order completed</strong>
                    <span>ORD-10234</span>
                  </div>
                  <time>8:52 AM</time>
                </div>

                <div className="activity-row">
                  <i />
                  <div>
                    <strong>Invoice generated</strong>
                    <span>INV-20311</span>
                  </div>
                  <time>8:37 AM</time>
                </div>
              </div>

              <div className="scan-panel" id="barcode">
                <span className="scan-label">Barcode Receiving</span>

                <div className="barcode">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <strong>Ready to scan</strong>
                <small>Receive inventory without manual entry.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="hero-footer">
        <span>One system.</span>
        <strong>From receiving to invoice.</strong>
      </div>

      <div id="beta" className="section-anchor" />
      <div id="login" className="section-anchor" />
    </main>
  );
}
