import { useEffect, useState } from 'react';
import { api, evento } from '../api.js';
import { useAuth } from '../auth.jsx';
import Prorroga from '../components/Prorroga.jsx';
import Icono from '../components/Icono.jsx';
import { Error } from '../components/comunes.jsx';

const CATEGORIAS = { bienestar: 'Bienestar', academico: 'Académico', financiacion: 'Financiación' };

export default function Apoyos() {
  const { usuario } = useAuth();
  const [apoyos, setApoyos] = useState([]);
  const [f, setF] = useState({ nombre: '', url: '', categoria: 'bienestar' });
  const [prorroga, setProrroga] = useState(false);
  const [error, setError] = useState('');
  const cargar = () => api('/apoyos').then(setApoyos);
  useEffect(() => { cargar(); }, []);

  const agregar = async (e) => {
    e.preventDefault(); setError('');
    try { await api('/apoyos', { method: 'POST', body: f }); setF({ nombre: '', url: '', categoria: 'bienestar' }); cargar(); } catch (err) { setError(err.message); }
  };
  const borrar = async (a) => { await api(`/apoyos/${a.id}`, { method: 'DELETE' }); cargar(); };

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div><h1>Apoyos</h1><p className="tenue">No tienes que resolverlo solo. Estos son los apoyos a los que puedes acudir cuando el semáforo se pone en rojo.</p></div>
      </div>
      <div className="grid-apoyos">
        {apoyos.map((a) => (
          <article key={a.id} className={`tarjeta apoyo cat-${a.categoria}`}>
            <span className="materia-tag">{CATEGORIAS[a.categoria] || a.categoria}</span>
            <h3>{a.nombre}</h3>
            {a.descripcion && <p>{a.descripcion}</p>}
            <div className="acciones izquierda">
              {a.url && <a className="btn btn-pequeno btn-primario" href={a.url} target="_blank" rel="noreferrer" onClick={() => evento('apoyo_click', { id: a.id })}>Abrir enlace</a>}
              {a.nombre.toLowerCase().includes('prórroga') && <button className="btn btn-pequeno" onClick={() => setProrroga(true)}><Icono nombre="copiar" size={16} /> Ver mensaje modelo</button>}
              {a.propio && <button className="btn-icono" onClick={() => borrar(a)} aria-label="Quitar"><Icono nombre="basura" size={18} /></button>}
            </div>
          </article>
        ))}
      </div>
      <section className="tarjeta estrecha">
        <h3>Agrega los apoyos de tu institución</h3>
        <form className="formulario" onSubmit={agregar}>
          <label>Nombre<input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej.: Bienestar universitario Poli" required /></label>
          <div className="fila-2">
            <label>Enlace<input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" /></label>
            <label>Tipo
              <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
                {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <Error msg={error} />
          <button className="btn btn-primario">Guardar apoyo</button>
        </form>
      </section>
      {prorroga && <Prorroga entrega={null} nombre={usuario?.es_invitado ? '' : usuario?.nombre} onClose={() => setProrroga(false)} />}
    </div>
  );
}
