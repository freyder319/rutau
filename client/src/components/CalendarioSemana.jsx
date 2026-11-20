import { useState } from 'react';
import { DIAS_CORTOS, hora } from '../api.js';

const H_INI = 5;
const H_FIN = 24;
const ALTO = 34; // px por hora

function posicion(inicio, fin, diaBase) {
  const ini = new Date(inicio);
  const f = new Date(fin);
  const base = new Date(diaBase);
  const finDia = new Date(base); finDia.setHours(H_FIN, 0, 0, 0);
  const iniDia = new Date(base); iniDia.setHours(H_INI, 0, 0, 0);
  const a = Math.max(ini, iniDia);
  const b = Math.min(f, finDia);
  if (b <= a) return null;
  return { top: ((a - iniDia) / 3600000) * ALTO, height: Math.max(14, ((b - a) / 3600000) * ALTO - 2) };
}

export default function CalendarioSemana({ semana, franjas, bloques, onBloque, ahora }) {
  const [y, m, d] = semana.split('-').map(Number);
  const dias = Array.from({ length: 7 }, (_, i) => new Date(y, m - 1, d + i));
  const hoyIdx = dias.findIndex((x) => x.toDateString() === new Date().toDateString());
  const [diaMovil, setDiaMovil] = useState(hoyIdx >= 0 ? hoyIdx : 0);
  const horas = Array.from({ length: H_FIN - H_INI }, (_, i) => H_INI + i);
  const ahoraD = new Date(ahora || Date.now());

  const delDia = (lista, dia) => {
    const ini = new Date(dia); const fin = new Date(dia); fin.setDate(fin.getDate() + 1);
    return lista.filter((x) => new Date(x.inicio) < fin && new Date(x.fin) > ini);
  };

  return (
    <div className="calendario">
      <div className="cal-tabs solo-movil">
        {dias.map((dia, i) => (
          <button key={i} className={`cal-tab ${i === diaMovil ? 'activa' : ''} ${i === hoyIdx ? 'hoy' : ''}`} onClick={() => setDiaMovil(i)}>
            {DIAS_CORTOS[i]}<b>{dia.getDate()}</b>
          </button>
        ))}
      </div>
      <div className="cal-grid">
        <div className="cal-horas">
          <div className="cal-cab" />
          {horas.map((h) => <div key={h} className="cal-hora" style={{ height: ALTO }}>{h < 12 ? `${h} a. m.` : h === 12 ? '12 m.' : `${h - 12} p. m.`}</div>)}
        </div>
        {dias.map((dia, i) => (
          <div key={i} className={`cal-dia ${i === diaMovil ? 'visible-movil' : ''} ${i === hoyIdx ? 'es-hoy' : ''}`}>
            <div className="cal-cab solo-escritorio">{DIAS_CORTOS[i]} <b>{dia.getDate()}</b></div>
            <div className="cal-cuerpo" style={{ height: horas.length * ALTO }}>
              {horas.map((h) => <div key={h} className="cal-linea" style={{ top: (h - H_INI) * ALTO }} />)}
              {delDia(franjas, dia).map((f, k) => {
                const p = posicion(f.inicio, f.fin, dia);
                if (!p) return null;
                return (
                  <div key={`f${k}`} className={`cal-franja ${f.tipo}`} style={p} title={f.descripcion || f.tipo}>
                    <span>{f.tipo === 'trabajo' ? 'Trabajo' : f.descripcion || 'Bloqueado'}</span>
                  </div>
                );
              })}
              {delDia(bloques, dia).map((b) => {
                const p = posicion(b.inicio, b.fin, dia);
                if (!p) return null;
                const pasado = new Date(b.fin) <= ahoraD;
                return (
                  <button key={b.id} className={`cal-bloque estado-${b.estado} ${pasado ? 'pasado' : ''}`}
                    style={{ ...p, '--c': b.color }} onClick={() => onBloque?.(b)}>
                    <strong>{b.titulo}</strong>
                    <span>{hora(b.inicio)} – {hora(b.fin)}</span>
                  </button>
                );
              })}
              {i === hoyIdx && ahoraD.getHours() >= H_INI && (
                <div className="cal-ahora" style={{ top: ((ahoraD.getHours() - H_INI) + ahoraD.getMinutes() / 60) * ALTO }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="cal-leyenda">
        <span><i className="ley trabajo" /> Trabajo</span>
        <span><i className="ley bloqueo" /> Descanso / familia</span>
        <span><i className="ley estudio" /> Bloque de estudio</span>
        <span><i className="ley cumplido" /> Cumplido</span>
      </div>
    </div>
  );
}
