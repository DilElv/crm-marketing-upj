import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api.js';
import '../styles/Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MARKETING',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.register(
        formData.name,
        formData.email,
        formData.password,
        formData.role
      );
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h1>CRM Marketing</h1>
          <p style={{ color: 'var(--neutral-500)', margin: '0.5rem 0 0 0' }}>
            Bergabunglah dengan tim pemasaran kami
          </p>
        </div>
        
        <h2>Buat Akun Baru</h2>
        
        {error && <div className="error-message">⚠️ {error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">👤 Nama Lengkap</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">📧 Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="nama@upj.ac.id"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔐 Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">👔 Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="MARKETING">📊 Marketing</option>
              <option value="ADMIN">👨‍💼 Admin</option>
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? '⏳ Sedang mendaftar...' : '✨ Daftar'}
          </button>
        </form>

        <p className="auth-link">
          Sudah punya akun? <a href="/login">Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}

export default Register;
