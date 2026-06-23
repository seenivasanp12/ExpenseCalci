import { useState } from 'react'
import Welcome from './components/Welcome'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import { clearToken, clearAdminToken } from './utils/api'

export default function App() {
  const [screen, setScreen]           = useState('welcome')
  const [currentUser, setCurrentUser] = useState(null) // { id, name, color_index }

  const handleUserSelect   = (name) => { setCurrentUser({ name }); setScreen('login') }
  const handleLoginSuccess = (user) => { setCurrentUser(user);     setScreen('dashboard') }
  const handleLogout       = ()     => { clearToken(); setCurrentUser(null); setScreen('welcome') }
  const handleBack         = ()     => { setCurrentUser(null);     setScreen('welcome') }

  const handleAdminAccess       = () => setScreen('admin-login')
  const handleAdminLoginSuccess = () => setScreen('admin-dashboard')
  const handleAdminLogout       = () => { clearAdminToken(); setScreen('welcome') }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {screen === 'welcome'         && <Welcome onUserSelect={handleUserSelect} onAdminAccess={handleAdminAccess} />}
      {screen === 'login'           && <Login username={currentUser?.name} onSuccess={handleLoginSuccess} onBack={handleBack} />}
      {screen === 'dashboard'       && <Dashboard user={currentUser} onLogout={handleLogout} />}
      {screen === 'admin-login'     && <AdminLogin onSuccess={handleAdminLoginSuccess} onBack={handleBack} />}
      {screen === 'admin-dashboard' && <AdminDashboard onLogout={handleAdminLogout} />}
    </div>
  )
}
