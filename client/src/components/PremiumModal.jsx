import { useEffect, useState } from 'react';
import { evento, PRECIO_PREMIUM } from '../api.js';
import { Modal } from './comunes.jsx';
import Icono from './Icono.jsx';

// Prueba de humo de la hipótesis H5: medimos cuántas personas harían clic en "Quiero Premium".
export default function PremiumModal({ onClose }) {
  const [listo, setListo] = useState(false);
  useEffect(() => { evento('premium_vista'); }, []);

  const quiero = () => {
    evento('premium_click', { precio: PRECIO_PREMIUM });
    setListo(true);
  };

  return (
    <Modal titulo="RutaU Premium" onClose={onClose} ancho={460}>
      {!listo ? (
        <div className="premium">
          <p className="precio"><b>${PRECIO_PREMIUM}</b> COP / mes</p>
          <p className="tenue">Precio de lanzamiento para estudiantes.</p>
          <ul className="lista-check">
            <li><Icono nombre="checkin" size={16} /> Sincronización automática con el calendario de tu aula virtual</li>
            <li><Icono nombre="checkin" size={16} /> Recordatorios por WhatsApp además del correo</li>
            <li><Icono nombre="checkin" size={16} /> Estadísticas de avance por semestre</li>
            <li><Icono nombre="checkin" size={16} /> Planes para varias semanas y turnos rotativos automáticos</li>
          </ul>
          <button className="btn btn-primario ancho" onClick={quiero}><Icono nombre="estrella" size={18} /> Quiero Premium</button>
        </div>
      ) : (
        <div className="premium">
          <h4>¡Gracias por tu interés!</h4>
          <p>RutaU Premium todavía está en construcción. Tu clic nos ayuda a decidir si lo lanzamos y a qué precio.
            No se hizo ningún cobro.</p>
          <button className="btn ancho" onClick={onClose}>Volver</button>
        </div>
      )}
    </Modal>
  );
}
