import { useEffect, useState, useCallback } from 'react';
import { api, fechaHora, relativo, ESFUERZOS } from '../api.js';
import { Chip, Modal, Vacio } from '../components/comunes.jsx';
import FormEntrega from '../components/FormEntrega.jsx';
import ImportarICS from '../components/ImportarICS.jsx';
import Icono from '../components/Icono.jsx';

export default function Entregas() {
  const [datos, setDatos] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [editar, setEditar] = useState(null); // null | 'nueva' | entrega
  const [importar, setImportar] = useState(false);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => Promise.all([api('/plan'), api('/materias')]).then(([p, m]) => { setDatos(p); setMaterias(m); }), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (e, entregada) => {
    await api(`/entregas/${e.id}/estado`, { method: 'POST', body: { entregada } });
    cargar();
  };
  const eliminar = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.titulo}"?`)) return;
    await api(`/entregas/${e.id}`, { method: 'DELETE' });
    cargar();
  };

  if (!datos) return <div className="cargando">Cargando entregas…</div>;
  const pendientes = datos.entregas.filter((e) => e.estado === 'pendiente');
  const entregadas = datos.entregas.filter((e) => e.estado === 'entregada');

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div><h1>Entregas</h1><p className="tenue">Ordenadas por fecha límite. El semáforo te dice si tu tiempo alcanza.</p></div>
        <div className="botones">
          <button className="btn" onClick={() => setImportar(true)}><Icono nombre="subir" size={18} /> Importar .ics</button>
          <button className="btn btn-primario" onClick={() => setEditar('nueva')}><Icono nombre="mas_circulo" size={18} /> Nueva entrega</button>
        </div>
      </div>
      {aviso && <div className="aviso aviso-ok">{aviso}</div>}

      {!pendientes.length && <Vacio titulo="No tienes entregas pendientes"><p>Agrega una entrega o importa el calendario de tu aula virtual.</p></Vacio>}

      <div className="lista-entregas">
        {pendientes.map((e) => (
          <article key={e.id} className={`entrega borde-${e.semaforo.color}`} style={{ '--c': e.color || '#1E9BD7' }}>
            <div className="entrega-cab">
              <div>
                <span className="materia-tag">{e.materia || 'Sin materia'}</span>
                <h3>{e.titulo}</h3>
              </div>
              <Chip color={e.semaforo.color} />
            </div>
            <p className="entrega-fecha"><Icono nombre="horario" size={16} /> {fechaHora(e.fecha_limite)} · <b>{relativo(e.fecha_limite)}</b></p>
            <div className="entrega-progreso">
              <div className="barra-fondo"><div style={{ width: `${Math.min(100, (e.horas_cumplidas / e.horas_estimadas) * 100)}%` }} /></div>
              <small>{e.horas_cumplidas.toFixed(1)} de {Number(e.horas_estimadas)} h estudiadas · esfuerzo {ESFUERZOS[e.esfuerzo]?.nombre.toLowerCase()}</small>
            </div>
            <p className="motivo">{e.semaforo.motivo}</p>
            {e.proximo_bloque && <p className="tenue">Próximo bloque: {fechaHora(e.proximo_bloque.inicio)}</p>}
            <div className="entrega-acciones">
              <button className="btn btn-pequeno btn-primario" onClick={() => cambiarEstado(e, true)}><Icono nombre="checkin" size={16} /> Ya la entregué</button>
              <button className="btn-icono" onClick={() => setEditar(e)} aria-label="Editar"><Icono nombre="editar" size={18} /></button>
              <button className="btn-icono" onClick={() => eliminar(e)} aria-label="Eliminar"><Icono nombre="basura" size={18} /></button>
            </div>
          </article>
        ))}
      </div>

      {entregadas.length > 0 && (
        <section className="tarjeta">
          <h3>Entregadas</h3>
          {entregadas.map((e) => (
            <div key={e.id} className="fila-entrega" style={{ '--c': e.color || '#1E9BD7' }}>
              <div><strong>{e.titulo}</strong><small>{e.materia || 'Sin materia'} · entregada el {fechaHora(e.entregada_en)}</small></div>
              <button className="btn btn-pequeno" onClick={() => cambiarEstado(e, false)}>Deshacer</button>
            </div>
          ))}
        </section>
      )}

      {editar && (
        <Modal titulo={editar === 'nueva' ? 'Nueva entrega' : 'Editar entrega'} onClose={() => setEditar(null)}>
          <FormEntrega materias={materias} entrega={editar === 'nueva' ? null : editar}
            onGuardado={() => { setEditar(null); cargar(); }} onCancelar={() => setEditar(null)} />
        </Modal>
      )}
      {importar && (
        <Modal titulo="Importar calendario del aula virtual" onClose={() => setImportar(false)} ancho={620}>
          <ImportarICS onListo={(n) => { setImportar(false); setAviso(`Se importaron ${n} entregas y tu plan se actualizó.`); cargar(); }} />
        </Modal>
      )}
    </div>
  );
}
