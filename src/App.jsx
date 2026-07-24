import { useState } from 'react'
import FamilyGate from './components/FamilyGate'
import FamilySignup from './components/FamilySignup'
import Welcome from './components/Welcome'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import { clearToken, clearAdminToken } from './utils/api'

export default function App() {
  const [screen, setScreen]           = useState('family-gate')
  const [family, setFamily]           = useState(null) // { code, name }
  const [currentUser, setCurrentUser] = useState(null) // { id, name, color_index }

  const handleFamilyFound  = (fam) => { setFamily(fam); setScreen('welcome') }
  const handleSignupDone   = (fam) => { setFamily(fam); setScreen('welcome') }
  const handleSwitchFamily = ()    => { setFamily(null); setCurrentUser(null); setScreen('family-gate') }

  const handleUserSelect   = (name) => { setCurrentUser({ name }); setScreen('login') }
  const handleLoginSuccess = (user) => { setCurrentUser(user);     setScreen('dashboard') }
  const handleLogout       = ()     => { clearToken(); setCurrentUser(null); setScreen('welcome') }
  const handleBack         = ()     => { setCurrentUser(null);     setScreen('welcome') }

  const handleAdminAccess       = () => setScreen('admin-login')
  const handleAdminLoginSuccess = () => setScreen('admin-dashboard')
  const handleAdminLogout       = () => { clearAdminToken(); setScreen('welcome') }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {screen === 'family-gate'    && <FamilyGate onFamilyFound={handleFamilyFound} onSignupClick={() => setScreen('family-signup')} />}
      {screen === 'family-signup'  && <FamilySignup onDone={handleSignupDone} onBack={() => setScreen('family-gate')} />}
      {screen === 'welcome'        && <Welcome family={family} onUserSelect={handleUserSelect} onAdminAccess={handleAdminAccess} onSwitchFamily={handleSwitchFamily} />}
      {screen === 'login'          && <Login familyCode={family?.code} username={currentUser?.name} onSuccess={handleLoginSuccess} onBack={handleBack} />}
      {screen === 'dashboard'      && <Dashboard user={currentUser} onLogout={handleLogout} />}
      {screen === 'admin-login'    && <AdminLogin familyCode={family?.code} onSuccess={handleAdminLoginSuccess} onBack={handleBack} />}
      {screen === 'admin-dashboard' && <AdminDashboard onLogout={handleAdminLogout} />}
    </div>
  )
}
