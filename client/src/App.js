import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleInputChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoggedIn) {
    return (
      <div className="app">
        <div className="dashboard">
          <div className="dashboard-header">
            <h1>Admin Dashboard</h1>
            <button onClick={handleLogout} className="logout-btn">
              Abmelden
            </button>
          </div>
          <div className="dashboard-content">
            <div className="success-message">
              <h2>✅ Login successful</h2>
              <p>Willkommen, {user?.username}!</p>
              <p>Du bist erfolgreich angemeldet.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="login-container">
        <div className="login-card">
          <h1>Admin Login</h1>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Benutzername:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={loginData.username}
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
