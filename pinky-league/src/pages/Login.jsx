import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(160deg, #0A0A0F 0%, #1a0a1f 50%, #0A0A0F 100%)'
    }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏏</div>
        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: '800',
          background: 'linear-gradient(90deg, #E91E8C, #FF6B35)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          The Pinky League
        </h1>
        <p style={{ color: '#8888AA', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          🌸 Predict. Compete. Win.
        </p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: '#13131F',
        borderRadius: '28px',
        padding: '2rem',
        border: '1px solid rgba(233,30,140,0.2)'
      }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#fff' }}>Welcome back 👋</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#8888AA', display: 'block', marginBottom: '0.4rem' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              borderRadius: '14px',
              background: '#0A0A0F',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#8888AA', display: 'block', marginBottom: '0.4rem' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              borderRadius: '14px',
              background: '#0A0A0F',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#FF1744', fontSize: '0.85rem', marginBottom: '1rem', background: '#FF174422', padding: '0.7rem 1rem', borderRadius: '10px' }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '14px',
            background: loading ? '#333' : 'linear-gradient(90deg, #E91E8C, #FF6B35)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '700',
            letterSpacing: '0.5px'
          }}
        >
          {loading ? 'Logging in...' : '🏏 Let\'s Play!'}
        </button>
      </div>

      <p style={{ color: '#333355', fontSize: '0.75rem', marginTop: '2rem' }}>
        🌸 Made with love for Pinky
      </p>
    </div>
  )
}