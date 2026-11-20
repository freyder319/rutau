// Íconos lineales simples dibujados en SVG (24x24)
const P = {
  semana: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h3M8 16h6',
  entregas: 'M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01',
  horario: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  checkin: 'M4 12l5 5L20 6',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  campana: 'M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16zM10 21h4',
  estrella: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  mas_circulo: 'M12 5v14M5 12h14',
  subir: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  basura: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  recargar: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  izq: 'M15 6l-6 6 6 6',
  der: 'M9 6l6 6-6 6',
  apoyo: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  opinion: 'M4 5h16v11H9l-5 4z',
  grafica: 'M5 20V10M12 20V4M19 20v-7',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  materias: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 5v16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  copiar: 'M9 9h11v11H9zM5 15V4h11',
  rayo: 'M13 2L4 14h7l-1 8 9-12h-7z',
  descargar: 'M12 4v12M7 11l5 5 5-5M4 20h16',
};

export default function Icono({ nombre, size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[nombre] || ''} />
    </svg>
  );
}
