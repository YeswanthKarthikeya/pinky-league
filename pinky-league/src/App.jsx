import { useState, useEffect } from 'react'
import { supabase, getPlayerName } from './supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'

const ADMIN_EMAIL = 'yeswanthkarthikeya11@gmail.com'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0A0A0F'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
        <p style={{ color: '#8888AA' }}>Loading The Pinky League...</p>
      </div>
    </div>
  )

  if (!user) return <Login />

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#0A0A0F',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: '430px', margin: '0 auto'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.1rem', fontWeight: '800',
            background: 'linear-gradient(90deg, #E91E8C, #FF6B35)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>🏏 The Pinky League</h1>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.06)', color: '#8888AA',
            padding: '0.4rem 0.9rem', borderRadius: '10px', fontSize: '0.8rem'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        {page === 'home' && <Home user={user} />}
        {page === 'leaderboard' && <Leaderboard user={user} />}
        {page === 'admin' && <Admin user={user} />}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        background: '#13131F',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        padding: '0.8rem 0',
        zIndex: 100
      }}>
        {[
          { key: 'home', emoji: '🏏', label: 'Today' },
          { key: 'leaderboard', emoji: '🏆', label: 'Leaderboard' },
          ...(user.email === ADMIN_EMAIL ? [{ key: 'admin', emoji: '⚙️', label: 'Admin' }] : [])
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setPage(tab.key)}
            style={{
              flex: 1, background: 'none',
              color: page === tab.key ? '#E91E8C' : '#8888AA',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              fontSize: '0.7rem', fontWeight: page === tab.key ? '700' : '400'
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}