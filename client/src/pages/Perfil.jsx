import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Error } from '../components/comunes.jsx';

export default function Perfil() {
  const { usuario, setUsuario, salir } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    nombre: usuario.nombre, institucion: usuario.institucion || '', programa: usuario.programa || '',
    semestre: usuario.semestre || '', recordatorios_correo: usuario.recordatorios_correo,
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try {
      const r = await api('/auth/preferencias', { method: 'PUT', body: { ...f, semestre: Number(f.semestre) || null } });
      setUsuario(r.usuario); setMsg('Datos guardados.');
    } catch (err) { setError(err.message); }
  };
  const prueba = async () => {
    const r = await api('/notificaciones/prueba', { method: 'POST' });
    setMsg(r.ok ? `Te enviamos un recordatorio de prueba${r.correo ? ' a tu correo y' : ''} a la campana de notificaciones.` : r.motivo);
  };
  const demo = async () => {
    if (!window.confirm('Esto reemplaza tus materias, turnos y entregas por datos de ejemplo. ¿Continuar?')) return;
    await api('/demo/cargar', { method: 'POST' });
    nav('/semana');
  };

  return (
    <div className="pagina">
      <div className="cabecera-pagina"><div><h1>Mi perfil</h1><p className="tenue">{usuario.correo}</p></div></div>
      {msg && <div className="aviso aviso-ok">{msg}</div>}
      <div className="dos-columnas">
        <section className="tarjeta">
          <h3>Tus datos</h3>
          <form className="formulario" onSubmit={guardar}>
            <label>Nombre<input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
            <label>Institución<input value={f.institucion} onChange={(e) => setF({ ...f, institucion: e.target.value })} /></label>
            <div className="fila-2">
              <label>Programa<input value={f.programa} onChange={(e) => setF({ ...f, programa: e.target.value })} /></label>
              <label>Semestre<input type="number" min="1" max="12" value={f.semestre} onChange={(e) => setF({ ...f, semestre: e.target.value })} /></label>
            </div>
            <label className="check">
              <input type="checkbox" checked={f.recordatorios_correo} onChange={(e) => setF({ ...f, recordatorios_correo: e.target.checked })} />
              <span>Quiero recibir los recordatorios de 72 y 24 horas también por correo.</span>
            </label>
            <Error msg={error} />
            <button className="btn btn-primario">Guardar</button>
          </form>
        </section>
        <section className="tarjeta">
          <h3>Herramientas</h3>
          <p className="tenue">Envía un recordatorio de prueba de tu entrega más próxima para ver cómo llegan los avisos.</p>
          <button className="btn" onClick={prueba}>Enviar recordatorio de prueba</button>
          <hr />
          <p className="tenue">¿Quieres ver cómo funciona RutaU con un semestre de ejemplo?</p>
          <button className="btn" onClick={demo}>Cargar datos de ejemplo</button>
          <hr />
          <button className="btn btn-texto" onClick={() => { salir(); nav('/'); }}>Cerrar sesión</button>
        </section>
      </div>
    </div>
  );
}
