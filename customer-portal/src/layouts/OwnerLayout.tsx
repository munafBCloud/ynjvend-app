import { NavLink, Outlet } from "react-router";

const ownerNavigation = [
  { label: "Dashboard", path: "/owner" },
  { label: "Requests", path: "/owner/requests" },
  { label: "Customers", path: "/owner/customers" },
  { label: "Inventory", path: "/owner/inventory" },
];

export default function OwnerLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-6">
            <NavLink to="/owner" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 font-bold">
                YNJ
              </div>

              <div>
                <p className="font-bold">YNJ Vend</p>
                <p className="text-xs text-slate-400">Owner Portal</p>
              </div>
            </NavLink>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {ownerNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/owner"}
                className={({ isActive }) =>
                  [
                    "block rounded-lg px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "bg-red-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <NavLink
              to="/"
              className="block rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Return to Customer Site
            </NavLink>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                  Owner Portal
                </p>
                <h1 className="text-xl font-bold text-slate-950">
                  Business Operations
                </h1>
              </div>

              <NavLink
                to="/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:hidden"
              >
                Customer Site
              </NavLink>
            </div>
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
