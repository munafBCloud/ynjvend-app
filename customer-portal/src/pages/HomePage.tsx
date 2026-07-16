import { Link } from "react-router";

const benefits = [
  {
    title: "Reliable Inventory",
    description:
      "Browse currently available beverage products before submitting your request.",
  },
  {
    title: "Simple Requests",
    description:
      "Send product requests directly to the YNJ Vend fulfillment team.",
  },
  {
    title: "Built for Businesses",
    description:
      "Wholesale service designed for convenience stores and local retailers.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
              Wholesale Beverage Distribution
            </span>

            <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight text-slate-950 md:text-6xl">
              Inventory your business can depend on.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              YNJ Vend helps local businesses browse available products and
              submit wholesale beverage requests through one streamlined
              portal.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="rounded-xl bg-red-700 px-6 py-3 font-semibold text-white transition hover:bg-red-800"
              >
                Browse Products
              </Link>

              <Link
                to="/request"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Request Inventory
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              Customer Portal
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              Faster ordering. Better visibility.
            </h2>

            <div className="mt-8 space-y-4">
              {[
                "View available wholesale inventory",
                "Submit product and quantity requests",
                "Receive a unique request confirmation",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-xl bg-white/10 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 font-bold">
                    ✓
                  </span>
                  <span className="text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-950">
                {benefit.title}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
