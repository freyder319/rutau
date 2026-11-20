import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Logo } from '../components/Layout.jsx';
import { Error } from '../components/comunes.jsx';

function Marco({ titulo, children }) {
  return (
    <div className="acceso">
      <Link to="/" className="acceso-logo"><Logo /></Link>
      <div className="tarjeta acceso-tarjeta">
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Ingresar() {
  const { entrar } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');
  const enviar = async (e) => {
    e.preventDefault(); setError('');
    try {
      const r = await api('/auth/login', { method: 'POST', body: f });
      entrar(r.token, r.usuario);
      nav('/semana');
    } catch (err) { setError(err.message); }
  };
  return (
    <Marco titulo="Ingresar a RutaU">
      <form onSubmit={enviar} className="formulario">
        <label>Correo<input type="email" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} required autoFocus /></label>
        <label>Contraseña<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></label>
        <Error msg={error} />
        <button className="btn btn-primario ancho">Ingresar</button>
      </form>
      <p className="tenue centro">¿No tienes cuenta? <Link to="/registro">Créala aquí</Link></p>
    </Marco>
  );
}

export function Registro() {
  const { entrar } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ nombre: '', correo: '', password: '', institucion: '', programa: '', semestre: '', acepta: false });
  const [error, setError] = useState('');
  const c = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const enviar = async (e) => {
    e.preventDefault(); setError('');
    try {
      const r = await api('/auth/registro', { method: 'POST', body: { ...f, semestre: Number(f.semestre) || null } });
      entrar(r.token, r.usuario);
      nav('/bienvenida');
    } catch (err) { setError(err.message); }
  };
  return (
    <Marco titulo="Crea tu cuenta">
      <form onSubmit={enviar} className="formulario">
        <label>Nombre<input value={f.nombre} onChange={c('nombre')} required autoFocus /></label>
        <label>Correo<input type="email" value={f.correo} onChange={c('correo')} required /></label>
        <label>Contraseña<input type="password" value={f.password} onChange={c('password')} minLength={8} required placeholder="Mínimo 8 caracteres" /></label>
        <label>Institución<input value={f.institucion} onChange={c('institucion')} placeholder="Ej.: Politécnico Grancolombiano" /></label>
        <div className="fila-2">
          <label>Programa<input value={f.programa} onChange={c('programa')} /></label>
          <label>Semestre<input type="number" min="1" max="12" value={f.semestre} onChange={c('semestre')} /></label>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.acepta} onChange={c('acepta')} />
          <span>Autorizo el tratamiento de mis datos personales para usar RutaU, de acuerdo con la Ley 1581 de 2012. Solo los usamos para armar mi plan y enviarme recordatorios.</span>
        </label>
        <Error msg={error} />
        <button className="btn btn-primario ancho">Crear cuenta</button>
      </form>
      <p className="tenue centro">¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></p>
    </Marco>
  );
}
