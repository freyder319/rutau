import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Icono from './Icono.jsx';
import Notificaciones from './Notificaciones.jsx';
import PremiumModal from './PremiumModal.jsx';

const PRINCIPAL = [
  { to: '/semana', nombre: 'Mi semana', icono: 'semana' },
  { to: '/entregas', nombre: 'Entregas', icono: 'entregas' },
  { to: '/horario', nombre: 'Horario', icono: 'horario' },
  { to: '/checkin', nombre: 'Check-in', icono: 'checkin' },
];
const SECUNDARIO = [
  { to: '/materias', nombre: 'Materias', icono: 'materias' },
  { to: '/apoyos', nombre: 'Apoyos', icono: 'apoyo' },
  { to: '/opinion', nombre: 'Danos tu opinión', icono: 'opinion' },
  { to: '/perfil', nombre: 'Mi perfil', icono: 'usuario' },
];

export function Logo({ claro = false }) {
  return (
    <span className={`logo ${claro ? 'logo-claro' : ''}`}>
      <img src="/icon-192.png" alt="" width="30" height="30" />
      <span>Ruta<b>U</b></span>
    </span>
  );
}

export default function Layout({ children }) {
  const { usuario, salir } = useAuth();
  const [premium, setPremium] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const extra = usuario?.admin ? [...SECUNDARIO, { to: '/admin', nombre: 'Panel del equipo', icono: 'grafica' }] : SECUNDARIO;

  const cerrar = () => { salir(); nav('/'); };

  return (
    <div className="app">
      <aside className="lateral">
        <Logo claro />
        <nav>
          {[...PRINCIPAL, ...extra].map((i) => (
            <NavLink key={i.to} to={i.to} className="lateral-link">
              <Icono nombre={i.icono} /> {i.nombre}
            </NavLink>
          ))}
        </nav>
        <button className="btn-premium" onClick={() => setPremium(true)}><Icono nombre="estrella" size={18} /> Quiero Premium</button>
        <button className="lateral-link salir" onClick={cerrar}><Icono nombre="salir" /> Cerrar sesión</button>
      </aside>

      <div className="contenido">
        <header className="barra">
          <span className="solo-movil"><Logo /></span>
          <span className="saludo solo-escritorio">{usuario?.es_invitado ? 'Estás probando RutaU con datos de ejemplo' : `Hola, ${usuario?.nombre?.split(' ')[0] || ''}`}</span>
          <div className="barra-acciones">
            <button className="btn-premium compacto solo-movil" onClick={() => setPremium(true)} aria-label="Premium"><Icono nombre="estrella" size={18} /></button>
            <Notificaciones />
          </div>
        </header>
        {usuario?.es_invitado && (
          <div className="aviso-invitado">
            Modo de prueba con datos de ejemplo. Cuando termines, cuéntanos qué te pareció en <NavLink to="/opinion">Danos tu opinión</NavLink>.
          </div>
        )}
        <main className="principal">{children}</main>
      </div>

      <nav className="inferior">
        {PRINCIPAL.map((i) => (
          <NavLink key={i.to} to={i.to} className="inferior-link"><Icono nombre={i.icono} /><span>{i.nombre}</span></NavLink>
        ))}
        <button className="inferior-link" onClick={() => setMenu(true)}><Icono nombre="mas" /><span>Más</span></button>
      </nav>

      {menu && (
        <div className="hoja-fondo" onClick={() => setMenu(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            {extra.map((i) => (
              <NavLink key={i.to} to={i.to} className="hoja-link" onClick={() => setMenu(false)}><Icono nombre={i.icono} /> {i.nombre}</NavLink>
            ))}
            <button className="hoja-link" onClick={cerrar}><Icono nombre="salir" /> Cerrar sesión</button>
          </div>
        </div>
      )}
      {premium && <PremiumModal onClose={() => setPremium(false)} />}
    </div>
  );
}
