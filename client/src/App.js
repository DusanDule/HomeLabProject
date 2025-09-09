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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showRoleChange, setShowRoleChange] = useState({});
  const [items, setItems] = useState([]);
  const [showItemManagement, setShowItemManagement] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const [showItemAnalytics, setShowItemAnalytics] = useState({});
  const [itemAnalytics, setItemAnalytics] = useState({});

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

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data.items);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/items', newItem, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewItem({ name: '', description: '' });
      fetchItems(); // Refresh items list
      alert('Item erfolgreich erstellt!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Items');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Bist du sicher, dass du dieses Item und alle zugehörigen Striche löschen möchtest?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems(); // Refresh items list
      alert('Item erfolgreich gelöscht!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Löschen des Items');
    }
  };

  const handleAddStroke = async (itemId, itemName) => {
    if (!window.confirm(`Möchtest du einen Strich für "${itemName}" hinzufügen?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/items/${itemId}/stroke`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`✅ Strich für "${itemName}" erfolgreich hinzugefügt!`);
      fetchItems(); // Refresh items list to update stroke counts
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Hinzufügen des Strichs');
    }
  };

  const fetchItemAnalytics = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/items/${itemId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItemAnalytics({ ...itemAnalytics, [itemId]: response.data });
    } catch (error) {
      console.error('Error fetching item analytics:', error);
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setError('Neue Passwörter stimmen nicht überein');
      setLoading(false);
      return;
    }

    if (changePasswordData.newPassword.length < 6) {
      setError('Neues Passwort muss mindestens 6 Zeichen lang sein');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/change-password', 
        { 
          currentPassword: changePasswordData.currentPassword,
          newPassword: changePasswordData.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowChangePassword(false);
      setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Passwort erfolgreich geändert!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Ändern des Passworts');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    if (!window.confirm(`Bist du sicher, dass du die Rolle für diesen User zu "${newRole}" ändern möchtest?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/users/${userId}/role`, 
        { newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchUsers(); // Refresh user list
      alert('User-Rolle erfolgreich geändert!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Ändern der User-Rolle');
    }
  };

  if (isLoggedIn) {
    return (
      <div className="app">
        <div className="dashboard">
          <div className="dashboard-header">
            <h1>{user?.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</h1>
            <div className="header-actions">
              <button 
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="change-password-btn"
              >
                🔑 Passwort ändern
              </button>
              {user?.role === 'admin' && (
                <>
                  <button 
                    onClick={() => {
                      setShowItemManagement(!showItemManagement);
                      if (!showItemManagement) {
                        fetchItems();
                      }
                    }} 
                    className="items-btn"
                  >
                    {showItemManagement ? 'Dashboard' : '📝 Items'}
                  </button>
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
                    {showAdminMenu ? 'Dashboard' : '👥 User Management'}
                  </button>
                </>
              )}
              {user?.role === 'user' && (
                <button 
                  onClick={() => {
                    setShowItemManagement(!showItemManagement);
                    if (!showItemManagement) {
                      fetchItems();
                    }
                  }} 
                  className="items-btn"
                >
                  {showItemManagement ? 'Dashboard' : '📝 Strichliste'}
                </button>
              )}
              <button onClick={handleLogout} className="logout-btn">
                Abmelden
              </button>
            </div>
          </div>
          <div className="dashboard-content">
            {showChangePassword && (
              <div className="change-password-section">
                <h2>🔑 Passwort ändern</h2>
                <form onSubmit={handleChangePassword} className="change-password-form">
                  <div className="form-group">
                    <label htmlFor="current-password">Aktuelles Passwort:</label>
                    <input
                      type="password"
                      id="current-password"
                      value={changePasswordData.currentPassword}
                      onChange={(e) => setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })}
                      required
                      placeholder="Aktuelles Passwort eingeben"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="new-password">Neues Passwort:</label>
                    <input
                      type="password"
                      id="new-password"
                      value={changePasswordData.newPassword}
                      onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                      required
                      placeholder="Neues Passwort (min. 6 Zeichen)"
                      minLength="6"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm-password">Passwort bestätigen:</label>
                    <input
                      type="password"
                      id="confirm-password"
                      value={changePasswordData.confirmPassword}
                      onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })}
                      required
                      placeholder="Neues Passwort wiederholen"
                      minLength="6"
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="login-btn"
                      disabled={loading}
                    >
                      {loading ? 'Ändern...' : 'Passwort ändern'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowChangePassword(false);
                        setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setError('');
                      }}
                      className="switch-btn"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              </div>
            )}
            {showItemManagement ? (
              <div className="item-management">
                <h2>📝 {user?.role === 'admin' ? 'Item Management' : 'Strichliste'}</h2>
                
                {user?.role === 'admin' && (
                  <div className="create-item-section">
                    <h3>Neues Item erstellen</h3>
                    <form onSubmit={handleCreateItem} className="create-item-form">
                      <div className="form-group">
                        <label htmlFor="item-name">Item Name:</label>
                        <input
                          type="text"
                          id="item-name"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          required
                          placeholder="z.B. Handschuhe, Coca Cola..."
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="item-description">Beschreibung (optional):</label>
                        <input
                          type="text"
                          id="item-description"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                          placeholder="Kurze Beschreibung..."
                        />
                      </div>
                      {error && <div className="error-message">{error}</div>}
                      <button 
                        type="submit" 
                        className="login-btn"
                        disabled={loading}
                      >
                        {loading ? 'Erstellen...' : 'Item erstellen'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="items-list">
                  <div className="items-header">
                    <h3>{user?.role === 'admin' ? 'Alle Items' : 'Verfügbare Items'}</h3>
                    <button onClick={fetchItems} className="refresh-btn">
                      🔄 Aktualisieren
                    </button>
                  </div>
                  
                  {items.length === 0 ? (
                    <div className="no-items">
                      <p>Noch keine Items vorhanden.</p>
                      {user?.role === 'admin' && <p>Erstelle dein erstes Item oben!</p>}
                    </div>
                  ) : (
                    <div className="items-grid">
                      {items.map(item => (
                        <div key={item.id} className="item-card">
                          <div className="item-header">
                            <h4>{item.name}</h4>
                            {user?.role === 'admin' && (
                              <div className="item-actions">
                                <button 
                                  onClick={() => {
                                    setShowItemAnalytics({ ...showItemAnalytics, [item.id]: !showItemAnalytics[item.id] });
                                    if (!showItemAnalytics[item.id]) {
                                      fetchItemAnalytics(item.id);
                                    }
                                  }}
                                  className="analytics-btn"
                                >
                                  📊 Analytics
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="delete-item-btn"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="item-description">{item.description}</p>
                          )}
                          
                          {user?.role === 'admin' && (
                            <div className="item-stats">
                              <span className="stroke-count">Striche: {item.strokeCount || 0}</span>
                              {item.lastStroke && (
                                <span className="last-stroke">
                                  Letzter: {new Date(item.lastStroke).toLocaleDateString('de-DE')}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <button 
                            onClick={() => handleAddStroke(item.id, item.name)}
                            className="add-stroke-btn"
                          >
                            ➕ Strich hinzufügen
                          </button>
                          
                          {showItemAnalytics[item.id] && itemAnalytics[item.id] && (
                            <div className="item-analytics">
                              <h5>📊 Analytics für {item.name}</h5>
                              <div className="analytics-content">
                                <div className="analytics-summary">
                                  <p><strong>Gesamt Striche:</strong> {itemAnalytics[item.id].totalStrokes}</p>
                                </div>
                                
                                <div className="strokes-by-user">
                                  <h6>Striche pro User:</h6>
                                  {itemAnalytics[item.id].strokesByUser.map(user => (
                                    <div key={user.username} className="user-stroke">
                                      <span>{user.username}: {user.strokeCount}</span>
                                      <small>(letzter: {new Date(user.lastStroke).toLocaleDateString('de-DE')})</small>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="recent-strokes">
                                  <h6>Letzte 10 Striche:</h6>
                                  {itemAnalytics[item.id].recentStrokes.map(stroke => (
                                    <div key={stroke.id} className="recent-stroke">
                                      {stroke.username} - {new Date(stroke.createdAt).toLocaleString('de-DE')}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : showAdminMenu && user?.role === 'admin' ? (
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
                          <button 
                            onClick={() => setShowPasswordReset({ ...showPasswordReset, [user.id]: !showPasswordReset[user.id] })}
                            className="reset-password-btn"
                          >
                            🔑 Passwort
                          </button>
                          <button 
                            onClick={() => setShowRoleChange({ ...showRoleChange, [user.id]: !showRoleChange[user.id] })}
                            className="role-change-btn"
                          >
                            👑 Rolle
                          </button>
                          {user.role !== 'admin' && (
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="delete-btn"
                            >
                              🗑️ Löschen
                            </button>
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
                                minLength="6"
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
                    {users.some(user => showRoleChange[user.id]) && (
                      <div className="role-change-section">
                        {users.filter(user => showRoleChange[user.id]).map(user => (
                          <div key={`role-${user.id}`} className="role-change-form">
                            <h4>Rolle für {user.username} ändern</h4>
                            <div className="role-form-group">
                              <span className="current-role">Aktuelle Rolle: <strong>{user.role === 'admin' ? '👑 Admin' : '👤 User'}</strong></span>
                              <div className="role-buttons">
                                <button 
                                  onClick={() => handleChangeUserRole(user.id, 'admin')}
                                  className={`role-btn admin ${user.role === 'admin' ? 'active' : ''}`}
                                  disabled={user.role === 'admin'}
                                >
                                  👑 Admin machen
                                </button>
                                <button 
                                  onClick={() => handleChangeUserRole(user.id, 'user')}
                                  className={`role-btn user ${user.role === 'user' ? 'active' : ''}`}
                                  disabled={user.role === 'user'}
                                >
                                  👤 User machen
                                </button>
                              </div>
                              <button 
                                onClick={() => setShowRoleChange({ ...showRoleChange, [user.id]: false })}
                                className="cancel-role-btn"
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
