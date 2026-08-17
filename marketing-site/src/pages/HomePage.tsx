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

const problems = [
  {
    number: "01",
    title: "Inventory lives in spreadsheets",
    description:
      "Stock counts, receiving, and adjustments become harder to trust as the business grows.",
    visual: "spreadsheet",
    risk: "Inaccurate stock decisions",
  },
  {
    number: "02",
    title: "Customer data is disconnected",
    description:
      "Accounts, contacts, order history, and notes end up scattered across different systems.",
    visual: "customer",
    risk: "Poor customer visibility",
  },
  {
    number: "03",
    title: "Orders require too much manual work",
    description:
      "Re-entering products, pricing, customer details, and fulfillment updates slows the entire operation.",
    visual: "manual",
    risk: "Delays and fulfillment errors",
  },
  {
    number: "04",
    title: "Enterprise ERPs are too much",
    description:
      "Complex deployments, unnecessary modules, and high costs make traditional ERP software a poor fit.",
    visual: "erp",
    risk: "Wasted time and money",
  },
];

const productFeatures = [
  {
    code: "INV",
    title: "Inventory",
    description:
      "Know what you have, what is moving, and what needs attention from one operational inventory system.",
    detail: "Stock visibility · Receiving · Adjustments",
  },
  {
    code: "CRM",
    title: "Customers",
    description:
      "Keep business accounts, contacts, addresses, and transaction history connected to the work you do.",
    detail: "Accounts · Contacts · Order history",
  },
  {
    code: "ORD",
    title: "Orders",
    description:
      "Build orders from live inventory and move them through a clear fulfillment workflow.",
    detail: "Pricing · Fulfillment · Status tracking",
  },
  {
    code: "INV",
    title: "Invoices",
    description:
      "Turn completed orders into invoices without rebuilding the transaction in another application.",
    detail: "Order-linked · Traceable · Centralized",
  },
];

