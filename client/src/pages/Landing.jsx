import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Logo } from '../components/Layout.jsx';
import Icono from '../components/Icono.jsx';

export default function Landing() {
  const { entrar } = useAuth();
  const nav = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const probar = async () => {
    setCargando(true); setError('');
    try {
      const r = await api('/auth/invitado', { method: 'POST' });
      entrar(r.token, r.usuario);
      nav('/semana');
    } catch (e) { setError(e.message); setCargando(false); }
  };

  return (
    <div className="landing">
      <header className="landing-barra">
        <Logo claro />
        <div>
          <Link to="/ingresar" className="btn btn-claro">Ingresar</Link>
        </div>
      </header>
      <section className="hero">
        <div className="hero-texto">
          <span className="etiqueta">Para estudiantes que trabajan</span>
          <h1>Estudia y trabaja <span>sin perder el semestre</span></h1>
          <p>RutaU convierte tus turnos de trabajo y tus fechas de entrega en un plan de estudio semanal realista,
            te avisa antes de que te atrases y se reorganiza cuando te cambian el turno.</p>
          <div className="hero-acciones">
            <button className="btn btn-coral grande" onClick={probar} disabled={cargando}>
              <Icono nombre="rayo" size={18} /> {cargando ? 'Preparando tu semana…' : 'Probar con datos de ejemplo'}
            </button>
            <Link to="/registro" className="btn btn-claro grande">Crear mi cuenta</Link>
          </div>
          {error && <p className="error claro">{error}</p>}
          <small>Gratis. Sin instalar nada: funciona en el celular y en el computador.</small>
        </div>
        <div className="hero-tarjeta" aria-hidden="true">
          <div className="mini-semaforo"><span className="luz luz-rojo" /><span className="luz luz-amarillo" /><span className="luz luz-verde encendida" /></div>
          <p className="mini-titulo">Esta semana vas al día</p>
          <div className="mini-bloque" style={{ '--c': '#1E9BD7' }}><b>Quiz semana 5</b><span>Mar 6:00 – 7:30 a. m.</span></div>
          <div className="mini-bloque" style={{ '--c': '#E07A5F' }}><b>Taller de algoritmos</b><span>Mar 8:00 – 10:00 p. m.</span></div>
          <div className="mini-bloque" style={{ '--c': '#2A9D8F' }}><b>Foro de inglés</b><span>Mié 5:30 – 6:30 p. m.</span></div>
        </div>
      </section>
      <section className="beneficios">
        {[
          ['horario', 'Plan alrededor de tu trabajo', 'Registra tus turnos fijos o rotativos y RutaU ubica bloques de estudio solo en tus horas libres.'],
          ['campana', 'Alertas antes de atrasarte', 'Recordatorios 72 y 24 horas antes de cada entrega y un semáforo que se pone en amarillo o rojo a tiempo.'],
          ['recargar', 'Se ajusta cuando cambias de turno', 'Marca lo que cumpliste en el check-in semanal y el plan se recalcula solo.'],
          ['apoyo', 'Apoyos de tu institución', 'Si el semáforo está en rojo, te sugerimos qué hacer: reorganizar, pedir prórroga o acudir a bienestar.'],
        ].map(([i, t, d]) => (
          <article key={t} className="beneficio">
            <span className="beneficio-icono"><Icono nombre={i} /></span>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>
      <footer className="landing-pie">
        RutaU · MVP del proyecto de Emprendimiento de Base Tecnológica · Politécnico Grancolombiano, 2026
      </footer>
    </div>
  );
}
