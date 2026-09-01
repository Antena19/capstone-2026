import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | 'login'
  | 'dashboard'
  | 'empresas'
  | 'pasajeros'
  | 'conductores'
  | 'vehiculos'
  | 'rutas'
  | 'servicios'
  | 'detalle-servicio'
  | 'historial'
  | 'reportes'
  | 'planilla'

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const Icon = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  building: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  driver: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21a8 8 0 1 0-16 0"/>
      <path d="M12 12v3l2 2"/>
    </svg>
  ),
  truck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11v12H5zM12 17h7l2-4v-4h-7v8z"/>
      <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  map: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  file: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  bus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-4.2c.3-2.5.2-3.8.2-3.8H2S2 8 2 9.8C2 11.5 2 18 2 18h3"/>
      <circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  filter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  eye: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  pin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'sky' }) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    slate: 'bg-slate-100 text-slate-600 border border-slate-200',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200',
  }[color]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
  )
}

function ActionBtn({ icon, label, variant = 'primary', onClick }: { icon?: React.ReactNode; label: string; variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void }) {
  const cls = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant]
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${cls}`}>
      {icon}{label}
    </button>
  )
}

function SearchBar({ placeholder }: { placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icon.search}</span>
      <input
        type="text"
        placeholder={placeholder || 'Buscar...'}
        className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400"
      />
    </div>
  )
}

function Select({ options, label }: { options: string[]; label: string }) {
  return (
    <select className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
      <option value="">{label}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

function Table({ headers, rows, onRow }: { headers: string[]; rows: (string | React.ReactNode)[][]; onRow?: (i: number) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {headers.map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRow?.(i)} className={`border-b border-slate-50 ${onRow ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'} transition-colors`}>
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-4 text-slate-700 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
  )
}

function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

