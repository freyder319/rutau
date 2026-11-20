import { useEffect, useState } from 'react';
import { api, descargar, fechaHora } from '../api.js';
import Icono from '../components/Icono.jsx';

const ETIQUETAS = {
  trabaja: { titulo: '¿Trabaja mientras estudia?', o: { completo: 'Tiempo completo', medio: 'Medio tiempo', turnos: 'Por turnos', no: 'No' } },
  atrasos_trabajo: { titulo: 'Entregas atrasadas por el trabajo (último semestre)', o: { nunca: 'Nunca', una: 'Una vez', varias: 'Varias veces', casi_siempre: 'Casi siempre' } },
  detecta_atraso: { titulo: '¿Cuándo se da cuenta del atraso?', o: { antes: 'Antes de la fecha', mismo_dia: 'El día de la entrega', vencida: 'Cuando ya venció', nota: 'Cuando ve la nota' } },
  herramienta: { titulo: 'Herramienta que usa para organizarse', o: { ninguna: 'Ninguna', calendario: 'Calendario del celular', agenda: 'Agenda o cuaderno', app_tareas: 'App de tareas', otra: 'Otra' } },
  penso_retirarse: { titulo: '¿Ha pensado en retirarse o aplazar?', o: { si: 'Sí', no: 'No' } },
  uso_semanal: { titulo: '¿Usaría RutaU cada semana?', o: { si: 'Sí', tal_vez: 'Tal vez', no: 'No' } },
  pagaria: { titulo: '¿Pagaría una suscripción?', o: { si: 'Sí', tal_vez: 'Tal vez', no: 'No' } },
  modalidad: { titulo: 'Modalidad', o: { virtual: 'Virtual', distancia: 'A distancia', presencial: 'Presencial', hibrida: 'Híbrida' } },
  semestre: { titulo: 'Semestre', o: {} },
  horas_estudio: { titulo: 'Horas de estudio por semana', o: {} },
};

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <div className="tarjeta metrica">
      <span>{titulo}</span>
      <b>{valor ?? '—'}</b>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}

function Barras({ dist, etiquetas = {} }) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  return (
    <div className="barras">
      {Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
        <div key={k} className="barra-fila">
          <span>{etiquetas[k] || k}</span>
          <div className="barra-fondo"><div style={{ width: `${(v / total) * 100}%` }} /></div>
          <b>{v} ({Math.round((v / total) * 100)} %)</b>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const [m, setM] = useState(null);
  const cargar = () => api('/admin/metricas').then(setM);
  useEffect(() => { cargar(); }, []);
  if (!m) return <div className="cargando">Calculando métricas…</div>;
  const p = (v) => (v === null || v === undefined ? '—' : `${v} %`);

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div><h1>Panel del equipo</h1><p className="tenue">Métricas del piloto de validación · actualizado {fechaHora(m.generado_en)} · no incluye al equipo</p></div>
        <div className="botones">
          <button className="btn" onClick={cargar}><Icono nombre="recargar" size={18} /> Actualizar</button>
          <button className="btn" onClick={() => descargar('/admin/encuesta.csv', 'rutau_encuesta.csv')}><Icono nombre="descargar" size={18} /> Encuesta CSV</button>
          <button className="btn" onClick={() => descargar('/admin/usuarios.csv', 'rutau_usuarios_anonimos.csv')}><Icono nombre="descargar" size={18} /> Uso CSV</button>
        </div>
      </div>

      <div className="grid-metricas">
        <Tarjeta titulo="Personas que probaron" valor={m.usuarios.total} detalle={`${m.usuarios.registrados} con cuenta · ${m.usuarios.invitados} con datos de ejemplo`} />
        <Tarjeta titulo="Activación" valor={p(m.activacion.porcentaje)} detalle={`${m.activacion.activados} de ${m.activacion.base} registraron horario y 3+ entregas el primer día`} />
        <Tarjeta titulo="Uso 3+ días/semana" valor={p(m.uso.porcentaje_tres_o_mas)} detalle={`${m.uso.tres_o_mas} de ${m.uso.activos_7d} activos · ${m.uso.dias_promedio} días en promedio`} />
        <Tarjeta titulo="Entregas a tiempo" valor={p(m.entregas.porcentaje_a_tiempo)} detalle={`${m.entregas.a_tiempo} de ${m.entregas.entregadas} entregadas`} />
        <Tarjeta titulo="Bloques cumplidos" valor={p(m.bloques.porcentaje_cumplimiento)} detalle={`${m.bloques.cumplidos} cumplidos · ${m.bloques.no_cumplidos} no cumplidos`} />
        <Tarjeta titulo='Clic en "Quiero Premium"' valor={p(m.premium.porcentaje)} detalle={`${m.premium.usuarios} personas · ${m.premium.vistas} vieron la oferta`} />
      </div>

      <section className="tarjeta">
        <h3>Hipótesis del piloto</h3>
        <table className="tabla">
          <thead><tr><th>ID</th><th>Hipótesis</th><th>Criterio de éxito</th><th>Resultado</th><th>Base</th><th>¿Cumple?</th></tr></thead>
          <tbody>
            {m.hipotesis.map((h) => (
              <tr key={h.id}>
                <td><b>{h.id}</b></td><td>{h.descripcion}</td><td>{h.criterio}</td><td>{p(h.valor)}</td><td>n = {h.base}</td>
                <td>{h.cumple === null ? 'Sin datos' : h.cumple ? <span className="chip chip-verde">Sí</span> : <span className="chip chip-rojo">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cabecera"><h3>Encuesta de validación</h3><span className="tenue">{m.encuesta.n} respuestas</span></div>
        {m.encuesta.n === 0 ? <p className="tenue">Todavía no hay respuestas.</p> : (
          <>
            <div className="grid-metricas">
              <Tarjeta titulo="Utilidad (1 a 5)" valor={m.encuesta.promedios.utilidad} />
              <Tarjeta titulo="Facilidad de uso (1 a 5)" valor={m.encuesta.promedios.facilidad} />
              <Tarjeta titulo="Ajuste al horario (1 a 5)" valor={m.encuesta.promedios.ajuste_horario} />
            </div>
            <div className="grid-distribuciones">
              {Object.entries(ETIQUETAS).map(([k, e]) => (
                <div key={k} className="distribucion">
                  <h4>{e.titulo}</h4>
                  <Barras dist={m.encuesta.distribuciones[k] || {}} etiquetas={e.o} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {m.encuesta.comentarios.length > 0 && (
        <section className="tarjeta">
          <h3>Comentarios de los usuarios</h3>
          <div className="comentarios">
            {m.encuesta.comentarios.map((c, i) => (
              <div key={i} className="comentario">
                {c.gusto && <p><b>Le gustó:</b> {c.gusto}</p>}
                {c.mejorar && <p><b>Mejoraría:</b> {c.mejorar}</p>}
                <small>{fechaHora(c.fecha)}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="tarjeta">
        <h3>Eventos de uso</h3>
        <table className="tabla">
          <thead><tr><th>Evento</th><th>Veces</th><th>Personas</th></tr></thead>
          <tbody>{m.eventos.map((e) => <tr key={e.tipo}><td>{e.tipo}</td><td>{e.total}</td><td>{e.usuarios}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
