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
  const [newItem, setNewItem] = useState({ name: '', description: '', roomId: '', price: '' });
  const [showItemAnalytics, setShowItemAnalytics] = useState({});
  const [itemAnalytics, setItemAnalytics] = useState({});
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [activeRoomTab, setActiveRoomTab] = useState('all');
  const [showRoomManagement, setShowRoomManagement] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const [showItemEdit, setShowItemEdit] = useState({});
  const [editItemData, setEditItemData] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showCreateItemForm, setShowCreateItemForm] = useState(false);
  const [userStrokes, setUserStrokes] = useState({}); // Track user's strokes per item
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

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
      
      // Auto-open Items for admin users, Items for regular users
      if (response.data.user.role === 'admin') {
        fetchUsers();
        fetchInvitationCode();
        fetchItems();
        fetchRooms();
        setShowItemManagement(true);
      } else {
        fetchItems();
        fetchRooms();
        fetchUserStrokes();
        setShowItemManagement(true);
      }
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

  const fetchItems = async (roomId = null) => {
    try {
      const token = localStorage.getItem('token');
      const url = roomId && roomId !== 'all' ? `/api/items?roomId=${roomId}` : '/api/items';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data.items);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
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
      
      setNewItem({ name: '', description: '', roomId: '', price: '' });
      fetchItems(selectedRoom); // Refresh items list
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
      
      // Refresh data based on user role
      if (user?.role === 'admin') {
        fetchItems(selectedRoom);
      } else {
        fetchItems();
        fetchUserStrokes();
      }
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

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/rooms', newRoom, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewRoom({ name: '', description: '' });
      fetchRooms(); // Refresh rooms list
      alert('Raum erfolgreich erstellt!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Raums');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemId) => {
    const editData = editItemData[itemId];
    if (!editData) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/items/${itemId}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowItemEdit({ ...showItemEdit, [itemId]: false });
      setEditItemData({ ...editItemData, [itemId]: {} });
      fetchItems(selectedRoom); // Refresh items list
      alert('Item erfolgreich aktualisiert!');
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Aktualisieren des Items');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVExport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on type
      const filenames = {
        users: 'fixtrack_users.csv',
        items: 'fixtrack_items.csv',
        strokes: 'fixtrack_strokes.csv',
        rooms: 'fixtrack_rooms.csv'
      };
      
      link.setAttribute('download', filenames[type] || `fixtrack_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} erfolgreich exportiert!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Fehler beim Exportieren der Daten');
    }
  };

  const fetchUserStrokes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/strokes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserStrokes(response.data);
    } catch (error) {
      console.error('Error fetching user strokes:', error);
    }
  };

  const calculateUserTotal = () => {
    let total = 0;
    items.forEach(item => {
      const userStrokeCount = userStrokes[item.id] || 0;
      total += userStrokeCount * (item.price || 0);
    });
    return total;
  };

  const handleResetStrokes = async (itemId, itemName) => {
    if (!window.confirm(`Bist du sicher, dass du alle Striche für "${itemName}" zurücksetzen möchtest?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/items/${itemId}/reset-strokes`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchItems(selectedRoom); // Refresh items list
      alert(`✅ ${response.data.message} (${response.data.removedStrokes} Striche entfernt)`);
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Zurücksetzen der Striche');
    }
  };

  const handleRoomFilter = (roomId) => {
    setSelectedRoom(roomId);
    fetchItems(roomId);
  };

  const handleRoomTabChange = (roomId) => {
    setActiveRoomTab(roomId);
    fetchItems(roomId);
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
            <div className="header-left">
              <img src="/assets/logo.svg" alt="FixTrack Logo" className="header-logo" />
              <h1>{user?.role === 'admin' ? 'FixTrack Admin' : 'FixTrack User'}</h1>
            </div>
            <div className="header-actions">
              <button 
                className="nav-menu-btn"
                onClick={() => setShowNavMenu(!showNavMenu)}
              >
                ☰ Menü
              </button>
              
              {showNavMenu && (
                <div className="nav-dropdown">
                  <button 
                    onClick={() => {
                      // Reset all other screens
                      setShowItemManagement(false);
                      setShowRoomManagement(false);
                      setShowAdminMenu(false);
                      setShowChangePassword(!showChangePassword);
                      setShowNavMenu(false);
                    }} 
                    className={`nav-dropdown-btn ${showChangePassword ? 'active' : ''}`}
                  >
                    🔑 Passwort ändern
                  </button>
                  
                  {user?.role === 'admin' && (
                    <>
                      <button 
                        onClick={() => {
                          // Reset all other screens
                          setShowChangePassword(false);
                          setShowRoomManagement(false);
                          setShowAdminMenu(false);
                          setShowItemManagement(!showItemManagement);
                          setShowNavMenu(false);
                          if (!showItemManagement) {
                            fetchUsers();
                            fetchInvitationCode();
                            fetchItems();
                            fetchRooms();
                          }
                        }} 
                        className={`nav-dropdown-btn ${showItemManagement ? 'active' : ''}`}
                      >
                        📝 Items
                      </button>
                      <button 
                        onClick={() => {
                          // Reset all other screens
                          setShowItemManagement(false);
                          setShowChangePassword(false);
                          setShowAdminMenu(false);
                          setShowRoomManagement(!showRoomManagement);
                          setShowNavMenu(false);
                          if (!showRoomManagement) {
                            fetchRooms();
                          }
                        }} 
                        className={`nav-dropdown-btn ${showRoomManagement ? 'active' : ''}`}
                      >
                        📂 Kategorien
                      </button>
                      <button 
                        onClick={() => {
                          // Reset all other screens
                          setShowItemManagement(false);
                          setShowRoomManagement(false);
                          setShowChangePassword(false);
                          setShowAdminMenu(!showAdminMenu);
                          setShowNavMenu(false);
                          if (!showAdminMenu) {
                            fetchUsers();
                            fetchInvitationCode();
                          }
                        }} 
                        className={`nav-dropdown-btn ${showAdminMenu ? 'active' : ''}`}
                      >
                        👥 User Management
                      </button>
                    </>
                  )}
                  
                  {user?.role === 'user' && (
                    <button 
                      onClick={() => {
                        // Reset all other screens
                        setShowChangePassword(false);
                        setShowItemManagement(!showItemManagement);
                        setShowNavMenu(false);
                        if (!showItemManagement) {
                          fetchItems();
                          fetchRooms();
                          fetchUserStrokes();
                        }
                      }} 
                      className={`nav-dropdown-btn ${showItemManagement ? 'active' : ''}`}
                    >
                      📝 Strichliste
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      setShowNavMenu(false);
                      handleLogout();
                    }} 
                    className="nav-dropdown-btn logout"
                  >
                    Abmelden
                  </button>
                </div>
              )}
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
            {showRoomManagement && user?.role === 'admin' ? (
              <div className="room-management">
                <h2>📂 Kategorie Management</h2>
                
                <div className="create-room-section">
                  <h3>Neue Kategorie erstellen</h3>
                  <form onSubmit={handleCreateRoom} className="create-room-form">
                    <div className="form-group">
                      <label htmlFor="room-name">Kategorie Name:</label>
                      <input
                        type="text"
                        id="room-name"
                        value={newRoom.name}
                        onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                        required
                        placeholder="z.B. Küche, Werkstatt, Büro..."
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="room-description">Beschreibung (optional):</label>
                      <input
                        type="text"
                        id="room-description"
                        value={newRoom.description}
                        onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                        placeholder="Kurze Beschreibung der Kategorie..."
                      />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button 
                      type="submit" 
                      className="login-btn"
                      disabled={loading}
                    >
                        {loading ? 'Erstellen...' : 'Kategorie erstellen'}
                    </button>
                  </form>
                </div>

                <div className="rooms-list">
                  <h3>Alle Kategorien</h3>
                  <div className="rooms-grid">
                    {rooms.map(room => (
                      <div key={room.id} className="room-card">
                        <div className="room-header">
                          <h4>{room.name}</h4>
                          {room.id !== 1 && (
                            <button 
                              onClick={() => {
                                if (window.confirm(`Bist du sicher, dass du den Raum "${room.name}" löschen möchtest?`)) {
                                  // TODO: Implement room deletion
                                  alert('Raum-Löschung wird implementiert...');
                                }
                              }}
                              className="delete-room-btn"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        {room.description && (
                          <p className="room-description">{room.description}</p>
                        )}
                        <div className="room-stats">
                          <span>Items: {room.itemCount || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : showItemManagement && user?.role === 'user' ? (
              <div className="user-pos-system">
                <div className="pos-header">
                  <h2>💰 Meine Ausgaben</h2>
                  <div className="pos-summary">
                    <div className="summary-item highlight">
                      <span className="summary-label">Gesamtkosten:</span>
                      <span className="summary-value total-cost">€{calculateUserTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pos-categories">
                  <div className="category-header">
                    <h3>Kategorien</h3>
                  </div>
                  
                  <div className="category-tabs">
                    <button 
                      className={`category-tab ${activeRoomTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveRoomTab('all')}
                    >
                      Alle Kategorien
                    </button>
                    {rooms.map(room => (
                      <button 
                        key={room.id}
                        className={`category-tab ${activeRoomTab === room.id ? 'active' : ''}`}
                        onClick={() => setActiveRoomTab(room.id)}
                      >
                        📂 {room.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pos-items-grid">
                  {items
                    .filter(item => activeRoomTab === 'all' || item.roomId === activeRoomTab)
                    .map(item => (
                      <div key={item.id} className="pos-item-box">
                        <div className="item-box-header">
                          <h3 className="item-box-name">{item.name}</h3>
                          <div className="item-box-price">€{parseFloat(item.price || 0).toFixed(2)}</div>
                        </div>
                        
                        <div className="item-box-info">
                          <div className="item-box-stats">
                            <div className="stat-item">
                              <span className="stat-label">Preis pro Stück:</span>
                              <span className="stat-value price">€{parseFloat(item.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Entnommen:</span>
                              <span className="stat-value quantity">{userStrokes[item.id] || 0} Stück</span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          className="item-box-add-btn"
                          onClick={() => handleAddStroke(item.id, item.name)}
                        >
                          <span className="add-icon">+</span>
                          <span className="add-text">Hinzufügen</span>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ) : showItemManagement ? (
              <div className="item-management">
                <h2>📝 Item Management</h2>
                
                {user?.role === 'admin' && (
                  <div className="create-item-section">
                    <div className="create-item-header">
                      <h3>Neues Item erstellen</h3>
                      <button 
                        type="button"
                        className="toggle-create-form-btn"
                        onClick={() => setShowCreateItemForm(!showCreateItemForm)}
                      >
                        {showCreateItemForm ? '−' : '+'}
                      </button>
                    </div>
                    {showCreateItemForm && (
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
                        <label htmlFor="item-room">Raum:</label>
                        <select
                          id="item-room"
                          value={newItem.roomId}
                          onChange={(e) => setNewItem({ ...newItem, roomId: e.target.value })}
                          required
                        >
                          <option value="">Raum auswählen...</option>
                          {rooms.map(room => (
                            <option key={room.id} value={room.id}>{room.name}</option>
                          ))}
                        </select>
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
                      <div className="form-group">
                        <label htmlFor="item-price">Preis (€):</label>
                        <input
                          type="number"
                          id="item-price"
                          value={newItem.price}
                          onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
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
                    )}
                  </div>
                )}

                  <div className="items-list">
                    <div className="items-header">
                      <h3>{user?.role === 'admin' ? 'Alle Items' : 'Verfügbare Items'}</h3>
                      <div className="items-controls">
                        {user?.role === 'admin' ? (
                          <div className="room-filter">
                            <label htmlFor="room-filter">Kategorie filtern:</label>
                            <select
                              id="room-filter"
                              value={selectedRoom}
                              onChange={(e) => handleRoomFilter(e.target.value)}
                            >
                              <option value="all">Alle Kategorien</option>
                              {rooms.map(room => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="room-tabs">
                            <button 
                              className={`room-tab ${activeRoomTab === 'all' ? 'active' : ''}`}
                              onClick={() => handleRoomTabChange('all')}
                            >
                              Alle Kategorien
                            </button>
                            {rooms.map(room => (
                              <button 
                                key={room.id}
                                className={`room-tab ${activeRoomTab === room.id ? 'active' : ''}`}
                                onClick={() => handleRoomTabChange(room.id)}
                              >
                                📂 {room.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <button onClick={() => fetchItems(user?.role === 'admin' ? selectedRoom : activeRoomTab)} className="refresh-btn">
                          🔄 Aktualisieren
                        </button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleCSVExport('items')} className="export-btn">
                            📊 Export
                          </button>
                        )}
                      </div>
                    </div>
                  
                  {items.length === 0 ? (
                    <div className="no-items">
                      <p>Noch keine Items vorhanden.</p>
                      {user?.role === 'admin' && <p>Erstelle dein erstes Item oben!</p>}
                    </div>
                  ) : (
                    <div className="items-table-container">
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th></th>
                            <th>Name</th>
                            <th>Kategorie</th>
                            <th>Preis</th>
                            <th>Striche</th>
                            <th>Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id} className="item-row">
                              <td className="item-details-cell">
                                <button 
                                  className="details-plus-btn"
                                  onClick={() => {
                                    setExpandedItems({ 
                                      ...expandedItems, 
                                      [item.id]: !expandedItems[item.id] 
                                    });
                                    if (!expandedItems[item.id]) {
                                      fetchItemAnalytics(item.id);
                                    }
                                  }}
                                >
                                  {expandedItems[item.id] ? '−' : '+'}
                                </button>
                              </td>
                              <td className="item-name-cell">
                                <strong>{item.name}</strong>
                                {item.description && (
                                  <div className="item-description-small">{item.description}</div>
                                )}
                              </td>
                              <td className="item-category-cell">
                                📂 {item.roomName}
                              </td>
                              <td className="item-price-cell">
                                {item.price ? `€${parseFloat(item.price).toFixed(2)}` : '€0.00'}
                              </td>
                              <td className="item-strokes-cell">
                                <span className="stroke-count-badge">
                                  {item.strokeCount || 0}
                                </span>
                              </td>
                              <td className="item-actions-cell">
                                <div className="table-actions">
                                  <button 
                                    onClick={() => {
                                      setShowItemEdit({ ...showItemEdit, [item.id]: !showItemEdit[item.id] });
                                      if (!showItemEdit[item.id]) {
                                        setEditItemData({ 
                                          ...editItemData, 
                                          [item.id]: { 
                                            name: item.name, 
                                            description: item.description, 
                                            roomId: item.roomId,
                                            price: item.price
                                          } 
                                        });
                                      }
                                    }}
                                    className="edit-item-btn-small"
                                    title="Bearbeiten"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleResetStrokes(item.id, item.name)}
                                    className="reset-strokes-btn-small"
                                    title="Striche zurücksetzen"
                                  >
                                    🔄
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="delete-item-btn-small"
                                    title="Löschen"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Details Dropdowns */}
                      {items.map(item => (
                        expandedItems[item.id] && itemAnalytics[item.id] && (
                          <div key={`details-${item.id}`} className="item-details-dropdown">
                            <h4>📊 Details für {item.name}</h4>
                            <div className="analytics-content">
                              <div className="analytics-summary">
                                <p><strong>Gesamte Striche:</strong> {itemAnalytics[item.id].totalStrokes}</p>
                              </div>
                              
                              {itemAnalytics[item.id].strokesByUser && itemAnalytics[item.id].strokesByUser.length > 0 && (
                                <div className="strokes-by-user">
                                  <h5>Striche pro Benutzer:</h5>
                                  {itemAnalytics[item.id].strokesByUser.map((userStroke, index) => (
                                    <div key={index} className="user-stroke-item">
                                      <div className="user-stroke-header">
                                        <span className="user-name">{userStroke.username}</span>
                                        <span className="user-stroke-count">{userStroke.count} Striche</span>
                                        <button 
                                          className="user-details-toggle"
                                          onClick={() => setExpandedItems({ 
                                            ...expandedItems, 
                                            [`${item.id}-${userStroke.username}`]: !expandedItems[`${item.id}-${userStroke.username}`] 
                                          })}
                                        >
                                          {expandedItems[`${item.id}-${userStroke.username}`] ? '🔼' : '🔽'}
                                        </button>
                                      </div>
                                      
                                      {expandedItems[`${item.id}-${userStroke.username}`] && (
                                        <div className="user-stroke-details">
                                          <p><strong>Letzter Strich:</strong> {new Date(userStroke.lastStroke).toLocaleDateString('de-DE')} {new Date(userStroke.lastStroke).toLocaleTimeString('de-DE')}</p>
                                          {itemAnalytics[item.id].recentStrokes && (
                                            <div className="user-recent-strokes">
                                              <h6>Letzte Striche von {userStroke.username}:</h6>
                                              {itemAnalytics[item.id].recentStrokes
                                                .filter(stroke => stroke.username === userStroke.username)
                                                .slice(0, 5)
                                                .map((stroke, strokeIndex) => (
                                                  <div key={strokeIndex} className="recent-stroke-item">
                                                    <span>{new Date(stroke.createdAt).toLocaleDateString('de-DE')}</span>
                                                    <span>{new Date(stroke.createdAt).toLocaleTimeString('de-DE')}</span>
                                                  </div>
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : showItemManagement && user?.role === 'user' ? (
              <div className="user-pos-system">
                <div className="pos-header">
                  <h2>💰 Meine Ausgaben</h2>
                  <div className="pos-summary">
                    <div className="summary-item highlight">
                      <span className="summary-label">Gesamtkosten:</span>
                      <span className="summary-value total-cost">€{calculateUserTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pos-categories">
                  <div className="category-header">
                    <h3>Kategorien</h3>
                  </div>
                  
                  <div className="category-tabs">
                    <button 
                      className={`category-tab ${activeRoomTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveRoomTab('all')}
                    >
                      Alle Kategorien
                    </button>
                    {rooms.map(room => (
                      <button 
                        key={room.id}
                        className={`category-tab ${activeRoomTab === room.id ? 'active' : ''}`}
                        onClick={() => setActiveRoomTab(room.id)}
                      >
                        📂 {room.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pos-items-grid">
                  {items
                    .filter(item => activeRoomTab === 'all' || item.roomId === activeRoomTab)
                    .map(item => (
                      <div key={item.id} className="pos-item-box">
                        <div className="item-box-header">
                          <h3 className="item-box-name">{item.name}</h3>
                          <div className="item-box-price">€{parseFloat(item.price || 0).toFixed(2)}</div>
                        </div>
                        
                        <div className="item-box-info">
                          <div className="item-box-stats">
                            <div className="stat-item">
                              <span className="stat-label">Preis pro Stück:</span>
                              <span className="stat-value price">€{parseFloat(item.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Entnommen:</span>
                              <span className="stat-value quantity">{userStrokes[item.id] || 0} Stück</span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          className="item-box-add-btn"
                          onClick={() => handleAddStroke(item.id, item.name)}
                        >
                          <span className="add-icon">+</span>
                          <span className="add-text">Hinzufügen</span>
                        </button>
                      </div>
                    ))}
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
          <div className="logo-container">
            <img src="/assets/logo.svg" alt="FixTrack Logo" className="app-logo" />
          </div>
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