function Pagination() {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2 px-4 pb-4">
      <span className="text-xs text-slate-500">Mostrando 1–20 de 87 resultados</span>
      <div className="flex items-center gap-1">
        {['Anterior', '1', '2', '3', '4', 'Siguiente'].map((p, i) => (
          <button key={i} className={`px-3 py-1 text-xs rounded-lg transition-colors ${p === '1' ? 'bg-blue-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
  { id: 'empresas', label: 'Empresas Clientes', icon: Icon.building },
  { id: 'pasajeros', label: 'Pasajeros', icon: Icon.users },
  { id: 'conductores', label: 'Conductores', icon: Icon.driver },
  { id: 'vehiculos', label: 'Vehículos', icon: Icon.bus },
  { id: 'rutas', label: 'Planificación de Rutas', icon: Icon.map },
  { id: 'servicios', label: 'Servicios Programados', icon: Icon.calendar },
  { id: 'historial', label: 'Historial de Servicios', icon: Icon.history },
  { id: 'reportes', label: 'Reportes y Asistencias', icon: Icon.chart },
  { id: 'planilla', label: 'Planilla Mensual', icon: Icon.file },
] as { id: Screen; label: string; icon: React.ReactNode }[]

function Sidebar({ active, onNav }: { active: Screen; onNav: (s: Screen) => void }) {
  return (
    <aside className="flex flex-col" style={{ width: 240, minHeight: '100vh', background: '#0f172a' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
          {Icon.bus}
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>TransAdmin</div>
          <div className="text-slate-400 text-[11px]">v2.4.1</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-2">Operaciones</span>
        </div>
        {navItems.slice(0, 2).map(item => (
          <NavItem key={item.id} item={item} active={active} onNav={onNav} />
        ))}
        <div className="px-3 mt-4 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-2">Gestión</span>
        </div>
        {navItems.slice(2, 6).map(item => (
          <NavItem key={item.id} item={item} active={active} onNav={onNav} />
        ))}
        <div className="px-3 mt-4 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-2">Planificación</span>
        </div>
        {navItems.slice(6, 8).map(item => (
          <NavItem key={item.id} item={item} active={active} onNav={onNav} />
        ))}
        <div className="px-3 mt-4 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-2">Análisis</span>
        </div>
        {navItems.slice(8).map(item => (
          <NavItem key={item.id} item={item} active={active} onNav={onNav} />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">MC</div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">María Castillo</div>
            <div className="text-slate-400 text-xs">Administrador</div>
          </div>
          <button className="text-slate-500 hover:text-slate-300 transition-colors">{Icon.logout}</button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ item, active, onNav }: { item: typeof navItems[0]; active: Screen; onNav: (s: Screen) => void }) {
  const isActive = active === item.id
  return (
    <button
      onClick={() => onNav(item.id)}
      className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all text-left ${
        isActive
          ? 'text-white bg-blue-600/20 border-r-2 border-blue-500 font-medium'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={isActive ? 'text-blue-400' : ''}>{item.icon}</span>
      {item.label}
    </button>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ title, onNav }: { title: string; onNav: (s: Screen) => void }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>TransAdmin</span>
        <span>{Icon.chevronRight}</span>
        <span className="text-slate-900 font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">Lun, 18 Ago 2025 — 09:14</span>
        <div className="relative">
          <button className="relative text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            {Icon.bell}
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────
function Layout({ screen, onNav, title, children }: { screen: Screen; onNav: (s: Screen) => void; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar active={screen} onNav={onNav} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} onNav={onNav} />
        <main className="flex-1 p-6 overflow-auto" style={{ background: '#f1f5f9' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// ─── Screen: Login ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex" style={{ background: '#0f172a' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12" style={{ background: '#0f172a' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white">
            {Icon.bus}
          </div>
          <span className="text-white text-xl font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>TransAdmin</span>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-4 mb-10">
            {[
              { num: '4.2K', label: 'Pasajeros activos' },
              { num: '128', label: 'Vehículos en flota' },
              { num: '89%', label: 'Asistencia promedio' },
              { num: '47', label: 'Empresas cliente' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: '#1e293b' }}>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.num}</div>
                <div className="text-slate-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <blockquote className="text-slate-400 text-sm leading-relaxed">
            "TransAdmin centraliza toda la operación de transporte de personal en una sola plataforma, simplificando la planificación y el seguimiento diario."
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Iniciar sesión</h2>
            <p className="text-slate-500 text-sm mt-1">Sistema de gestión de transporte de personal</p>
          </div>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); onLogin(); }}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                defaultValue="mcastillo@transportes.cl"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                defaultValue="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                Recordar sesión
              </label>
              <button type="button" className="text-sm text-blue-600 hover:text-blue-700">¿Olvidó su contraseña?</button>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              Ingresar al sistema
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-8">© 2025 TransAdmin · Versión 2.4.1</p>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Dashboard ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-2 text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function DashboardScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const kpis = [
    { label: 'Servicios programados hoy', value: 34, sub: '+3 respecto a ayer', color: 'bg-blue-50 text-blue-600', icon: Icon.calendar },
    { label: 'Servicios en curso', value: 8, sub: 'En tiempo real', color: 'bg-emerald-50 text-emerald-600', icon: Icon.truck },
    { label: 'Pasajeros planificados', value: 412, sub: 'Para el día de hoy', color: 'bg-sky-50 text-sky-600', icon: Icon.users },
    { label: 'Pasajeros transportados', value: 278, sub: 'Confirmados hasta ahora', color: 'bg-violet-50 text-violet-600', icon: Icon.users },
    { label: 'Porcentaje de asistencia', value: '89%', sub: 'Meta: 95%', color: 'bg-amber-50 text-amber-600', icon: Icon.chart },
    { label: 'Vehículos disponibles', value: '18/24', sub: '6 en servicio activo', color: 'bg-teal-50 text-teal-600', icon: Icon.bus },
    { label: 'Incidentes / Atrasos', value: 2, sub: 'Requieren atención', color: 'bg-red-50 text-red-600', icon: Icon.alert },
  ]

  const activeServices = [
    { ruta: 'Ruta Sur — Cerrillos', empresa: 'Minera Collahuasi', conductor: 'Juan Pérez', patente: 'FXKR-21', pasajeros: '18/24', estado: 'En curso', pct: 75 },
    { ruta: 'Ruta Norte — Quilicura', empresa: 'ENAP Refinerías', conductor: 'Ana Rodríguez', patente: 'HDML-09', pasajeros: '22/30', estado: 'En curso', pct: 73 },
    { ruta: 'Ruta Centro — Providencia', empresa: 'BHP Chile', conductor: 'Carlos Díaz', patente: 'BKTP-55', pasajeros: '12/16', estado: 'En curso', pct: 75 },
    { ruta: 'Ruta Poniente — Maipú', empresa: 'Cencosud S.A.', conductor: 'Luis Soto', patente: 'GQNV-33', pasajeros: '28/32', estado: 'Atrasado', pct: 87 },
  ]

  const incidents = [
    { tipo: 'Atraso', ruta: 'Ruta Poniente — Maipú', tiempo: '+18 min', hora: '08:42' },
    { tipo: 'Incidente', ruta: 'Ruta Oriente — La Florida', tiempo: 'Mecánico', hora: '07:55' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard Operacional" subtitle="Lunes 18 de agosto, 2025 · Actualizado hace 2 min">
        <ActionBtn icon={Icon.download} label="Exportar" variant="secondary" />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.slice(0, 4).map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {kpis.slice(4).map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Active services table */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Servicios activos ahora</h2>
            <button onClick={() => onNav('servicios')} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Ver todos →</button>
          </div>
          <div className="divide-y divide-slate-50">
            {activeServices.map((s, i) => (
              <div key={i} className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.ruta}</p>
                    <p className="text-xs text-slate-500">{s.empresa} · {s.conductor} · {s.patente}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-600">{s.pasajeros}</span>
                    <Badge label={s.estado} color={s.estado === 'Atrasado' ? 'amber' : 'green'} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.estado === 'Atrasado' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400">{s.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Incidents */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Incidentes y atrasos</h2>
            </div>
            <div className="p-5 space-y-3">
              {incidents.map((inc, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-red-500 mt-0.5">{Icon.alert}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800">{inc.tipo} · {inc.tiempo}</p>
                    <p className="text-xs text-red-600 truncate">{inc.ruta}</p>
                  </div>
                  <span className="text-xs text-red-400 font-mono">{inc.hora}</span>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                <div className="text-emerald-500">{Icon.check}</div>
                <p className="text-sm text-emerald-700">Sin otros incidentes reportados</p>
              </div>
            </div>
          </Card>

          {/* Fleet utilization */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Uso de flota hoy</h2>
            </div>
            <div className="p-5 space-y-3">
              <MiniBar label="Minibuses (16 pas.)" pct={80} color="bg-blue-500" />
              <MiniBar label="Buses medianos (32 pas.)" pct={62} color="bg-sky-400" />
              <MiniBar label="Buses grandes (45 pas.)" pct={40} color="bg-violet-400" />
              <MiniBar label="Vans ejecutivas (8 pas.)" pct={100} color="bg-emerald-500" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Empresas ─────────────────────────────────────────────────────────
function EmpresasScreen() {
  const empresas = [
    { nombre: 'Minera Collahuasi S.A.', rut: '76.284.110-3', contacto: 'Roberto Fuentes', pasajeros: 142, rutas: 8, estado: 'Activo' },
    { nombre: 'ENAP Refinerías', rut: '61.135.000-6', contacto: 'Carla Mendez', pasajeros: 88, rutas: 5, estado: 'Activo' },
    { nombre: 'BHP Chile Ltda.', rut: '78.400.320-1', contacto: 'Felipe Vega', pasajeros: 210, rutas: 12, estado: 'Activo' },
    { nombre: 'Cencosud S.A.', rut: '79.049.000-4', contacto: 'Andrea Torres', pasajeros: 65, rutas: 4, estado: 'Activo' },
    { nombre: 'Codelco Chile', rut: '61.317.000-7', contacto: 'Marcelo Ríos', pasajeros: 320, rutas: 18, estado: 'Activo' },
    { nombre: 'Falabella Retail S.A.', rut: '81.122.400-5', contacto: 'Daniela Pino', pasajeros: 47, rutas: 3, estado: 'Inactivo' },
    { nombre: 'Latam Airlines Group', rut: '82.215.300-9', contacto: 'Héctor Alvarado', pasajeros: 93, rutas: 6, estado: 'Activo' },
    { nombre: 'SMU S.A.', rut: '99.508.460-2', contacto: 'Patricia Núñez', pasajeros: 31, rutas: 2, estado: 'Activo' },
  ]
  return (
    <div>
      <PageHeader title="Empresas Clientes" subtitle={`${empresas.length} empresas registradas`}>
        <SearchBar placeholder="Buscar empresa..." />
        <ActionBtn icon={Icon.plus} label="Nueva empresa" variant="primary" />
      </PageHeader>
      <Card>
        <Table
          headers={['Empresa', 'RUT', 'Contacto', 'Pasajeros', 'Rutas activas', 'Estado', 'Acciones']}
          rows={empresas.map(e => [
            <span className="font-medium text-slate-900">{e.nombre}</span>,
            <span className="font-mono text-xs text-slate-500">{e.rut}</span>,
            e.contacto,
            <span className="font-mono text-slate-700">{e.pasajeros}</span>,
            <span className="font-mono text-slate-700">{e.rutas}</span>,
            <Badge label={e.estado} color={e.estado === 'Activo' ? 'green' : 'slate'} />,
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">{Icon.eye}</button>
              <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">{Icon.edit}</button>
              <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">{Icon.trash}</button>
            </div>,
          ])}
        />
        <Pagination />
      </Card>
    </div>
  )
}

// ─── Screen: Pasajeros ────────────────────────────────────────────────────────
function PasajerosScreen() {
  const pasajeros = [
    { nombre: 'Alejandro Muñoz', rut: '15.234.567-8', empresa: 'BHP Chile Ltda.', ruta: 'Ruta Norte — Quilicura', telefono: '+56 9 8123 4567', estado: 'Activo' },
    { nombre: 'Valentina Soto', rut: '17.891.234-5', empresa: 'Minera Collahuasi', ruta: 'Ruta Sur — Cerrillos', telefono: '+56 9 7234 5678', estado: 'Activo' },
    { nombre: 'Rodrigo Castillo', rut: '12.456.789-0', empresa: 'Codelco Chile', ruta: 'Ruta Oriente — La Florida', telefono: '+56 9 6345 6789', estado: 'Activo' },
    { nombre: 'Camila Torres', rut: '19.345.678-2', empresa: 'ENAP Refinerías', ruta: 'Ruta Poniente — Maipú', telefono: '+56 9 5456 7890', estado: 'Licencia' },
    { nombre: 'Diego Ramírez', rut: '16.789.012-3', empresa: 'BHP Chile Ltda.', ruta: 'Ruta Norte — Quilicura', telefono: '+56 9 4567 8901', estado: 'Activo' },
    { nombre: 'Sofía Herrera', rut: '18.234.567-1', empresa: 'Latam Airlines Group', ruta: 'Ruta Centro — Providencia', telefono: '+56 9 3678 9012', estado: 'Activo' },
    { nombre: 'Matías González', rut: '13.567.890-4', empresa: 'Cencosud S.A.', ruta: 'Ruta Sur — Cerrillos', telefono: '+56 9 2789 0123', estado: 'Inactivo' },
  ]
  return (
    <div>
      <PageHeader title="Gestión de Pasajeros" subtitle={`412 pasajeros activos`}>
        <SearchBar placeholder="Buscar pasajero, RUT..." />
        <Select options={['BHP Chile', 'Minera Collahuasi', 'Codelco Chile', 'ENAP Refinerías']} label="Empresa" />
        <Select options={['Activo', 'Licencia', 'Inactivo']} label="Estado" />
        <ActionBtn icon={Icon.plus} label="Nuevo pasajero" variant="primary" />
      </PageHeader>
      <Card>
        <Table
          headers={['Pasajero', 'RUT', 'Empresa', 'Ruta asignada', 'Teléfono', 'Estado', 'Acciones']}
          rows={pasajeros.map(p => [
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                {p.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="font-medium text-slate-900">{p.nombre}</span>
            </div>,
            <span className="font-mono text-xs text-slate-500">{p.rut}</span>,
            p.empresa,
            p.ruta,
            <span className="font-mono text-xs">{p.telefono}</span>,
            <Badge label={p.estado} color={p.estado === 'Activo' ? 'green' : p.estado === 'Licencia' ? 'amber' : 'slate'} />,
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">{Icon.eye}</button>
              <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">{Icon.edit}</button>
              <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">{Icon.trash}</button>
            </div>,
          ])}
        />
        <Pagination />
      </Card>
    </div>
  )
}

// ─── Screen: Conductores ──────────────────────────────────────────────────────
function ConductoresScreen() {
  const conductores = [
    { nombre: 'Juan Pérez Vargas', rut: '10.234.567-K', licencia: 'D • Vence: 12/2026', celular: '+56 9 1234 5678', vehiculo: 'Mercedes Sprinter · FXKR-21', estado: 'Disponible', servicios: 284 },
    { nombre: 'Ana Rodríguez Silva', rut: '12.345.678-1', licencia: 'D • Vence: 06/2025', celular: '+56 9 2345 6789', vehiculo: 'Hyundai H350 · HDML-09', estado: 'En servicio', servicios: 198 },
    { nombre: 'Carlos Díaz Mora', rut: '14.567.890-5', licencia: 'A2 • Vence: 03/2027', celular: '+56 9 3456 7890', vehiculo: 'Toyota Coaster · BKTP-55', estado: 'En servicio', servicios: 312 },
    { nombre: 'Luis Soto Araya', rut: '11.789.012-3', licencia: 'D • Vence: 09/2026', celular: '+56 9 4567 8901', vehiculo: 'Volvo 8900 · GQNV-33', estado: 'Atrasado', servicios: 156 },
    { nombre: 'Patricia Vega Reyes', rut: '16.012.345-7', licencia: 'D • Vence: 11/2025', celular: '+56 9 5678 9012', vehiculo: 'Sin asignar', estado: 'Disponible', servicios: 89 },
    { nombre: 'Fernando Morales', rut: '13.234.567-9', licencia: 'D • Vence: 07/2026', celular: '+56 9 6789 0123', vehiculo: 'Mercedes Citaro · JMRP-12', estado: 'Libre', servicios: 221 },
  ]
  const estadoColor = (e: string) => e === 'Disponible' || e === 'Libre' ? 'green' : e === 'En servicio' ? 'blue' : e === 'Atrasado' ? 'amber' : 'slate'
  return (
    <div>
      <PageHeader title="Gestión de Conductores" subtitle="24 conductores registrados">
        <SearchBar placeholder="Buscar conductor..." />
        <Select options={['Disponible', 'En servicio', 'Libre', 'Atrasado']} label="Estado" />
        <ActionBtn icon={Icon.plus} label="Nuevo conductor" variant="primary" />
      </PageHeader>
      <Card>
        <Table
          headers={['Conductor', 'RUT', 'Licencia', 'Celular', 'Vehículo asignado', 'Estado', 'Servicios', 'Acciones']}
          rows={conductores.map(c => [
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center">
                {c.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="font-medium text-slate-900">{c.nombre}</span>
            </div>,
            <span className="font-mono text-xs text-slate-500">{c.rut}</span>,
            <span className="text-xs">{c.licencia}</span>,
            <span className="font-mono text-xs">{c.celular}</span>,
            <span className="text-xs text-slate-600">{c.vehiculo}</span>,
            <Badge label={c.estado} color={estadoColor(c.estado)} />,
            <span className="font-mono text-slate-700">{c.servicios}</span>,
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">{Icon.eye}</button>
              <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">{Icon.edit}</button>
            </div>,
          ])}
        />
        <Pagination />
      </Card>
    </div>
  )
}

// ─── Screen: Vehículos ────────────────────────────────────────────────────────
function VehiculosScreen() {
  const vehiculos = [
    { patente: 'FXKR-21', marca: 'Mercedes-Benz Sprinter 519', tipo: 'Minibus', capacidad: 19, disponible: 19, km: '124,580', revision: '12/2025', estado: 'Disponible' },
    { patente: 'HDML-09', marca: 'Hyundai H350', tipo: 'Minibus', capacidad: 16, disponible: 0, km: '98,320', revision: '08/2025', estado: 'En servicio' },
    { patente: 'BKTP-55', marca: 'Toyota Coaster 4.2D', tipo: 'Minibus', capacidad: 30, disponible: 18, km: '210,450', revision: '03/2026', estado: 'En servicio' },
    { patente: 'GQNV-33', marca: 'Volvo 8900', tipo: 'Bus mediano', capacidad: 45, disponible: 0, km: '387,200', revision: '11/2025', estado: 'En servicio' },
    { patente: 'JMRP-12', marca: 'Mercedes Citaro C2', tipo: 'Bus grande', capacidad: 60, disponible: 60, km: '56,100', revision: '06/2026', estado: 'Disponible' },
    { patente: 'KLTN-88', marca: 'Scania K230 IB', tipo: 'Bus grande', capacidad: 50, disponible: 50, km: '445,900', revision: '01/2026', estado: 'Mantención' },
    { patente: 'NRPQ-41', marca: 'Ford Transit Custom', tipo: 'Van ejecutiva', capacidad: 9, disponible: 0, km: '67,300', revision: '07/2025', estado: 'En servicio' },
    { patente: 'PRXT-77', marca: 'Iveco Daily 70C', tipo: 'Minibus', capacidad: 22, disponible: 22, km: '142,800', revision: '10/2025', estado: 'Disponible' },
  ]
  const estadoColor = (e: string) => e === 'Disponible' ? 'green' : e === 'En servicio' ? 'blue' : e === 'Mantención' ? 'amber' : 'red'

  return (
    <div>
      <PageHeader title="Gestión de Vehículos" subtitle="24 vehículos en flota">
        <SearchBar placeholder="Buscar patente, modelo..." />
        <Select options={['Minibus', 'Bus mediano', 'Bus grande', 'Van ejecutiva']} label="Tipo" />
        <Select options={['Disponible', 'En servicio', 'Mantención']} label="Estado" />
        <ActionBtn icon={Icon.plus} label="Nuevo vehículo" variant="primary" />
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total flota', value: 24, color: 'bg-slate-100 text-slate-600' },
          { label: 'Disponibles', value: 8, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'En servicio', value: 12, color: 'bg-blue-50 text-blue-700' },
          { label: 'En mantención', value: 4, color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold px-2 py-0.5 rounded inline-block ${s.color}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <Table
          headers={['Patente', 'Vehículo', 'Tipo', 'Capacidad total', 'Disponible', 'Km recorridos', 'Rev. técnica', 'Estado', 'Acciones']}
          rows={vehiculos.map(v => [
            <span className="font-mono font-semibold text-slate-700">{v.patente}</span>,
            v.marca,
            v.tipo,
            <div className="flex items-center gap-2">
              <span className="font-mono">{v.capacidad}</span>
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(v.disponible / v.capacidad) * 100}%` }} />
              </div>
            </div>,
            <span className={`font-mono font-semibold ${v.disponible === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>{v.disponible}</span>,
            <span className="font-mono text-xs">{v.km}</span>,
            <span className="text-xs">{v.revision}</span>,
            <Badge label={v.estado} color={estadoColor(v.estado)} />,
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">{Icon.eye}</button>
              <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">{Icon.edit}</button>
            </div>,
          ])}
        />
        <Pagination />
      </Card>
    </div>
  )
}

// ─── Screen: Rutas ────────────────────────────────────────────────────────────
function MapPlaceholder() {
  const stops = [
    { x: 180, y: 120, label: 'Origen: BHP Chile', main: true },
    { x: 310, y: 180, label: 'Parada 1: Av. Las Condes 12.400', main: false },
    { x: 440, y: 145, label: 'Parada 2: Tobalaba Metro', main: false },
    { x: 570, y: 200, label: 'Parada 3: Mall Plaza', main: false },
    { x: 650, y: 290, label: 'Destino: Planta Quilicura', main: true },
  ]
  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-200" style={{ background: '#e8edf3' }}>
      {/* Grid lines */}
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c8d4e0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* Roads */}
        <line x1="0" y1="220" x2="800" y2="220" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
        <line x1="0" y1="220" x2="800" y2="220" stroke="#d1dae5" strokeWidth="11" strokeLinecap="round" />
        <line x1="350" y1="0" x2="350" y2="400" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
        <line x1="350" y1="0" x2="350" y2="400" stroke="#d1dae5" strokeWidth="11" strokeLinecap="round" />
        <line x1="520" y1="0" x2="520" y2="400" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
        <line x1="520" y1="0" x2="520" y2="400" stroke="#d1dae5" strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="130" x2="800" y2="130" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <line x1="0" y1="130" x2="800" y2="130" stroke="#d1dae5" strokeWidth="5" strokeLinecap="round" />
        {/* Route path */}
        <polyline
          points={stops.map(s => `${s.x},${s.y}`).join(' ')}
          fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6,3"
          strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Stops */}
        {stops.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r={s.main ? 10 : 7} fill={s.main ? '#2563eb' : '#fff'} stroke={s.main ? '#1d4ed8' : '#2563eb'} strokeWidth="2.5" />
            {!s.main && <circle cx={s.x} cy={s.y} r="3" fill="#2563eb" />}
            <rect x={s.x + 14} y={s.y - 14} width={s.label.length * 6.2} height="22" rx="4" fill="white" fillOpacity="0.92" stroke="#e2e8f0" strokeWidth="1" />
            <text x={s.x + 18} y={s.y + 2} fontSize="10" fill="#374151" fontFamily="Inter, sans-serif">{s.label}</text>
          </g>
        ))}
        {/* Bus icon approximation */}
        <rect x="385" y="168" width="24" height="14" rx="3" fill="#2563eb" />
        <text x="389" y="179" fontSize="8" fill="white" fontFamily="Inter">BUS</text>
      </svg>
      {/* Compass */}
      <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">N↑</div>
      <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg px-3 py-1.5 text-xs text-slate-600 border border-slate-200">
        🗺 Mapa interactivo · Ruta Norte — Quilicura · 24.3 km
      </div>
    </div>
  )
}

function RutasScreen() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'paradas' | 'pasajeros' | 'horarios'>('mapa')
  const paradas = [
    { orden: 1, nombre: 'Punto de origen: Empresa BHP Chile', direccion: 'Av. El Golf 150, Las Condes', hora: '06:30', pasajeros: 18 },
    { orden: 2, nombre: 'Parada Av. Las Condes', direccion: 'Av. Las Condes 12.400, Vitacura', hora: '06:42', pasajeros: 4 },
    { orden: 3, nombre: 'Parada Tobalaba Metro', direccion: 'Av. Providencia 2180, Providencia', hora: '06:55', pasajeros: 3 },
    { orden: 4, nombre: 'Parada Mall Plaza Tobalaba', direccion: 'Av. Tobalaba 8500, Peñalolén', hora: '07:08', pasajeros: 2 },
    { orden: 5, nombre: 'Destino: Planta Quilicura', direccion: 'Camino Lo Echevers 1200, Quilicura', hora: '07:35', pasajeros: 27 },
  ]
  const tabs = [
    { id: 'mapa', label: 'Mapa de ruta' },
    { id: 'paradas', label: 'Puntos de recogida' },
    { id: 'pasajeros', label: 'Pasajeros' },
    { id: 'horarios', label: 'Horarios' },
  ] as const

  return (
    <div>
      <PageHeader title="Planificación de Rutas" subtitle="Ruta Norte — Quilicura · BHP Chile Ltda.">
        <ActionBtn icon={Icon.plus} label="Nueva ruta" variant="primary" />
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Distancia total', value: '24.3 km' },
          { label: 'Duración estimada', value: '65 min' },
          { label: 'Capacidad del vehículo', value: '30 pax' },
          { label: 'Pasajeros asignados', value: '27 / 30' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          {/* Tabs */}
          <Card>
            <div className="flex border-b border-slate-100">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {activeTab === 'mapa' && <MapPlaceholder />}
              {activeTab === 'paradas' && (
                <div className="space-y-2">
                  {paradas.map(p => (
                    <div key={p.orden} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{p.orden}</div>
                      <div className="text-red-400 flex-shrink-0">{Icon.pin}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{p.nombre}</p>
                        <p className="text-xs text-slate-500">{p.direccion}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold text-slate-700">{p.hora}</p>
                        <p className="text-xs text-slate-400">{p.pasajeros} pax</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'pasajeros' && (
                <Table
                  headers={['Pasajero', 'Parada', 'Teléfono', 'Estado']}
                  rows={[
                    ['Alejandro Muñoz', 'Origen BHP', '+56 9 8123 4567', <Badge label="Activo" color="green" />],
                    ['Valentina Soto', 'Av. Las Condes', '+56 9 7234 5678', <Badge label="Activo" color="green" />],
                    ['Rodrigo Castillo', 'Tobalaba Metro', '+56 9 6345 6789', <Badge label="Activo" color="green" />],
                    ['Camila Torres', 'Mall Plaza', '+56 9 5456 7890', <Badge label="Licencia" color="amber" />],
                    ['Diego Ramírez', 'Origen BHP', '+56 9 4567 8901', <Badge label="Activo" color="green" />],
                  ]}
                />
              )}
              {activeTab === 'horarios' && (
                <div className="space-y-4">
                  {[
                    { turno: 'Turno mañana', entrada: '06:30', llegada: '07:35', salida: '17:00', retorno: '18:10' },
                    { turno: 'Turno tarde', entrada: '13:30', llegada: '14:35', salida: '22:00', retorno: '23:10' },
                  ].map(h => (
                    <div key={h.turno} className="p-4 rounded-xl border border-slate-200">
                      <p className="font-semibold text-slate-900 mb-3">{h.turno}</p>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Salida', value: h.entrada },
                          { label: 'Llegada', value: h.llegada },
                          { label: 'Salida regreso', value: h.salida },
                          { label: 'Llegada regreso', value: h.retorno },
                        ].map(t => (
                          <div key={t.label} className="text-center p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">{t.label}</p>
                            <p className="font-mono text-lg font-bold text-slate-900 mt-0.5">{t.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Vehicle & driver */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Vehículo asignado</h3>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
              <p className="font-mono font-bold text-blue-700 text-lg">BKTP-55</p>
              <p className="text-sm text-slate-700">Toyota Coaster 4.2D</p>
              <p className="text-xs text-slate-500 mt-1">Capacidad: 30 pasajeros</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ocupación</span>
                <span className="font-medium">27 / 30</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '90%' }} />
              </div>
              <p className="text-xs text-slate-500 text-right">3 asientos disponibles</p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Conductor</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">CD</div>
              <div>
                <p className="font-medium text-slate-900">Carlos Díaz Mora</p>
                <p className="text-xs text-slate-500">Lic. A2 · Vence 03/2027</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Celular</span>
                <span className="font-mono text-xs">+56 9 3456 7890</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Servicios mes</span>
                <span>22</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>Lista de rutas</h3>
            <div className="space-y-2">
              {[
                { nombre: 'Ruta Norte — Quilicura', pax: '27/30', activa: true },
                { nombre: 'Ruta Sur — Cerrillos', pax: '18/24', activa: false },
                { nombre: 'Ruta Centro — Providencia', pax: '12/16', activa: false },
                { nombre: 'Ruta Oriente — La Florida', pax: '22/30', activa: false },
              ].map(r => (
                <div key={r.nombre} className={`flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition-colors ${r.activa ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'}`}>
                  <span className={r.activa ? 'text-blue-700 font-medium' : 'text-slate-700'}>{r.nombre}</span>
                  <span className="text-xs font-mono text-slate-500">{r.pax}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Servicios ────────────────────────────────────────────────────────
function ServiciosScreen({ onDetail }: { onDetail: () => void }) {
  const servicios = [
    { id: 'SVC-2025-1842', ruta: 'Ruta Norte — Quilicura', empresa: 'BHP Chile', conductor: 'Carlos Díaz', vehiculo: 'BKTP-55', fecha: '18/08/2025', hora: '06:30', pax: '27/30', estado: 'Programado' },
    { id: 'SVC-2025-1843', ruta: 'Ruta Sur — Cerrillos', empresa: 'Minera Collahuasi', conductor: 'Juan Pérez', vehiculo: 'FXKR-21', fecha: '18/08/2025', hora: '06:45', pax: '18/19', estado: 'En curso' },
    { id: 'SVC-2025-1844', ruta: 'Ruta Centro — Providencia', empresa: 'ENAP Refinerías', conductor: 'Ana Rodríguez', vehiculo: 'HDML-09', fecha: '18/08/2025', hora: '07:00', pax: '12/16', estado: 'En curso' },
    { id: 'SVC-2025-1845', ruta: 'Ruta Poniente — Maipú', empresa: 'Cencosud S.A.', conductor: 'Luis Soto', vehiculo: 'GQNV-33', fecha: '18/08/2025', hora: '07:15', pax: '28/45', estado: 'Atrasado' },
    { id: 'SVC-2025-1846', ruta: 'Ruta Oriente — La Florida', empresa: 'Codelco Chile', conductor: 'Patricia Vega', vehiculo: 'PRXT-77', fecha: '18/08/2025', hora: '07:30', pax: '0/22', estado: 'Cancelado' },
    { id: 'SVC-2025-1847', ruta: 'Ruta Norte — Quilicura', empresa: 'BHP Chile', conductor: 'Carlos Díaz', vehiculo: 'BKTP-55', fecha: '18/08/2025', hora: '17:00', pax: '0/30', estado: 'Programado' },
    { id: 'SVC-2025-1848', ruta: 'Ruta Sur — Cerrillos', empresa: 'Minera Collahuasi', conductor: 'Juan Pérez', vehiculo: 'FXKR-21', fecha: '18/08/2025', hora: '17:30', pax: '0/19', estado: 'Programado' },
  ]
  const estadoColor = (e: string) => e === 'Programado' ? 'blue' : e === 'En curso' ? 'green' : e === 'Atrasado' ? 'amber' : e === 'Cancelado' ? 'red' : 'slate'

  return (
    <div>
      <PageHeader title="Servicios Programados" subtitle="18 agosto 2025 · 34 servicios">
        <SearchBar placeholder="Buscar servicio, ruta..." />
        <Select options={['Hoy', 'Esta semana', 'Este mes']} label="Período" />
        <Select options={['Todos', 'Programado', 'En curso', 'Atrasado', 'Cancelado']} label="Estado" />
        <ActionBtn icon={Icon.plus} label="Nuevo servicio" variant="primary" />
      </PageHeader>
      <Card>
        <Table
          headers={['N° Servicio', 'Ruta', 'Empresa', 'Conductor', 'Vehículo', 'Fecha', 'Hora salida', 'Pasajeros', 'Estado', 'Acciones']}
          rows={servicios.map(s => [
            <span className="font-mono text-xs text-slate-500">{s.id}</span>,
            <span className="font-medium text-slate-800">{s.ruta}</span>,
            s.empresa,
            s.conductor,
            <span className="font-mono text-xs">{s.vehiculo}</span>,
            s.fecha,
            <span className="font-mono font-semibold">{s.hora}</span>,
            <span className="font-mono text-sm">{s.pax}</span>,
            <Badge label={s.estado} color={estadoColor(s.estado)} />,
            <div className="flex items-center gap-1">
              <button onClick={onDetail} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">{Icon.eye}</button>
              <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">{Icon.edit}</button>
            </div>,
          ])}
        />
        <Pagination />
      </Card>
    </div>
  )
}

// ─── Screen: Detalle Servicio ──────────────────────────────────────────────────
function DetalleServicioScreen({ onBack }: { onBack: () => void }) {
  const pasajeros = [
    { nombre: 'Alejandro Muñoz', rut: '15.234.567-8', parada: 'Origen BHP', planificado: true, confirmado: true, asistio: true },
    { nombre: 'Valentina Soto', rut: '17.891.234-5', parada: 'Av. Las Condes', planificado: true, confirmado: true, asistio: true },
    { nombre: 'Rodrigo Castillo', rut: '12.456.789-0', parada: 'Tobalaba Metro', planificado: true, confirmado: true, asistio: false },
    { nombre: 'Diego Ramírez', rut: '16.789.012-3', parada: 'Origen BHP', planificado: true, confirmado: true, asistio: true },
    { nombre: 'Sofía Herrera', rut: '18.234.567-1', parada: 'Mall Plaza', planificado: true, confirmado: false, asistio: false },
    { nombre: 'Matías González', rut: '13.567.890-4', parada: 'Origen BHP', planificado: true, confirmado: true, asistio: true },
    { nombre: 'Camila Torres', rut: '19.345.678-2', parada: 'Av. Las Condes', planificado: true, confirmado: false, asistio: false },
  ]
  const checkIcon = (v: boolean) => v ? (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">{Icon.check}</span>
  ) : (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300">—</span>
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
          ← Volver a servicios
        </button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Servicio SVC-2025-1843</h1>
            <Badge label="En curso" color="green" />
          </div>
          <p className="text-sm text-slate-500">18 de agosto, 2025 · Turno mañana · 06:30 hrs</p>
        </div>
        <div className="flex gap-2">
          <ActionBtn icon={Icon.download} label="Exportar" variant="secondary" />
          <ActionBtn icon={Icon.edit} label="Editar" variant="secondary" />
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Pasajeros planificados', value: 27, color: 'text-blue-600' },
          { label: 'Confirmaron asistencia', value: 22, color: 'text-sky-600' },
          { label: 'Registraron asistencia', value: 18, color: 'text-emerald-600' },
          { label: '% Asistencia', value: '82%', color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Passengers table */}
        <Card className="col-span-2">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Detalle de pasajeros</h2>
          </div>
          <Table
            headers={['Pasajero', 'RUT', 'Parada', 'Planificado', 'Confirmó', 'Asistió']}
            rows={pasajeros.map(p => [
              <span className="font-medium text-slate-900">{p.nombre}</span>,
              <span className="font-mono text-xs text-slate-500">{p.rut}</span>,
              <span className="text-xs">{p.parada}</span>,
              checkIcon(p.planificado),
              checkIcon(p.confirmado),
              checkIcon(p.asistio),
            ])}
          />
        </Card>

        {/* Service info */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Información del servicio</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Ruta</p>
                <p className="font-medium text-slate-900">Ruta Sur — Cerrillos</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Empresa cliente</p>
                <p className="font-medium text-slate-900">Minera Collahuasi S.A.</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Conductor</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">JP</div>
                  <p className="font-medium text-slate-900">Juan Pérez Vargas</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Vehículo</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">Mercedes Sprinter 519</p>
                  <span className="font-mono text-sm text-blue-700 font-bold">FXKR-21</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Capacidad</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '95%' }} />
                  </div>
                  <span className="text-xs font-mono">18/19</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Timeline del servicio</h3>
            <div className="space-y-3">
              {[
                { hora: '06:30', evento: 'Servicio iniciado', done: true },
                { hora: '06:45', evento: 'Salida desde origen', done: true },
                { hora: '07:12', evento: 'En ruta — 60% recorrido', done: true },
                { hora: '07:35', evento: 'Llegada a destino', done: false },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${t.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-xs font-mono text-slate-500">{t.hora}</p>
                    <p className={`text-sm ${t.done ? 'text-slate-800' : 'text-slate-400'}`}>{t.evento}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Historial ────────────────────────────────────────────────────────
function HistorialScreen({ onDetail }: { onDetail: () => void }) {
  const registros = [
    { id: 'SVC-2025-1841', fecha: '17/08/2025', ruta: 'Ruta Norte — Quilicura', empresa: 'BHP Chile', conductor: 'Carlos Díaz', planificados: 27, asistieron: 24, pct: 89, estado: 'Completado' },
    { id: 'SVC-2025-1840', fecha: '17/08/2025', ruta: 'Ruta Sur — Cerrillos', empresa: 'Minera Collahuasi', conductor: 'Juan Pérez', planificados: 18, asistieron: 15, pct: 83, estado: 'Completado' },
    { id: 'SVC-2025-1839', fecha: '17/08/2025', ruta: 'Ruta Centro — Providencia', empresa: 'ENAP Refinerías', conductor: 'Ana Rodríguez', planificados: 12, asistieron: 12, pct: 100, estado: 'Completado' },
    { id: 'SVC-2025-1838', fecha: '16/08/2025', ruta: 'Ruta Poniente — Maipú', empresa: 'Cencosud S.A.', conductor: 'Luis Soto', planificados: 28, asistieron: 21, pct: 75, estado: 'Completado' },
    { id: 'SVC-2025-1837', fecha: '16/08/2025', ruta: 'Ruta Oriente — La Florida', empresa: 'Codelco Chile', conductor: 'Patricia Vega', planificados: 22, asistieron: 0, pct: 0, estado: 'Cancelado' },
    { id: 'SVC-2025-1836', fecha: '15/08/2025', ruta: 'Ruta Norte — Quilicura', empresa: 'BHP Chile', conductor: 'Carlos Díaz', planificados: 27, asistieron: 26, pct: 96, estado: 'Completado' },
    { id: 'SVC-2025-1835', fecha: '15/08/2025', ruta: 'Ruta Sur — Cerrillos', empresa: 'Minera Collahuasi', conductor: 'Juan Pérez', planificados: 18, asistieron: 17, pct: 94, estado: 'Completado' },
  ]

  return (
    <div>
      <PageHeader title="Historial de Servicios" subtitle="Registro completo de servicios ejecutados">
        <SearchBar placeholder="Buscar servicio..." />
        <Select options={['Última semana', 'Último mes', 'Últimos 3 meses', 'Personalizado']} label="Período" />
        <Select options={['Todas', 'BHP Chile', 'Minera Collahuasi', 'ENAP Refinerías']} label="Empresa" />
        <ActionBtn icon={Icon.download} label="Exportar" variant="secondary" />
      </PageHeader>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Servicios en período', value: 248 },
          { label: 'Pasajeros planificados', value: '5.840' },
          { label: 'Pasajeros transportados', value: '5.194' },
          { label: 'Asistencia promedio', value: '89%' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <Table
          headers={['N° Servicio', 'Fecha', 'Ruta', 'Empresa', 'Conductor', 'Planificados', 'Asistieron', '% Asistencia', 'Estado', 'Acciones']}
          rows={registros.map(r => [
            <span className="font-mono text-xs text-slate-500">{r.id}</span>,
            r.fecha,
            <span className="font-medium text-slate-800">{r.ruta}</span>,
            r.empresa,
            r.conductor,
            <span className="font-mono text-center block">{r.planificados}</span>,
            <span className="font-mono text-center block">{r.asistieron}</span>,
            <div className="flex items-center gap-2">
              <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${r.pct >= 90 ? 'bg-emerald-400' : r.pct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${r.pct}%` }} />
              </div>
              <span className={`font-mono text-xs font-medium ${r.pct >= 90 ? 'text-emerald-600' : r.pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{r.pct}%</span>
            </div>,
            <Badge label={r.estado} color={r.estado === 'Completado' ? 'green' : 'red'} />,
            <button onClick={onDetail} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">{Icon.eye}</button>,
          ])}
        />
        <Pagination />
      </Card>
    </div>
  )
}

// ─── Screen: Reportes ─────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  return (
    <div className="flex items-end gap-3 h-40 px-2">
      {data.map(d => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-mono text-slate-500">{d.value}%</span>
          <div className="w-full rounded-t-md transition-all" style={{ height: `${(d.value / d.max) * 128}px`, background: d.value >= 90 ? '#10b981' : d.value >= 75 ? '#f59e0b' : '#ef4444' }} />
          <span className="text-[10px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function ReportesScreen() {
  const empresaData = [
    { empresa: 'BHP Chile Ltda.', planificados: 1240, transportados: 1118, pct: 90.2 },
    { empresa: 'Minera Collahuasi', planificados: 880, transportados: 749, pct: 85.1 },
    { empresa: 'Codelco Chile', planificados: 2100, transportados: 1953, pct: 93.0 },
    { empresa: 'ENAP Refinerías', planificados: 620, transportados: 527, pct: 85.0 },
    { empresa: 'Cencosud S.A.', planificados: 420, transportados: 357, pct: 85.0 },
    { empresa: 'Latam Airlines', planificados: 580, transportados: 490, pct: 84.5 },
  ]
  const dias = [
    { label: 'L', value: 91, max: 100 },
    { label: 'M', value: 87, max: 100 },
    { label: 'X', value: 93, max: 100 },
    { label: 'J', value: 89, max: 100 },
    { label: 'V', value: 85, max: 100 },
    { label: 'S', value: 76, max: 100 },
    { label: 'D', value: 0, max: 100 },
  ]

  return (
    <div>
      <PageHeader title="Reportes y Asistencias" subtitle="Período: agosto 2025">
        <Select options={['Julio 2025', 'Agosto 2025', 'Septiembre 2025']} label="Mes" />
        <Select options={['Todas', 'BHP Chile', 'Minera Collahuasi', 'Codelco Chile']} label="Empresa" />
        <ActionBtn icon={Icon.download} label="Exportar Excel" variant="secondary" />
        <ActionBtn icon={Icon.download} label="Exportar PDF" variant="primary" />
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total servicios', value: '248', sub: 'agosto 2025' },
          { label: 'Pasajeros planificados', value: '5.840', sub: 'total del mes' },
          { label: 'Pasajeros transportados', value: '5.194', sub: '89.0% asistencia' },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card className="col-span-2 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-5" style={{ fontFamily: 'DM Sans, sans-serif' }}>Asistencia por empresa</h2>
          <Table
            headers={['Empresa', 'Planificados', 'Transportados', '% Asistencia', 'Estado']}
            rows={empresaData.map(e => [
              <span className="font-medium">{e.empresa}</span>,
              <span className="font-mono">{e.planificados.toLocaleString()}</span>,
              <span className="font-mono">{e.transportados.toLocaleString()}</span>,
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${e.pct >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${e.pct}%` }} />
                </div>
                <span className="font-mono text-xs font-semibold">{e.pct}%</span>
              </div>,
              <Badge label={e.pct >= 90 ? 'Meta cumplida' : 'Bajo meta'} color={e.pct >= 90 ? 'green' : 'amber'} />,
            ])}
          />
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Asistencia por día (semana actual)</h2>
          <BarChart data={dias} />
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />≥ 90%</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />75–89%</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />{'<'} 75%</div>
          </div>
        </Card>
      </div>

      {/* Asistencia por ruta */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Detalle por ruta — agosto 2025</h2>
        <Table
          headers={['Ruta', 'Empresa', 'Servicios', 'Pax planif.', 'Pax transport.', 'Asistencia', 'Incidentes']}
          rows={[
            ['Ruta Norte — Quilicura', 'BHP Chile', '44', '1.188', '1.071', <span className="font-mono text-emerald-600 font-semibold">90.1%</span>, '0'],
            ['Ruta Sur — Cerrillos', 'Minera Collahuasi', '36', '792', '673', <span className="font-mono text-amber-600 font-semibold">84.9%</span>, '2'],
            ['Ruta Oriente — La Florida', 'Codelco Chile', '52', '1.040', '967', <span className="font-mono text-emerald-600 font-semibold">93.0%</span>, '1'],
            ['Ruta Centro — Providencia', 'ENAP Refinerías', '40', '640', '544', <span className="font-mono text-amber-600 font-semibold">85.0%</span>, '0'],
            ['Ruta Poniente — Maipú', 'Cencosud S.A.', '32', '1.024', '870', <span className="font-mono text-amber-600 font-semibold">84.9%</span>, '3'],
          ]}
        />
      </Card>
    </div>
  )
}

// ─── Screen: Planilla ─────────────────────────────────────────────────────────
function PlanillaScreen() {
  const [selectedEmpresa, setSelectedEmpresa] = useState('BHP Chile Ltda.')
  const [selectedMes, setSelectedMes] = useState('Agosto 2025')

  const pasajeros = [
    { nombre: 'Alejandro Muñoz', rut: '15.234.567-8', ruta: 'Ruta Norte', dias: 22, servicios: 44, pax_plan: 44, pax_real: 41, pct: 93, valor: 275400 },
    { nombre: 'Valentina Soto', rut: '17.891.234-5', ruta: 'Ruta Norte', dias: 22, servicios: 44, pax_plan: 44, pax_real: 38, pct: 86, valor: 254600 },
    { nombre: 'Diego Ramírez', rut: '16.789.012-3', ruta: 'Ruta Norte', dias: 22, servicios: 44, pax_plan: 44, pax_real: 44, pct: 100, valor: 294800 },
    { nombre: 'Felipe Castro', rut: '14.321.098-7', ruta: 'Ruta Norte', dias: 22, servicios: 44, pax_plan: 44, pax_real: 40, pct: 91, valor: 268000 },
    { nombre: 'Paula Moreno', rut: '18.765.432-1', ruta: 'Ruta Norte', dias: 22, servicios: 44, pax_plan: 44, pax_real: 35, pct: 80, valor: 234500 },
    { nombre: 'Ignacio Vargas', rut: '12.098.765-4', ruta: 'Ruta Norte', dias: 22, servicios: 44, pax_plan: 44, pax_real: 43, pct: 98, valor: 288100 },
  ]
  const total = pasajeros.reduce((a, p) => a + p.valor, 0)

  return (
    <div>
      <PageHeader title="Generación de Planilla Mensual" subtitle="Facturación por empresa cliente">
        <div className="flex items-center gap-2">
          <select
            value={selectedEmpresa}
            onChange={e => setSelectedEmpresa(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {['BHP Chile Ltda.', 'Minera Collahuasi', 'Codelco Chile', 'ENAP Refinerías'].map(e => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <select
            value={selectedMes}
            onChange={e => setSelectedMes(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {['Junio 2025', 'Julio 2025', 'Agosto 2025'].map(m => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <ActionBtn icon={Icon.download} label="Descargar PDF" variant="secondary" />
        <ActionBtn icon={Icon.download} label="Descargar Excel" variant="primary" />
      </PageHeader>

      {/* Header planilla */}
      <Card className="p-6 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">TA</div>
              <span className="font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Transportes & Administración S.A.</span>
            </div>
            <p className="text-xs text-slate-500">RUT: 76.123.456-7 · Av. Providencia 2500, Santiago</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Planilla de servicios</p>
            <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{selectedMes}</p>
            <p className="text-sm text-slate-600">Cliente: {selectedEmpresa}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          {[
            { label: 'Total servicios', value: '44' },
            { label: 'Pasajeros planificados', value: '264' },
            { label: 'Pasajeros transportados', value: '241' },
            { label: 'Valor total planilla', value: `$${total.toLocaleString('es-CL')}` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Detalle por pasajero</h2>
        </div>
        <Table
          headers={['Pasajero', 'RUT', 'Ruta', 'Días hábiles', 'Servicios', 'Plan.', 'Real', '% Asist.', 'Valor ($)']}
          rows={[...pasajeros.map(p => [
            <span className="font-medium text-slate-900">{p.nombre}</span>,
            <span className="font-mono text-xs text-slate-500">{p.rut}</span>,
            p.ruta,
            <span className="font-mono text-center block">{p.dias}</span>,
            <span className="font-mono text-center block">{p.servicios}</span>,
            <span className="font-mono text-center block">{p.pax_plan}</span>,
            <span className="font-mono text-center block">{p.pax_real}</span>,
            <span className={`font-mono font-semibold text-xs ${p.pct >= 90 ? 'text-emerald-600' : p.pct >= 80 ? 'text-amber-600' : 'text-red-500'}`}>{p.pct}%</span>,
            <span className="font-mono text-right block font-semibold text-slate-800">${p.valor.toLocaleString('es-CL')}</span>,
          ]), [
            <span className="font-bold text-slate-900">TOTAL</span>,
            '', '', '', '',
            <span className="font-mono font-bold text-center block">264</span>,
            <span className="font-mono font-bold text-center block">241</span>,
            <span className="font-mono font-bold text-emerald-600">91.3%</span>,
            <span className="font-mono font-bold text-right block text-slate-900">${total.toLocaleString('es-CL')}</span>,
          ]]}
        />
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Planilla generada el 18/08/2025 · Período: 01/08/2025 – 31/08/2025</p>
            <div className="flex gap-2">
              <ActionBtn icon={Icon.download} label="PDF" variant="secondary" />
              <ActionBtn icon={Icon.download} label="Excel" variant="secondary" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────
const screenTitles: Record<Screen, string> = {
  login: 'Inicio de sesión',
  dashboard: 'Dashboard',
  empresas: 'Empresas Clientes',
  pasajeros: 'Pasajeros',
  conductores: 'Conductores',
  vehiculos: 'Vehículos',
  rutas: 'Planificación de Rutas',
  servicios: 'Servicios Programados',
  'detalle-servicio': 'Detalle de Servicio',
  historial: 'Historial de Servicios',
  reportes: 'Reportes y Asistencias',
  planilla: 'Planilla Mensual',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')

  if (screen === 'login') {
    return <LoginScreen onLogin={() => setScreen('dashboard')} />
  }

  const title = screenTitles[screen]

  const content = () => {
    switch (screen) {
      case 'dashboard': return <DashboardScreen onNav={setScreen} />
      case 'empresas': return <EmpresasScreen />
      case 'pasajeros': return <PasajerosScreen />
      case 'conductores': return <ConductoresScreen />
      case 'vehiculos': return <VehiculosScreen />
      case 'rutas': return <RutasScreen />
      case 'servicios': return <ServiciosScreen onDetail={() => setScreen('detalle-servicio')} />
      case 'detalle-servicio': return <DetalleServicioScreen onBack={() => setScreen('servicios')} />
      case 'historial': return <HistorialScreen onDetail={() => setScreen('detalle-servicio')} />
      case 'reportes': return <ReportesScreen />
      case 'planilla': return <PlanillaScreen />
      default: return null
    }
  }

  return (
    <Layout screen={screen} onNav={setScreen} title={title}>
      {content()}
    </Layout>
  )
}