const workflow = [
  {
    number: "01",
    title: "Receive",
    description: "Scan or enter incoming product.",
  },
  {
    number: "02",
    title: "Inventory",
    description: "Stock becomes operational inventory.",
  },
  {
    number: "03",
    title: "Customer",
    description: "Connect the transaction to an account.",
  },
  {
    number: "04",
    title: "Order",
    description: "Build the order from available stock.",
  },
  {
    number: "05",
    title: "Fulfill",
    description: "Move it through fulfillment.",
  },
  {
    number: "06",
    title: "Invoice",
    description: "Generate the financial record.",
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
          <a href="#workflow">Workflow</a>
          <a href="#beta">Founding Beta</a>
        </nav>

        <a className="header-cta" href="#beta">
          Apply for Beta
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Built for independent distributors</p>

          <h1>
            Outgrown spreadsheets.
            <span> Not ready for an ERP?</span>
          </h1>

          <p className="hero-description">
            Distro'Dex brings inventory, customers, orders, and invoices
            together in one streamlined operations platform built for growing
            distributors.
          </p>

          <div className="hero-actions">
            <a className="button button-primary animated-cta" href="#beta">
              <span>Apply for Beta Access</span>
              <i aria-hidden="true">→</i>
            </a>

            <a className="button button-secondary secondary-motion" href="#product">
              <span>See How It Works</span>
              <i aria-hidden="true">↓</i>
            </a>
          </div>

          <div className="operational-areas">
            {operationalAreas.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>

          <div className="system-status" aria-label="Platform status preview">
            <span className="status-dot" />
            <span>Operational workflow connected</span>
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
                  <div className="preview-card-header">
                    <span>{stat.label}</span>
                    <i />
                  </div>
                  <strong>{stat.value}</strong>
                  <small>{stat.detail}</small>
                  <div className="metric-rail">
                    <span />
                  </div>
                </article>
              ))}
            </div>

            <div className="preview-lower">
              <div className="activity-panel">
                <div className="panel-heading">
                  <strong>Live Operations</strong>
                  <span>Today</span>
                </div>

                <div className="activity-row activity-row-active">
                  <i />
                  <div>
                    <strong>Inbound shipment received</strong>
                    <span>48 units · Dock 02</span>
                  </div>
                  <time>9:41 AM</time>
                </div>

                <div className="activity-row">
                  <i />
                  <div>
                    <strong>Order moved to fulfillment</strong>
                    <span>ORD-10234 · 6 line items</span>
                  </div>
                  <time>8:52 AM</time>
                </div>

                <div className="activity-row">
                  <i />
                  <div>
                    <strong>Invoice generated</strong>
                    <span>INV-20311 · $1,284.00</span>
                  </div>
                  <time>8:37 AM</time>
                </div>

                <div className="stock-health">
                  <div className="stock-health-heading">
                    <span>Stock health</span>
                    <strong>92%</strong>
                  </div>

                  <div className="stock-health-bar">
                    <span />
                  </div>

                  <small>37 SKUs healthy · 3 low stock</small>
                </div>
              </div>

              <div className="scan-panel scan-panel-enhanced">
                <div className="scan-panel-heading">
                  <span className="scan-label">Inbound Receiving</span>
                  <span className="scan-live">
                    <i />
                    LIVE
                  </span>
                </div>

                <div className="mini-pallet" aria-hidden="true">
                  <div className="pallet-box pallet-box-a" />
                  <div className="pallet-box pallet-box-b" />
                  <div className="pallet-box pallet-box-c" />
                  <div className="pallet-base" />
                  <div className="pallet-scan-line" />
                </div>

                <strong>Shipment identified</strong>
                <small>SKU matched from barcode scan.</small>

                <div className="receiving-meta">
                  <div>
                    <span>SKU</span>
                    <strong>DDX-1842</strong>
                  </div>

                  <div>
                    <span>Qty</span>
                    <strong>24</strong>
                  </div>
                </div>

                <div className="receiving-progress">
                  <span />
                </div>

                <div className="receiving-status">
                  <span>Receiving into inventory</span>
                  <strong>76%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="hero-footer">
        <span>One system.</span>
        <strong>From receiving to invoice.</strong>
      </div>

      <section className="problem-section section-shell">
        <div className="section-intro">
          <p className="section-kicker">THE GAP BETWEEN SPREADSHEETS AND ERP</p>

          <h2>
            Distribution gets complicated
            <span> before software gets useful.</span>
          </h2>

          <p>
            Growing distributors need more control than spreadsheets provide
            without the overhead of implementing a traditional enterprise
            system.
          </p>
        </div>

        <div className="problem-grid">
          {problems.map((problem) => (
            <article className="problem-card" key={problem.number}>
              <div className="problem-card-top">
                <span className="problem-number">{problem.number}</span>
                <span className="problem-impact">OPERATIONAL FRICTION</span>
              </div>

              <div
                className={`problem-visual problem-visual-${problem.visual}`}
                aria-hidden="true"
              >
                {problem.visual === "spreadsheet" && (
                  <>
                    <div className="spreadsheet-sheet">
                      <span className="spreadsheet-x">X</span>

                      <div className="spreadsheet-header">
                        <span>SKU</span>
                        <span>On Hand</span>
                        <span>Received</span>
                      </div>

                      <div className="spreadsheet-row">
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="spreadsheet-row">
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="spreadsheet-row">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>

                    <div className="spreadsheet-warning">!</div>
                  </>
                )}

                {problem.visual === "customer" && (
                  <div className="customer-map">
                    <span className="customer-node customer-node-a">
                      Customers
                    </span>
                    <span className="customer-node customer-node-b">
                      Accounts
                    </span>
                    <span className="customer-node customer-node-c">
                      Orders
                    </span>
                    <span className="customer-node customer-node-d">
                      Notes
                    </span>

                    <i className="customer-line customer-line-1" />
                    <i className="customer-line customer-line-2" />
                    <i className="customer-line customer-line-3" />
                    <i className="customer-line customer-line-4" />
                  </div>
                )}

                {problem.visual === "manual" && (
                  <div className="manual-flow">
                    <span>Enter Items</span>
                    <i />
                    <span>Pricing</span>
                    <i />
                    <span>Customer Details</span>
                    <i />
                    <span>Fulfillment Update</span>
                  </div>
                )}

                {problem.visual === "erp" && (
                  <div className="erp-stack">
                    <div className="erp-server">
                      <i />
                      <i />
                      <span />
                    </div>
                    <div className="erp-server">
                      <i />
                      <i />
                      <span />
                    </div>
                    <div className="erp-server">
                      <i />
                      <i />
                      <span />
                    </div>

                    <div className="erp-list">
                      <span>Complex to deploy</span>
                      <span>Unnecessary modules</span>
                      <span>High costs</span>
                    </div>
                  </div>
                )}
              </div>

              <h3>{problem.title}</h3>
              <p>{problem.description}</p>

              <div className="problem-risk">
                <span className="problem-risk-icon">!</span>
                <strong>Risk:</strong>
                <span>{problem.risk}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="operations-strip" aria-label="Distribution operations flow">
        <div className="section-shell operations-strip-inner">
          <div className="operations-track">
            <div className="operations-node">
              <span className="operations-icon">01</span>
              <div>
                <strong>Receiving Dock</strong>
                <small>Inbound product</small>
              </div>
            </div>

            <div className="operations-route">
              <span />
              <i />
            </div>

            <div className="operations-node">
              <span className="operations-icon">02</span>
              <div>
                <strong>Warehouse Stock</strong>
                <small>Live inventory</small>
              </div>
            </div>

            <div className="operations-route">
              <span />
              <i />
            </div>

            <div className="operations-node">
              <span className="operations-icon">03</span>
              <div>
                <strong>Customer Order</strong>
                <small>Fulfillment ready</small>
              </div>
            </div>

            <div className="operations-route">
              <span />
              <i />
            </div>

            <div className="operations-node">
              <span className="operations-icon operations-icon-final">04</span>
              <div>
                <strong>Invoice</strong>
                <small>Transaction complete</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-section">
        <div className="section-shell">
          <div className="section-intro section-intro-wide">
            <p className="section-kicker">ONE OPERATING SYSTEM</p>

            <h2>
              The core of your distribution operation.
              <span> Connected.</span>
            </h2>

            <p>
              Distro'Dex is designed around the daily operational loop of an
              independent distributor instead of forcing that workflow into
              unrelated software.
            </p>
          </div>

          <div className="feature-grid">
            {productFeatures.map((feature, index) => (
              <article className="feature-card" key={`${feature.title}-${index}`}>
                <div className="feature-accent-line" />
                <div className="feature-card-top">
                  <span className="feature-code">{feature.code}</span>
                  <span className="feature-index">0{index + 1}</span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <small>{feature.detail}</small>

                <div className="module-status">
                  <span className="module-status-dot" />
                  <span>Connected module</span>
                </div>

                <div className="feature-signal">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="barcode-section section-shell" id="barcode">
        <div className="barcode-copy">
          <p className="section-kicker">BARCODE-ASSISTED RECEIVING</p>

          <h2>
            Scan.
            <br />
            Receive.
            <br />
            <span>Move.</span>
          </h2>

          <p>
            Incoming inventory should not begin with repetitive manual entry.
            Distro'Dex is being built to let distributors identify products,
            confirm quantities, and move received goods directly into
            operational inventory.
          </p>

          <div className="barcode-benefits">
            <span>Faster receiving</span>
            <span>Fewer entry errors</span>
            <span>Live inventory updates</span>
          </div>
        </div>

        <div className="scanner-visual" aria-hidden="true">
          <div className="scanner-device">
            <div className="scanner-side-label">
              <span>RECEIVING</span>
              <i />
              <span>LIVE</span>
            </div>
            <div className="scanner-topbar">
              <span>DISTRO'DEX MOBILE</span>
              <i />
            </div>

            <div className="scanner-camera">
              <div className="scan-corner scan-corner-tl" />
              <div className="scan-corner scan-corner-tr" />
              <div className="scan-corner scan-corner-bl" />
              <div className="scan-corner scan-corner-br" />

              <div className="scan-line" />

              <div className="package-box">
                <div className="package-label">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="scanner-result">
              <span className="scanner-status">
                <i />
                PRODUCT FOUND
              </span>

              <strong>Inventory item identified</strong>
              <small>Confirm quantity to receive into inventory.</small>

              <div className="quantity-row">
                <span>Quantity</span>
                <strong>24</strong>
              </div>

              <div className="receive-button">RECEIVE INVENTORY</div>
            </div>
          </div>
        </div>
      </section>

      <section className="distribution-section">
        <div className="section-shell distribution-inner">
          <div>
            <p className="section-kicker">BUILT FOR INDEPENDENT DISTRIBUTION</p>

            <h2>
              Operational software without
              <span> enterprise overhead.</span>
            </h2>
          </div>

          <div className="distribution-copy">
            <p>
              Distro'Dex is focused on distributors that have real operational
              complexity but do not need a massive ERP implementation just to
              gain control of their business.
            </p>

            <div className="distribution-tags">
              <span>Local distribution</span>
              <span>Wholesale operations</span>
              <span>Multi-user teams</span>
              <span>Growing catalogs</span>
              <span>Repeat customers</span>
              <span>Mobile workflows</span>
            </div>
          </div>
        </div>
      </section>

      <section className="workflow-section section-shell" id="workflow">
        <div className="section-intro section-intro-wide">
          <p className="section-kicker">FROM RECEIVING TO REVENUE</p>

          <h2>
            One operational flow.
            <span> No disconnected handoffs.</span>
          </h2>
        </div>

        <div className="workflow-grid">
          {workflow.map((step, index) => (
            <article className="workflow-step" key={step.number}>
              <div className="workflow-heading">
                <span>{step.number}</span>
                {index < workflow.length - 1 && <i />}
              </div>

              <div className="workflow-status">
                <span className={`workflow-status-dot workflow-status-${index}`} />
                <small>
                  {index === 0 && "Inbound"}
                  {index === 1 && "Available"}
                  {index === 2 && "Account linked"}
                  {index === 3 && "In process"}
                  {index === 4 && "Ready"}
                  {index === 5 && "Complete"}
                </small>
              </div>

              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beta-section" id="beta">
        <div className="beta-glow" />

        <div className="section-shell beta-inner">
          <div className="beta-status">
            <span className="beta-status-dot" />
            <span>Founding beta applications open</span>
          </div>

          <p className="section-kicker">FOUNDING BETA</p>

          <h2>
            Help shape the operating system
            <span> independent distributors actually need.</span>
          </h2>

          <p>
            Distro'Dex is being built with a focused group of early
            distributors. Founding beta members will help validate workflows
            across inventory, customers, orders, invoices, and receiving.
          </p>

          <div className="beta-value-grid">
            <article className="beta-value-card">
              <div className="beta-card-heading">
                <span className="beta-card-number">01</span>

                <div className="beta-card-copy">
                  <strong>Early platform access</strong>
                  <small>Use core Distro'Dex workflows before public launch.</small>
                </div>
              </div>

              <div className="beta-card-graphic beta-access-graphic" aria-hidden="true">
                <div className="beta-app-window">
                  <div className="beta-app-topbar">
                    <i />
                    <i />
                    <i />
                  </div>

                  <div className="beta-app-body">
                    <div className="beta-app-sidebar">
                      <span className="beta-cube-icon" />
                      <i />
                      <i />
                      <i />
                    </div>

                    <div className="beta-app-content">
                      <div className="beta-app-row">
                        <span className="beta-mini-cube" />
                        <i />
                      </div>

                      <div className="beta-app-row">
                        <span className="beta-mini-check">✓</span>
                        <i />
                      </div>

                      <div className="beta-app-row">
                        <span className="beta-mini-check">✓</span>
                        <i />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="beta-access-lock">
                  <div className="beta-lock-shackle" />
                  <span>•</span>
                </div>
              </div>

              <span className="beta-card-signal" />
            </article>

            <article className="beta-value-card">
              <div className="beta-card-heading">
                <span className="beta-card-number">02</span>

                <div className="beta-card-copy">
                  <strong>Direct product input</strong>
                  <small>
                    Help influence workflows built around real distribution operations.
                  </small>
                </div>
              </div>

              <div className="beta-card-graphic beta-input-graphic" aria-hidden="true">
                <div className="feedback-panel feedback-panel-user">
                  <span className="feedback-user-icon">
                    <i />
                  </span>

                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="feedback-panel feedback-panel-data">
                  <div className="feedback-bars">
                    <i />
                    <i />
                    <i />
                  </div>

                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="feedback-path feedback-path-left" />
                <div className="feedback-path feedback-path-right" />

                <div className="feedback-core">
                  <span className="feedback-cube">
                    <i />
                  </span>
                </div>
              </div>

              <span className="beta-card-signal" />
            </article>

            <article className="beta-value-card">
              <div className="beta-card-heading">
                <span className="beta-card-number">03</span>

                <div className="beta-card-copy">
                  <strong>Founding member status</strong>
                  <small>Join the first group helping define the product direction.</small>
                </div>
              </div>

              <div className="beta-card-graphic beta-member-graphic" aria-hidden="true">
                <div className="member-clip">
                  <span />
                </div>

                <div className="member-badge">
                  <div className="member-star">☆</div>

                  <strong>
                    FOUNDING
                    <br />
                    MEMBER
                  </strong>

                  <div className="member-lines">
                    <i />
                    <i />
                  </div>
                </div>
              </div>

              <span className="beta-card-signal" />
            </article>
          </div>

          <div className="beta-process">
            <div className="beta-process-step">
              <span>01</span>
              <strong>Apply</strong>
            </div>

            <i />

            <div className="beta-process-step">
              <span>02</span>
              <strong>Review</strong>
            </div>

            <i />

            <div className="beta-process-step">
              <span>03</span>
              <strong>Onboard</strong>
            </div>
          </div>

          <div className="beta-actions">
            <a
              className="button button-primary beta-button animated-cta"
              href="mailto:beta@distrodex.com"
            >
              <span>Apply for Founding Beta</span>
              <i aria-hidden="true">→</i>
            </a>

            <span>No enterprise implementation. No bloated setup.</span>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="login">
        <div className="footer-inner">
          <div className="footer-brand">
            <a className="brand" href="/" aria-label="Distro'Dex home">
              <div className="brand-mark">
                <span>D</span>
              </div>

              <div className="brand-copy">
                <strong>DISTRO'DEX</strong>
                <span>DISTRIBUTION OS</span>
              </div>
            </a>

            <p>Operations software for independent distribution.</p>
          </div>

          <div className="footer-links">
            <div>
              <strong>Product</strong>
              <a href="#product">Platform</a>
              <a href="#barcode">Barcode Receiving</a>
              <a href="#workflow">Workflow</a>
            </div>

            <div>
              <strong>Company</strong>
              <a href="#beta">Founding Beta</a>
              <a href="mailto:hello@distrodex.com">Contact</a>
            </div>

            <div>
              <strong>Access</strong>
              <a href="#beta">Apply for Beta</a>
              <span>Member login coming soon</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Distro'Dex. All rights reserved.</span>
          <span>Built for distribution.</span>
        </div>
      </footer>
    </main>
  );
}
