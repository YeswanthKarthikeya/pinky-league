import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ADMIN_EMAIL = 'yeswanthkarthikeya11@gmail.com'

export default function Admin({ user }) {
  const [todayMatch, setTodayMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [winner, setWinner] = useState('')
  const [saved, setSaved] = useState(false)
  const [manualMatch, setManualMatch] = useState({
    team1: '', team2: '', match_time: '19:30'
  })
  const [addingMatch, setAddingMatch] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const isAdmin = user.email === ADMIN_EMAIL

  useEffect(() => {
    fetchTodayMatch()
  }, [])

  const fetchTodayMatch = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('match_date', today)
      .single()
    if (data) {
      setTodayMatch(data)
      if (data.winner) setWinner(data.winner)
    }
    setLoading(false)
  }

  const handleSaveResult = async () => {
    if (!winner || !todayMatch) return
    setSaving(true)
    await supabase
      .from('matches')
      .update({ winner })
      .eq('id', todayMatch.id)

    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', todayMatch.id)

    if (predictions) {
      for (const pred of predictions) {
        await supabase
          .from('predictions')
          .update({ is_correct: pred.predicted_team === winner })
          .eq('id', pred.id)
      }
    }

    setSaved(true)
    setSaving(false)
    fetchTodayMatch()
  }

  const handleAddMatch = async () => {
    if (!manualMatch.team1 || !manualMatch.team2) return
    setAddingMatch(true)
    await supabase.from('matches').insert({
      match_date: today,
      team1: manualMatch.team1,
      team2: manualMatch.team2,
      match_time: manualMatch.match_time
    })
    setAddingMatch(false)
    fetchTodayMatch()
  }

  if (!isAdmin) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
      <p style={{ color: '#8888AA' }}>Admin only!</p>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8888AA' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.3rem' }}>⚙️ Admin Panel</h1>
      <p style={{ color: '#8888AA', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Only you can see this Sunny 😎</p>

      {!todayMatch ? (
        <div style={{ background: '#13131F', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>➕ Add Today's Match</h2>
          <p style={{ fontSize: '0.8rem', color: '#8888AA', marginBottom: '1rem' }}>No match found for today. Add it manually!</p>

          {[['team1', 'Team 1 (e.g. Mumbai Indians)'], ['team2', 'Team 2 (e.g. Chennai Super Kings)']].map(([key, label]) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#8888AA', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
              <input
                type="text"
                value={manualMatch[key]}
                onChange={e => setManualMatch({ ...manualMatch, [key]: e.target.value })}
                placeholder={label}
                style={{
                  width: '100%', padding: '0.9rem 1rem', borderRadius: '14px',
                  background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '0.95rem'
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#8888AA', display: 'block', marginBottom: '0.4rem' }}>Match Time</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['19:30', '15:30'].map(time => (
                <button
                  key={time}
                  onClick={() => setManualMatch({ ...manualMatch, match_time: time })}
                  style={{
                    flex: 1, padding: '0.8rem', borderRadius: '12px',
                    background: manualMatch.match_time === time
                      ? 'linear-gradient(90deg, #E91E8C, #FF6B35)'
                      : '#0A0A0F',
                    color: '#fff', fontSize: '0.9rem', fontWeight: '600',
                    border: manualMatch.match_time === time ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {time === '19:30' ? '🌙 7:30 PM' : '☀️ 3:30 PM'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddMatch}
            disabled={addingMatch}
            style={{
              width: '100%', padding: '1rem', borderRadius: '14px',
              background: 'linear-gradient(90deg, #E91E8C, #FF6B35)',
              color: '#fff', fontSize: '1rem', fontWeight: '700'
            }}
          >
            {addingMatch ? 'Adding...' : '➕ Add Match'}
          </button>
        </div>
      ) : (
        <div style={{ background: '#13131F', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>🏏 Today's Match</h2>
          <div style={{ background: '#0A0A0F', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontWeight: '700', fontSize: '1rem' }}>{todayMatch.team1}</p>
            <p style={{ color: '#E91E8C', fontWeight: '700', margin: '0.3rem 0' }}>VS</p>
            <p style={{ fontWeight: '700', fontSize: '1rem' }}>{todayMatch.team2}</p>
            <p style={{ color: '#8888AA', fontSize: '0.8rem', marginTop: '0.5rem' }}>⏰ {todayMatch.match_time}</p>
          </div>

          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🏆 Enter Match Result</h2>
          {saved && (
            <div style={{ background: '#00E67622', borderRadius: '12px', padding: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
              <p style={{ color: '#00E676', fontSize: '0.9rem', fontWeight: '600' }}>✅ Result saved! Points updated.</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[todayMatch.team1, todayMatch.team2].map(team => (
              <button
                key={team}
                onClick={() => setWinner(team)}
                style={{
                  flex: 1, padding: '0.9rem 0.5rem', borderRadius: '14px',
                  background: winner === team
                    ? 'linear-gradient(90deg, #E91E8C, #FF6B35)'
                    : '#0A0A0F',
                  color: '#fff', fontSize: '0.8rem', fontWeight: '600',
                  border: winner === team ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                🏆 {team.split(' ').slice(-1)[0]}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveResult}
            disabled={saving || !winner}
            style={{
              width: '100%', padding: '1rem', borderRadius: '14px',
              background: winner ? 'linear-gradient(90deg, #E91E8C, #FF6B35)' : '#333',
              color: '#fff', fontSize: '1rem', fontWeight: '700'
            }}
          >
            {saving ? 'Saving...' : '💾 Save Result & Update Points'}
          </button>
        </div>
      )}
    </div>
  )
}