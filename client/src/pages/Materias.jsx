import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icono from '../components/Icono.jsx';

export default function Materias() {
  const [materias, setMaterias] = useState([]);
  const [nombre, setNombre] = useState('');
  const cargar = () => api('/materias').then(setMaterias);
  useEffect(() => { cargar(); }, []);

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await api('/materias', { method: 'POST', body: { nombre } });
    setNombre(''); cargar();
  };
  const color = async (m, c) => { await api(`/materias/${m.id}`, { method: 'PUT', body: { color: c } }); cargar(); };
  const borrar = async (m) => {
    if (!window.confirm(`¿Eliminar ${m.nombre}? Sus entregas quedarán sin materia.`)) return;
    await api(`/materias/${m.id}`, { method: 'DELETE' }); cargar();
  };

  return (
    <div className="pagina">
      <div className="cabecera-pagina"><div><h1>Materias</h1><p className="tenue">Cada materia tiene un color para reconocerla en tu plan.</p></div></div>
      <section className="tarjeta estrecha">
        <form onSubmit={agregar} className="en-linea">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la materia" />
          <button className="btn btn-primario"><Icono nombre="mas_circulo" size={18} /> Agregar</button>
        </form>
        <ul className="lista-materias">
          {materias.map((m) => (
            <li key={m.id}>
              <input type="color" value={m.color} onChange={(e) => color(m, e.target.value)} aria-label="Color" />
              <span>{m.nombre}</span>
              <button className="btn-icono" onClick={() => borrar(m)} aria-label="Eliminar"><Icono nombre="basura" size={18} /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
