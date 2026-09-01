import { useState } from 'react'
import {
  Home, Users, QrCode, Bell, MapPin, Clock, Truck,
  CheckCircle, AlertTriangle, Info, Play, Square,
  Route, ChevronRight, Scan, Flag, X, Check,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'passenger' | 'driver'
type PTab = 'home' | 'info' | 'scan' | 'notif'
type DTab = 'home' | 'passengers' | 'qr' | 'active'

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  navy: '#1B3D6E',
  navyDark: '#112849',
  navyLight: '#EEF3FB',
  orange: '#F97316',
  orangeLight: '#FFF4EC',
  green: '#10B981',
  greenLight: '#ECFDF5',
  red: '#EF4444',
  redLight: '#FEF2F2',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
}

// ─── Data ────────────────────────────────────────────────────────────────────

const SVC = {
  time: '06:45',
  date: 'Lunes 25 de agosto',
  pickup: 'Av. Circunvalación 234, Edif. A',
  destination: 'Planta Industrial Norte',
  route: 'Sede Central → Planta Norte',
  vehicle: 'Mercedes Sprinter · PLT-4821',
  driver: 'Carlos Méndez',
  status: 'Confirmado',
}

const PASSENGERS = [
  { id: 1, name: 'María González', pickup: 'Av. Circunvalación 234', confirmed: true, boarded: true },
  { id: 2, name: 'Juan Pérez', pickup: 'Calle Los Olmos 12', confirmed: true, boarded: false },
  { id: 3, name: 'Ana Rodríguez', pickup: 'Pasaje El Roble 8', confirmed: true, boarded: true },
  { id: 4, name: 'Luis Torres', pickup: 'Av. Principal 89', confirmed: false, boarded: false },
  { id: 5, name: 'Carmen Silva', pickup: 'Los Aromos 44', confirmed: true, boarded: false },
  { id: 6, name: 'Roberto Díaz', pickup: 'Av. Los Pinos 321', confirmed: true, boarded: true },
]

const NOTIFS = [
  { id: 1, type: 'delay' as const, title: 'Atraso en servicio', body: 'El servicio de mañana tendrá 15 min de retraso por obras en ruta.', time: 'Hace 2h' },
  { id: 2, type: 'change' as const, title: 'Cambio de punto de recogida', body: 'Mañana el punto de recogida es Av. Los Leones 543.', time: 'Hoy 09:15' },
  { id: 3, type: 'ok' as const, title: 'Asistencia registrada', body: 'Tu asistencia del viernes fue registrada correctamente.', time: 'Vie 18:30' },
  { id: 4, type: 'delay' as const, title: 'Ruta modificada', body: 'Por corte de calle, la ruta de regreso fue modificada.', time: 'Lun 07:20' },
]

// ─── FakeQR ───────────────────────────────────────────────────────────────────

function FakeQR({ size = 200 }: { size?: number }) {
  const n = 21
  const cs = size / n
  const isBlack = (r: number, c: number) => ((r * 23 + c * 17 + r * c * 7) % 7) > 3

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <rect width={size} height={size} fill="white" />
      {Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => {
          const inTL = r < 8 && c < 8
          const inTR = r < 8 && c >= n - 8
          const inBL = r >= n - 8 && c < 8
          if (inTL || inTR || inBL) return null
          if (r === 6 || c === 6) {
            return (r + c) % 2 === 0
              ? <rect key={`t-${r}-${c}`} x={c * cs} y={r * cs} width={cs} height={cs} fill={C.text} />
              : null
          }
          return isBlack(r, c)
            ? <rect key={`d-${r}-${c}`} x={c * cs} y={r * cs} width={cs} height={cs} fill={C.text} />
            : null
        })
      )}
      {([[0, 0], [n - 7, 0], [0, n - 7]] as [number, number][]).map(([ox, oy]) => (
        <g key={`f-${ox}-${oy}`}>
          <rect x={ox * cs} y={oy * cs} width={7 * cs} height={7 * cs} fill={C.text} />
          <rect x={(ox + 1) * cs} y={(oy + 1) * cs} width={5 * cs} height={5 * cs} fill="white" />
          <rect x={(ox + 2) * cs} y={(oy + 2) * cs} width={3 * cs} height={3 * cs} fill={C.text} />
        </g>
      ))}
    </svg>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function TopBar({ title }: { title: string }) {
  return (
    <div style={{
      padding: '16px 20px 12px',
      borderBottom: `1px solid ${C.border}`,
      background: C.card,
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h1>
    </div>
  )
}

function BigBtn({
  label, color = C.navy, textColor = 'white', onClick, Icon: Ic, outline = false
}: {
  label: string
  color?: string
  textColor?: string
  onClick?: () => void
  Icon?: React.FC<{ size: number; color: string }>
  outline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '17px 24px',
        borderRadius: 16,
        border: outline ? `2px solid ${color}` : 'none',
        background: outline ? 'transparent' : color,
        color: outline ? color : textColor,
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'opacity 0.15s',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.8')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {Ic && <Ic size={18} color={outline ? color : textColor} />}
      {label}
    </button>
  )
}

function InfoRow({
  Ic, label, value
}: {
  Ic: React.FC<{ size: number; color: string }>
  label: string
  value: string
}) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '13px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ color: C.navy, flexShrink: 0, marginTop: 1 }}>
        <Ic size={17} color={C.navy} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  )
}

