import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'confirm'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else if (mode === 'register') {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setError(error.message);
        } else {
          // Переходим на страницу подтверждения
          setMode('confirm');
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Ссылка для сброса пароля отправлена на email');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Страница подтверждения email
  if (mode === 'confirm') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>📧 Проверьте почту</h1>
          <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
            Мы отправили письмо с подтверждением на адрес:
          </p>
          <p style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
            {email}
          </p>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '1rem' }}>
            Перейдите по ссылке в письме, чтобы подтвердить аккаунт.
          </p>
          <button onClick={() => { setMode('login'); setEmail(''); setPassword(''); }}>
            Вернуться к входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Connect</h1>
        
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Имя"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          
          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading
              ? '...'
              : mode === 'login'
              ? 'Войти'
              : mode === 'register'
              ? 'Регистрация'
              : 'Сбросить пароль'}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('register')}>Регистрация</button>
              <button onClick={() => setMode('reset')}>Забыли пароль?</button>
            </>
          )}
          {mode === 'register' && (
            <button onClick={() => setMode('login')}>Войти</button>
          )}
          {mode === 'reset' && (
            <button onClick={() => setMode('login')}>Войти</button>
          )}
        </div>
      </div>
    </div>
  );
}