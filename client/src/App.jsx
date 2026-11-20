import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import { Ingresar, Registro } from './pages/Acceso.jsx';
import Bienvenida from './pages/Bienvenida.jsx';
import Semana from './pages/Semana.jsx';
import Entregas from './pages/Entregas.jsx';
import Horario from './pages/Horario.jsx';
import Checkin from './pages/Checkin.jsx';
import Materias from './pages/Materias.jsx';
import Apoyos from './pages/Apoyos.jsx';
import Encuesta from './pages/Encuesta.jsx';
import Perfil from './pages/Perfil.jsx';
import Admin from './pages/Admin.jsx';

function Privada({ children, admin = false }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="cargando-pantalla">Cargando RutaU…</div>;
  if (!usuario) return <Navigate to="/ingresar" replace />;
  if (admin && !usuario.admin) return <Navigate to="/semana" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { usuario, cargando } = useAuth();
  return (
    <Routes>
      <Route path="/" element={!cargando && usuario ? <Navigate to="/semana" replace /> : <Landing />} />
      <Route path="/ingresar" element={<Ingresar />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/bienvenida" element={<Privada><Bienvenida /></Privada>} />
      <Route path="/semana" element={<Privada><Semana /></Privada>} />
      <Route path="/entregas" element={<Privada><Entregas /></Privada>} />
      <Route path="/horario" element={<Privada><Horario /></Privada>} />
      <Route path="/checkin" element={<Privada><Checkin /></Privada>} />
      <Route path="/materias" element={<Privada><Materias /></Privada>} />
      <Route path="/apoyos" element={<Privada><Apoyos /></Privada>} />
      <Route path="/opinion" element={<Privada><Encuesta /></Privada>} />
      <Route path="/perfil" element={<Privada><Perfil /></Privada>} />
      <Route path="/admin" element={<Privada admin><Admin /></Privada>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
