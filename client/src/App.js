import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', email: '', invitationCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentInvitationCode, setCurrentInvitationCode] = useState('Dule-1212');
  const [newInvitationCode, setNewInvitationCode] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState({});
  const [newPasswords, setNewPasswords] = useState({});

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await axios.get('/api/protected', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
      setIsLoggedIn(true);
    } catch (error) {
      localStorage.removeItem('token');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchInvitationCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/invitation-code', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentInvitationCode(response.data.invitationCode);
    } catch (error) {
      console.error('Error fetching invitation code:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/login', loginData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      setIsLoggedIn(true);
    } catch (error) {
      setError(error.response?.data?.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    setLoginData({ username: '', password: '' });
  };

  const handleLoginInputChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegisterInputChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/register', registerData);
      setError('');
      setShowRegister(false);
      setRegisterData({ username: '', password: '', email: '', invitationCode: '' });
      alert('Registrierung erfolgreich! Du kannst dich jetzt anmelden.');
    } catch (error) {
      setError(error.response?.data?.message || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bist du sicher, dass du diesen User löschen möchtest?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers(); // Refresh user list
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Löschen des Users');
    }
  };

  const handleUpdateInvitationCode = async () => {
    if (!newInvitationCode.trim()) {
      setError('Bitte gib einen neuen Einladungscode ein');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/admin/invitation-code', 
        { newCode: newInvitationCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentInvitationCode(newInvitationCode);
      setNewInvitationCode('');
      alert('Einladungscode erfolgreich aktualisiert!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren des Einladungscodes');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = newPasswords[userId];
    if (!newPassword || newPassword.length < 6) {
      setError('Neues Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (!window.confirm('Bist du sicher, dass du das Passwort für diesen User zurücksetzen möchtest?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/users/${userId}/reset-password`, 
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reset the form
      setShowPasswordReset({ ...showPasswordReset, [userId]: false });
      setNewPasswords({ ...newPasswords, [userId]: '' });
      alert('Passwort erfolgreich zurückgesetzt!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Zurücksetzen des Passworts');
    }
  };

  if (isLoggedIn) {
    return (
      <div className="app">
        <div className="dashboard">
          <div className="dashboard-header">
            <h1>{user?.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</h1>
            <div className="header-actions">
              {user?.role === 'admin' && (
                <button 
                  onClick={() => {
                    setShowAdminMenu(!showAdminMenu);
                    if (!showAdminMenu) {
                      fetchUsers();
                      fetchInvitationCode();
                    }
                  }} 
                  className="admin-btn"
                >
                  {showAdminMenu ? 'Dashboard' : 'User Management'}
                </button>
              )}
              <button onClick={handleLogout} className="logout-btn">
                Abmelden
              </button>
            </div>
          </div>
          <div className="dashboard-content">
            {showAdminMenu && user?.role === 'admin' ? (
              <div className="admin-menu">
                <h2>👥 User Management</h2>
                <div className="user-list">
                  <div className="user-list-header">
                    <h3>Registrierte User</h3>
                    <button onClick={fetchUsers} className="refresh-btn">
                      🔄 Aktualisieren
                    </button>
                  </div>
                  <div className="users-table">
                    <div className="table-header">
                      <div>ID</div>
                      <div>Username</div>
                      <div>Email</div>
                      <div>Rolle</div>
                      <div>Erstellt</div>
                      <div>Aktionen</div>
                    </div>
                    {users.map(user => (
                      <div key={user.id} className="table-row">
                        <div>{user.id}</div>
                        <div>{user.username}</div>
                        <div>{user.email}</div>
                        <div>
                          <span className={`role-badge ${user.role}`}>
                            {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                          </span>
                        </div>
                        <div>{new Date(user.createdAt).toLocaleDateString('de-DE')}</div>
                        <div className="action-buttons">
                          {user.role !== 'admin' && (
                            <>
                              <button 
                                onClick={() => setShowPasswordReset({ ...showPasswordReset, [user.id]: !showPasswordReset[user.id] })}
                                className="reset-password-btn"
                              >
                                🔑 Passwort
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="delete-btn"
                              >
                                🗑️ Löschen
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {users.some(user => showPasswordReset[user.id]) && (
                      <div className="password-reset-section">
                        {users.filter(user => showPasswordReset[user.id]).map(user => (
                          <div key={`reset-${user.id}`} className="password-reset-form">
                            <h4>Passwort für {user.username} zurücksetzen</h4>
                            <div className="reset-form-group">
                              <input
                                type="password"
                                placeholder="Neues Passwort (min. 6 Zeichen)"
                                value={newPasswords[user.id] || ''}
                                onChange={(e) => setNewPasswords({ ...newPasswords, [user.id]: e.target.value })}
                                className="reset-input"
                              />
                              <button 
                                onClick={() => handleResetPassword(user.id)}
                                className="confirm-reset-btn"
                              >
                                ✅ Bestätigen
                              </button>
                              <button 
                                onClick={() => {
                                  setShowPasswordReset({ ...showPasswordReset, [user.id]: false });
                                  setNewPasswords({ ...newPasswords, [user.id]: '' });
                                }}
                                className="cancel-reset-btn"
                              >
                                ❌ Abbrechen
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="invitation-info">
                  <h3>📧 Einladungscode</h3>
                  <p>Aktueller Code:</p>
                  <div className="invitation-code">
                    <code>{currentInvitationCode}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(currentInvitationCode)}
                      className="copy-btn"
                    >
                      📋 Kopieren
                    </button>
                  </div>
                  <div className="invitation-code-update">
                    <h4>Einladungscode ändern:</h4>
                    <div className="update-form">
                      <input
                        type="text"
                        placeholder="Neuer Einladungscode"
                        value={newInvitationCode}
                        onChange={(e) => setNewInvitationCode(e.target.value)}
                        className="code-input"
                      />
                      <button 
                        onClick={handleUpdateInvitationCode}
                        className="update-code-btn"
                      >
                        🔄 Aktualisieren
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="success-message">
                <h2>✅ Login successful</h2>
                <p>Willkommen, {user?.username}!</p>
                <p>Du bist erfolgreich angemeldet.</p>
                {user?.role === 'admin' && (
                  <p>👑 Du hast Admin-Rechte. Klicke auf "User Management" um User zu verwalten.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="login-container">
        <div className="login-card">
          <h1>{showRegister ? 'Registrierung' : 'Login'}</h1>
          
          {showRegister ? (
            <form onSubmit={handleRegister} className="login-form">
              <div className="form-group">
                <label htmlFor="reg-username">Benutzername:</label>
                <input
                  type="text"
                  id="reg-username"
                  name="username"
                  value={registerData.username}
                  onChange={handleRegisterInputChange}
                  required
                  placeholder="Benutzername eingeben"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">Email:</label>
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterInputChange}
                  required
                  placeholder="Email-Adresse eingeben"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-password">Passwort:</label>
                <input
                  type="password"
                  id="reg-password"
                  name="password"
                  value={registerData.password}
                  onChange={handleRegisterInputChange}
                  required
                  placeholder="Passwort eingeben"
                />
              </div>
              <div className="form-group">
                <label htmlFor="invitation-code">Einladungscode:</label>
                <input
                  type="text"
                  id="invitation-code"
                  name="invitationCode"
                  value={registerData.invitationCode}
                  onChange={handleRegisterInputChange}
                  required
                  placeholder="Einladungscode eingeben"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button 
                type="submit" 
                className="login-btn"
                disabled={loading}
              >
                {loading ? 'Registrieren...' : 'Registrieren'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowRegister(false);
                  setError('');
                  setRegisterData({ username: '', password: '', email: '', invitationCode: '' });
                }}
                className="switch-btn"
              >
                Zurück zum Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Benutzername:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={loginData.username}
                  onChange={handleLoginInputChange}
                  required
                  placeholder="Benutzername eingeben"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Passwort:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginInputChange}
                  required
                  placeholder="Passwort eingeben"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button 
                type="submit" 
                className="login-btn"
                disabled={loading}
              >
                {loading ? 'Anmelden...' : 'Anmelden'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowRegister(true);
                  setError('');
                }}
                className="switch-btn"
              >
                Neuen Account erstellen
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
