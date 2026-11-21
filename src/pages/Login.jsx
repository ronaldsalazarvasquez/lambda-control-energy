import { useState, lazy, Suspense, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { BeezMark } from '../components/Layout'
import LoginScene from '../components/LoginScene'
const EnergyScene3D = lazy(() => import('../components/EnergyScene3D'))
import { ROLES } from '../lib/saas'
import { DEMO_PASSWORD } from '../data/seed'

const DEMO = ['u-ronald', 'u-carlos', 'u-jorge', 'u-lucia', 'u-pedro']
export const homeFor = (u) => (u.role === 'superadmin' ? '/consola' : u.role === 'integrator' ? '/plantas' : '/')

export default function Login() {
  const nav = useNavigate()
  const { directory, login } = useStore()
  const [email, setEmail] = useState('ronald.salazar@beezcorp.com')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [no3d, setNo3d] = useState(false)
  const fail3d = useCallback(() => setNo3d(true), [])

  const submit = (e) => {
    e?.preventDefault()
    setErr('')
    if (!directory.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) return setErr('No existe una cuenta con ese correo.')
    if (pass !== DEMO_PASSWORD) return setErr('Contraseña incorrecta.')
    setBusy(true)
    setTimeout(() => { const u = login(email); setBusy(false); nav(homeFor(u), { replace: true }) }, 650)
  }
  const pickDemo = (u) => { setEmail(u.email); setPass(DEMO_PASSWORD); setErr('') }

  return (
    <div className="login">
      {no3d ? <LoginScene /> : <Suspense fallback={<LoginScene />}><EnergyScene3D onFail={fail3d} /></Suspense>}
      <div className="login-veil" />
      <section className="login-side">
        <div className="login-brand"><BeezMark size={38} /><div><b>BEEZ</b><span>INDUSTRIES</span></div></div>
        <div className="login-copy">
          <Headline />
        </div>
      </section>

      <section className="login-main">
        <form className="login-card" onSubmit={submit}>
          <h2>Iniciar sesión</h2>
          <p className="muted sm">Accede al sistema de gestión de energía de tu planta.</p>
          <label className="field mt16"><span>Correo electrónico</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
          <label className="field mt12"><span>Contraseña</span>
            <div className="pass"><input type={show ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" className="icon-btn sm" onClick={() => setShow(!show)}>{show ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
          </label>
          <div className="row between mt12 sm"><label className="check"><input type="checkbox" defaultChecked /> Recordarme</label><a className="link sm" href="#/" onClick={(e) => e.preventDefault()}>¿Olvidaste tu contraseña?</a></div>
          {err && <div className="login-err">{err}</div>}
          <button className="btn primary login-btn" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <>Ingresar <ArrowRight size={16} /></>}</button>

          <div className="demo">
            <div className="demo-h"><span>Cuentas de demostración</span><small>contraseña: <b className="mono">{DEMO_PASSWORD}</b></small></div>
            {DEMO.map((id) => directory.find((u) => u.id === id)).filter(Boolean).map((u) => (
              <button type="button" key={u.id} className={`demo-i ${email === u.email ? 'on' : ''}`} onClick={() => pickDemo(u)}>
                <span className="avatar sm">{u.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
                <span className="grow"><b>{u.name}</b><small>{u.email}</small></span>
                <span className={`role-tag r-${u.role}`}>{ROLES[u.role].short}</span>
              </button>
            ))}
          </div>
        </form>
        <p className="muted xs center">© {new Date().getFullYear()} Beez Corp · Sistema de Gestión de Energía</p>
      </section>
    </div>
  )
}


// Frase principal
function Headline() {
  return (
    <>
      <h1 className="headline"><span>Lo que se mide,</span><span className="hl-accent">se ahorra.</span></h1>
      <span className="login-sub">Beez · Gestión energética industrial</span>
    </>
  )
}
