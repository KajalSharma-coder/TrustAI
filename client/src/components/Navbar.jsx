import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/generate", label: "Generate" },
  { to: "/verify", label: "Verify" },
  { to: "/dashboard", label: "Dashboard" },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center">
          <Link to="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/25 to-fuchsia-400/20 shadow-lg shadow-cyan-950/30">
              <span className="text-lg font-black text-cyan-100">T</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight text-white">
                TrustAI
              </span>
              <span className="hidden truncate text-xs font-medium text-slate-400 sm:block">
                Verify. Trust. Prove.
              </span>
            </span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition duration-300 lg:px-5 ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-200 lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
            AI Verification Active
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className="space-y-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`mx-4 mb-3 flex-col gap-2 rounded-3xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl shadow-slate-950/40 backdrop-blur-2xl md:hidden ${
          isOpen ? "flex" : "hidden"
        }`}
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-medium transition duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-950/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}

export default Navbar;
