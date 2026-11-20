import { useEffect } from 'react';
import Icono from './Icono.jsx';

export function Modal({ titulo, onClose, children, ancho = 520 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal" style={{ maxWidth: ancho }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="modal-cabecera">
          <h3>{titulo}</h3>
          <button className="btn-icono" onClick={onClose} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TEXTO = { verde: 'Vas al día', amarillo: 'Atención', rojo: 'En riesgo', entregada: 'Entregada' };

export function Chip({ color, children }) {
  return <span className={`chip chip-${color}`}><span className="punto" />{children || TEXTO[color]}</span>;
}

export function Semaforo({ color, grande = false }) {
  return (
    <div className={`semaforo ${grande ? 'semaforo-grande' : ''}`} aria-label={`Semáforo ${color}`}>
      {['rojo', 'amarillo', 'verde'].map((c) => <span key={c} className={`luz luz-${c} ${c === color ? 'encendida' : ''}`} />)}
    </div>
  );
}

export function Anillo({ valor, etiqueta }) {
  const v = valor ?? 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="anillo">
      <svg viewBox="0 0 80 80" width="88" height="88">
        <circle cx="40" cy="40" r={r} stroke="#E3F1FB" strokeWidth="9" fill="none" />
        <circle cx="40" cy="40" r={r} stroke="#1E9BD7" strokeWidth="9" fill="none" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
        <text x="40" y="45" textAnchor="middle" fontSize="17" fontWeight="700" fill="#17324D">{valor === null ? '—' : `${v}%`}</text>
      </svg>
      <span>{etiqueta}</span>
    </div>
  );
}

export function Vacio({ titulo, children }) {
  return <div className="vacio"><h4>{titulo}</h4>{children}</div>;
}

export function Error({ msg }) {
  return msg ? <p className="error">{msg}</p> : null;
}
