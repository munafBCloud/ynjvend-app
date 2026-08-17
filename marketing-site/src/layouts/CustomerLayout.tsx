import { NavLink, Outlet } from "react-router";

const navigation = [
  { label: "Home", path: "/" },
  { label: "Products", path: "/products" },
  { label: "Request Products", path: "/request" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 font-bold text-white">
              YNJ
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">YNJ Vend</p>
              <p className="text-xs text-slate-500">
                Wholesale Beverage Distribution
              </p>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-7 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "text-sm font-medium transition",
                    isActive
                      ? "text-red-700"
                      : "text-slate-600 hover:text-slate-950",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/request"
            className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Submit Request
          </NavLink>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 YNJ Vend. All rights reserved.</p>
          <p>Reliable beverage distribution for local businesses.</p>
        </div>
      </footer>
    </div>
  );
}
