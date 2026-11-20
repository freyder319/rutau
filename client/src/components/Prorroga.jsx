import { useState } from 'react';
import { evento, fechaHora } from '../api.js';
import { Modal } from './comunes.jsx';
import Icono from './Icono.jsx';

export default function Prorroga({ entrega, nombre, onClose }) {
  const texto = `Buenas tardes, profesor(a).

Le escribo porque estoy trabajando mientras estudio y esta semana mi carga laboral cambió, por lo que no alcanzo a terminar "${entrega?.titulo || 'la actividad'}"${entrega?.materia ? ` de ${entrega.materia}` : ''}, que vence el ${entrega?.fecha_limite ? fechaHora(entrega.fecha_limite).replace(/\.$/, '') : '[fecha]'}.

Ya tengo un avance y un plan para terminarla. ¿Sería posible contar con una prórroga de [número] días? Quedo atento(a) a su respuesta.

Muchas gracias,
${nombre || '[Tu nombre]'}`;
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    await navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiado(true);
    evento('prorroga_copiada');
  };
  return (
    <Modal titulo="Mensaje modelo para pedir una prórroga" onClose={onClose}>
      <p className="tenue">Envíalo antes de la fecha límite por el aula virtual o el correo institucional. Ajusta los datos entre corchetes.</p>
      <textarea className="texto-prorroga" readOnly value={texto} rows={12} />
      <button className="btn btn-primario ancho" onClick={copiar}><Icono nombre="copiar" size={18} /> {copiado ? '¡Copiado!' : 'Copiar mensaje'}</button>
    </Modal>
  );
}