function Badge({ status }: { status: 'boarded' | 'confirmed' | 'pending' }) {
  const map = {
    boarded: { bg: C.greenLight, color: C.green, label: 'Abordó' },
    confirmed: { bg: C.orangeLight, color: C.orange, label: 'Confirmado' },
    pending: { bg: C.bg, color: C.muted, label: 'Sin confirmar' },
  }
  const { bg, color, label } = map[status]
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: bg, color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function QuickRow({
  Ic, label, accent = false, onClick
}: {
  Ic: React.FC<{ size: number; color: string }>
  label: string
  accent?: boolean
  onClick?: () => void
}) {
  const color = accent ? C.orange : C.navy
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '15px 20px',
        borderBottom: `1px solid ${C.border}`,
        cursor: 'pointer',
      }}
    >
      <Ic size={18} color={color} />
      <span style={{ fontSize: 14, fontWeight: 600, color, flex: 1 }}>{label}</span>
      <ChevronRight size={15} color={C.muted} />
    </div>
  )
}

// ─── Passenger Screens ────────────────────────────────────────────────────────

function PassengerHome({ onScan }: { onScan: () => void }) {
  const [going, setGoing] = useState<'yes' | 'no' | null>(null)

  return (
    <div style={{ padding: 20, background: C.bg, minHeight: '100%' }}>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 4px' }}>Buenos días, María</p>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 18px' }}>Próximo servicio</h2>

      {/* Service card */}
      <div style={{ background: C.card, borderRadius: 22, padding: 20, marginBottom: 14, boxShadow: '0 2px 14px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 2 }}>{SVC.date}</div>
            <div style={{ fontSize: 46, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{SVC.time}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>AM</div>
          </div>
          <span style={{
            background: C.greenLight, color: C.green,
            fontSize: 12, fontWeight: 700,
            padding: '6px 14px', borderRadius: 20,
          }}>
            {SVC.status}
          </span>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <MapPin size={15} color={C.orange} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Punto de recogida</div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginTop: 2 }}>{SVC.pickup}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Route size={15} color={C.navy} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Destino</div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginTop: 2 }}>{SVC.destination}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      <p style={{ fontSize: 12, color: C.muted, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        ¿Vas a viajar mañana?
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {([
          { val: 'yes' as const, label: '✓  Voy a viajar', active: C.green, activeBg: C.greenLight },
          { val: 'no' as const, label: '✗  No voy a viajar', active: C.red, activeBg: C.redLight },
        ] as const).map(({ val, label, active, activeBg }) => (
          <button
            key={val}
            onClick={() => setGoing(val)}
            style={{
              padding: '16px 10px',
              borderRadius: 16,
              border: `2px solid ${going === val ? active : C.border}`,
              background: going === val ? activeBg : C.card,
              color: going === val ? active : C.muted,
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <BigBtn
        label="Escanear QR"
        color={C.navy}
        Icon={({ size, color }) => <Scan size={size} color={color} />}
        onClick={onScan}
      />
    </div>
  )
}

function PassengerInfo() {
  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>
      <TopBar title="Mi servicio" />
      <div style={{ padding: 20 }}>
        {/* Status banner */}
        <div style={{
          background: C.greenLight, borderRadius: 16, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
        }}>
          <CheckCircle size={22} color={C.green} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Servicio confirmado</div>
            <div style={{ fontSize: 12, color: '#059669' }}>Todo listo para el lunes</div>
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: '4px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <InfoRow Ic={({ size, color }) => <Clock size={size} color={color} />} label="Hora de salida" value="06:45 AM" />
          <InfoRow Ic={({ size, color }) => <MapPin size={size} color={color} />} label="Punto de recogida" value={SVC.pickup} />
          <InfoRow Ic={({ size, color }) => <Route size={size} color={color} />} label="Ruta" value={SVC.route} />
          <InfoRow Ic={({ size, color }) => <Truck size={size} color={color} />} label="Vehículo" value={SVC.vehicle} />
          <div style={{ display: 'flex', gap: 14, padding: '13px 0' }}>
            <Info size={17} color={C.navy} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Estado del servicio</div>
              <span style={{
                fontSize: 13, fontWeight: 700, color: C.green,
                background: C.greenLight, padding: '4px 14px', borderRadius: 20,
              }}>
                Confirmado
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: C.orangeLight, borderRadius: 16, padding: '14px 18px', display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color={C.orange} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#C2410C', margin: 0, lineHeight: 1.55 }}>
            Presentarse 5 minutos antes en el punto de recogida. El servicio no puede esperar.
          </p>
        </div>
      </div>
    </div>
  )
}

function PassengerScan() {
  const [scanned, setScanned] = useState(false)

  if (scanned) {
    return (
      <div style={{
        background: C.greenLight, minHeight: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: C.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
          boxShadow: `0 0 0 16px ${C.greenLight}, 0 0 0 24px #D1FAE5`,
        }}>
          <Check size={48} color="white" strokeWidth={3} />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>¡Asistencia registrada!</h2>
        <p style={{ fontSize: 15, color: C.muted, margin: '0 0 40px', lineHeight: 1.55 }}>
          Tu presencia en el servicio del<br />
          <strong style={{ color: C.text }}>lunes 25 de agosto</strong> fue confirmada.
        </p>
        <BigBtn label="Volver al inicio" color={C.green} onClick={() => setScanned(false)} />
      </div>
    )
  }

  return (
    <div style={{ background: '#0F172A', minHeight: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Simulated camera background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #1a2535 0%, #0d1520 100%)',
      }} />

      {/* Dark overlay with cutout */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top */}
        <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
          <p style={{ color: 'white', fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>Escanear QR del conductor</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Apunta la cámara al código QR</p>
        </div>

        {/* Viewfinder */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            {/* Corners */}
            {[
              { top: -3, left: -3, borderTop: `4px solid ${C.orange}`, borderLeft: `4px solid ${C.orange}` },
              { top: -3, right: -3, borderTop: `4px solid ${C.orange}`, borderRight: `4px solid ${C.orange}` },
              { bottom: -3, left: -3, borderBottom: `4px solid ${C.orange}`, borderLeft: `4px solid ${C.orange}` },
              { bottom: -3, right: -3, borderBottom: `4px solid ${C.orange}`, borderRight: `4px solid ${C.orange}` },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 30, height: 30, borderRadius: 3, ...s }} />
            ))}
            {/* Scan line */}
            <div style={{
              position: 'absolute', left: 12, right: 12, height: 2, top: '45%',
              background: `linear-gradient(90deg, transparent, ${C.orange}, transparent)`,
              borderRadius: 2,
            }} />
            {/* Grid overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '55px 55px',
            }} />
          </div>
        </div>

        {/* Bottom action */}
        <div style={{ padding: '0 32px 32px', textAlign: 'center' }}>
          <button
            onClick={() => setScanned(true)}
            style={{
              background: C.orange, color: 'white', border: 'none',
              padding: '15px 48px', borderRadius: 50, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', width: '100%',
            }}
          >
            Simular escaneo exitoso
          </button>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '14px 0 0' }}>
            El QR lo genera el conductor al iniciar el servicio
          </p>
        </div>
      </div>
    </div>
  )
}

function PassengerNotifs() {
  const conf = {
    delay: { Ic: AlertTriangle, color: C.orange, bg: C.orangeLight },
    change: { Ic: Info, color: C.navy, bg: C.navyLight },
    ok: { Ic: CheckCircle, color: C.green, bg: C.greenLight },
  }

  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>
      <TopBar title="Avisos" />
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {NOTIFS.map(n => {
          const { Ic, color, bg } = conf[n.type]
          return (
            <div key={n.id} style={{
              background: C.card, borderRadius: 16, padding: 16,
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
              display: 'flex', gap: 14,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ic size={19} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginBottom: 6 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{n.time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Driver Screens ───────────────────────────────────────────────────────────

function DriverHome({ onStart }: { onStart: () => void }) {
  const boarded = PASSENGERS.filter(p => p.boarded).length
  const confirmed = PASSENGERS.filter(p => p.confirmed).length
  const total = PASSENGERS.length

  return (
    <div style={{ padding: 20, background: C.bg, minHeight: '100%' }}>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 4px' }}>Buen día, Carlos</p>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 18px' }}>Mi próximo servicio</h2>

      {/* Dark service card */}
      <div style={{
        background: `linear-gradient(140deg, ${C.navy} 0%, ${C.navyDark} 100%)`,
        borderRadius: 24, padding: 22, marginBottom: 14, color: 'white',
        boxShadow: `0 8px 24px rgba(27,61,110,0.35)`,
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{SVC.date}</div>
        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1 }}>{SVC.time}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>AM · Salida</div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { Ic: Route, text: SVC.route },
            { Ic: Truck, text: SVC.vehicle },
            { Ic: Users, text: `${total} pasajeros asignados` },
          ].map(({ Ic, text }, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Ic size={15} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Confirmaciones</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{confirmed} / {total}</span>
        </div>
        <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${(confirmed / total) * 100}%`, height: '100%', background: C.navy, borderRadius: 8, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{boarded} ya abordaron</span>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{total - confirmed} sin confirmar</span>
        </div>
      </div>

      <BigBtn
        label="Iniciar servicio"
        color={C.orange}
        Icon={({ size, color }) => <Play size={size} color={color} />}
        onClick={onStart}
      />
    </div>
  )
}

function DriverPassengers() {
  const boarded = PASSENGERS.filter(p => p.boarded).length
  const confirmed = PASSENGERS.filter(p => p.confirmed).length

  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>
      <TopBar title="Pasajeros" />
      <div style={{ padding: '12px 16px' }}>
        {/* Summary row */}
        <div style={{
          background: C.card, borderRadius: 16, padding: '14px 20px',
          display: 'flex', justifyContent: 'space-around', marginBottom: 12,
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        }}>
          {[
            { label: 'Total', val: PASSENGERS.length, color: C.navy },
            { label: 'Confirmados', val: confirmed, color: C.orange },
            { label: 'Abordaron', val: boarded, color: C.green },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PASSENGERS.map(p => (
            <div key={p.id} style={{
              background: C.card, borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: p.boarded ? C.green : p.confirmed ? C.orange : C.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: p.boarded || p.confirmed ? 'white' : C.muted,
                fontSize: 16, fontWeight: 700,
              }}>
                {p.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.name}</div>
                <div style={{
                  fontSize: 12, color: C.muted,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {p.pickup}
                </div>
              </div>
              <Badge status={p.boarded ? 'boarded' : p.confirmed ? 'confirmed' : 'pending'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DriverQR() {
  const boarded = PASSENGERS.filter(p => p.boarded).length

  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>
      <TopBar title="QR del servicio" />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: C.card, borderRadius: 24, padding: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '100%', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 18, textAlign: 'center' }}>
            {SVC.date} · {SVC.time} AM
          </div>
          <div style={{ border: `3px solid ${C.navy}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <FakeQR size={192} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            SVC-2026-0825-01
          </div>
        </div>

        {/* Counter */}
        <div style={{
          background: C.card, borderRadius: 20, padding: '18px 24px',
          width: '100%', display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={26} color={C.green} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Asistencia registrada</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
              {boarded}{' '}
              <span style={{ fontSize: 16, color: C.muted, fontWeight: 500 }}>
                de {PASSENGERS.length} pasajeros
              </span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 18, lineHeight: 1.55 }}>
          Muestra este código a cada pasajero para registrar su asistencia.
        </p>
      </div>
    </div>
  )
}

function DriverActive({
  onEnd, onNav,
}: {
  onEnd: () => void
  onNav: (tab: DTab) => void
}) {
  const [showIncident, setShowIncident] = useState(false)
  const [incidentSent, setIncidentSent] = useState(false)

  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>
      {/* Active header */}
      <div style={{
        background: `linear-gradient(140deg, ${C.navy} 0%, ${C.navyDark} 100%)`,
        padding: '18px 20px 22px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Servicio activo</h2>
          <div style={{
            background: 'rgba(255,255,255,0.15)', padding: '4px 12px',
            borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1,
          }}>
            EN CURSO
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, marginBottom: 4 }}>{SVC.time} AM</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{SVC.route}</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Pasajeros', val: PASSENGERS.length, Ic: Users, color: C.navy },
            { label: 'Abordaron', val: PASSENGERS.filter(p => p.boarded).length, Ic: CheckCircle, color: C.green },
          ].map(({ label, val, Ic, color }) => (
            <div key={label} style={{
              background: C.card, borderRadius: 16, padding: '16px 18px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            }}>
              <Ic size={20} color={color} />
              <div style={{ fontSize: 32, fontWeight: 800, color, marginTop: 8, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <QuickRow
            Ic={({ size, color }) => <Users size={size} color={color} />}
            label="Ver lista de pasajeros"
            onClick={() => onNav('passengers')}
          />
          <QuickRow
            Ic={({ size, color }) => <QrCode size={size} color={color} />}
            label="Mostrar QR del servicio"
            onClick={() => onNav('qr')}
          />
          <div
            onClick={() => setShowIncident(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '15px 20px', cursor: 'pointer',
            }}
          >
            <AlertTriangle size={18} color={C.orange} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.orange, flex: 1 }}>
              Informar atraso o incidente
            </span>
            <ChevronRight size={15} color={C.muted} />
          </div>
        </div>

        {/* Incident panel */}
        {showIncident && !incidentSent && (
          <div style={{
            background: C.orangeLight, border: `1px solid ${C.orange}30`,
            borderRadius: 16, padding: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#C2410C', fontSize: 15 }}>¿Qué ocurre?</span>
              <button onClick={() => setShowIncident(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Atraso en tráfico', 'Problema con el vehículo', 'Cambio de ruta', 'Otro'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { setIncidentSent(true); setShowIncident(false) }}
                  style={{
                    padding: '13px 16px', borderRadius: 12,
                    border: `1px solid ${C.orange}30`,
                    background: 'white', color: C.text,
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {incidentSent && (
          <div style={{
            background: C.greenLight, borderRadius: 14, padding: '13px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle size={18} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Incidencia notificada correctamente</span>
          </div>
        )}

        <BigBtn
          label="Finalizar servicio"
          color={C.red}
          Icon={({ size, color }) => <Square size={size} color={color} />}
          onClick={onEnd}
        />
      </div>
    </div>
  )
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

type NavDef<T extends string> = { id: T; label: string; Ic: React.FC<{ size: number; color: string }> }

function BottomNav<T extends string>({
  items, active, onSelect,
}: {
  items: NavDef<T>[]
  active: T
  onSelect: (id: T) => void
}) {
  return (
    <div style={{ display: 'flex', background: C.card, borderTop: `1px solid ${C.border}` }}>
      {items.map(({ id, label, Ic }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 4px 8px', background: 'none', border: 'none',
              cursor: 'pointer', gap: 4, color: isActive ? C.navy : C.muted,
              transition: 'color 0.15s',
            }}
          >
            <Ic size={22} color={isActive ? C.navy : C.muted} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: 0.2 }}>{label}</span>
            <div style={{
              width: 4, height: 4, borderRadius: '50%',
              background: isActive ? C.navy : 'transparent',
              transition: 'background 0.15s',
            }} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div style={{
      background: C.card,
      padding: '10px 22px 6px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>12:30</span>
      <div style={{ width: 110, height: 28, background: '#0A0A0A', borderRadius: 20, marginTop: -4 }} />
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {/* Signal bars */}
        <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 12 }}>
          {[4, 7, 10, 12].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i < 3 ? C.text : C.border, borderRadius: 1.5 }} />
          ))}
        </div>
        {/* Battery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <div style={{ width: 22, height: 12, border: `1.5px solid ${C.text}`, borderRadius: 3, padding: '1.5px', display: 'flex' }}>
            <div style={{ width: '72%', background: C.text, borderRadius: 1 }} />
          </div>
          <div style={{ width: 2, height: 5, background: C.text, borderRadius: 1, opacity: 0.5 }} />
        </div>
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

const pNavItems: NavDef<PTab>[] = [
  { id: 'home', label: 'Inicio', Ic: ({ size, color }) => <Home size={size} color={color} /> },
  { id: 'info', label: 'Mi servicio', Ic: ({ size, color }) => <Info size={size} color={color} /> },
  { id: 'scan', label: 'Escanear', Ic: ({ size, color }) => <Scan size={size} color={color} /> },
  { id: 'notif', label: 'Avisos', Ic: ({ size, color }) => <Bell size={size} color={color} /> },
]

const dNavItems: NavDef<DTab>[] = [
  { id: 'home', label: 'Inicio', Ic: ({ size, color }) => <Home size={size} color={color} /> },
  { id: 'passengers', label: 'Pasajeros', Ic: ({ size, color }) => <Users size={size} color={color} /> },
  { id: 'qr', label: 'QR', Ic: ({ size, color }) => <QrCode size={size} color={color} /> },
  { id: 'active', label: 'Activo', Ic: ({ size, color }) => <Flag size={size} color={color} /> },
]

export default function App() {
  const [role, setRole] = useState<Role>('passenger')
  const [pTab, setPTab] = useState<PTab>('home')
  const [dTab, setDTab] = useState<DTab>('home')

  function renderScreen() {
    if (role === 'passenger') {
      if (pTab === 'home') return <PassengerHome onScan={() => setPTab('scan')} />
      if (pTab === 'info') return <PassengerInfo />
      if (pTab === 'scan') return <PassengerScan />
      if (pTab === 'notif') return <PassengerNotifs />
    } else {
      if (dTab === 'home') return <DriverHome onStart={() => setDTab('active')} />
      if (dTab === 'passengers') return <DriverPassengers />
      if (dTab === 'qr') return <DriverQR />
      if (dTab === 'active') return <DriverActive onEnd={() => setDTab('home')} onNav={setDTab} />
    }
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(150deg, #1B3D6E 0%, #0F172A 55%, #162235 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '32px 0 40px',
      fontFamily: "'DM Sans', sans-serif",
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
          TransportApp · Mockup
        </div>

        {/* Role toggle */}
        <div style={{
          display: 'inline-flex', background: 'rgba(255,255,255,0.08)',
          borderRadius: 50, padding: 4, gap: 2,
        }}>
          {(['passenger', 'driver'] as Role[]).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding: '8px 22px', borderRadius: 50, border: 'none',
                background: role === r ? 'white' : 'transparent',
                color: role === r ? C.navy : 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {r === 'passenger' ? '👤 Pasajero' : '🚌 Conductor'}
            </button>
          ))}
        </div>
      </div>

      {/* Phone frame */}
      <div style={{
        width: 390,
        background: '#0D0D0D',
        borderRadius: 52,
        padding: '0',
        boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.09), inset 0 0 0 1px rgba(255,255,255,0.05)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Inner screen */}
        <div style={{
          background: C.bg,
          margin: '8px 5px',
          borderRadius: 46,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 826,
        }}>
          <StatusBar />

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
            {renderScreen()}
          </div>

          {/* Bottom nav */}
          {role === 'passenger'
            ? <BottomNav items={pNavItems} active={pTab} onSelect={setPTab} />
            : <BottomNav items={dNavItems} active={dTab} onSelect={setDTab} />
          }

          {/* Home indicator */}
          <div style={{ background: C.card, paddingBottom: 10, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <div style={{ width: 120, height: 4, background: C.text, borderRadius: 4, opacity: 0.18 }} />
          </div>
        </div>
      </div>

      {/* Screen label */}
      <div style={{ marginTop: 20, color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
        {role === 'passenger'
          ? pNavItems.find(n => n.id === pTab)?.label
          : dNavItems.find(n => n.id === dTab)?.label
        }
      </div>
    </div>
  )
}
