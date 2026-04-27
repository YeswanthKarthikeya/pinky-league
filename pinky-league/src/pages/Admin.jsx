import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ADMIN_EMAIL = 'yeswanthkarthikeya11@gmail.com'
const ONESIGNAL_APP_ID = '41ccdc07-903a-442a-a979-766cd8061e75'
const ONESIGNAL_API_KEY = 'os_v2_app_ihgnyb4qhjccvklzozwnqbq6oufxcppxpyaudmvn4vywsfynrdialvirrihfyphvkjkqkw46e5u5dwo2ng4ds56btpdtdecsbo4fcra'

export default function Admin({ user }) {
  const [todayMatches, setTodayMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [winners, setWinners] = useState({})
  const [saved, setSaved] = useState({})
  const [saving, setSaving] = useState({})
  const [manualMatch, setManualMatch] = useState({ team1: '', team2: '', match_time: '19:30' })
  const [addingMatch, setAddingMatch] = useState(false)
  const [reminderSent, setReminderSent] = useState({})

  const today = new Date().toISOString().split('T')[0]
  const isAdmin = user.email === ADMIN_EMAIL

  useEffect(() => {
    fetchTodayMatches()
  }, [])

  const fetchTodayMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('match_date', today)
      .order('match_time')
    if (data) {
      setTodayMatches(data)
      const w = {}
      data.forEach(m => { if (m.winner) w[m.id] = m.winner })
      setWinners(w)
    }
    setLoading(false)
  }

  const handleSaveResult = async (match) => {
    if (!winners[match.id]) return
    setSaving(prev => ({ ...prev, [match.id]: true }))
    await supabase.from('matches').update({ winner: winners[match.id] }).eq('id', match.id)
    const { data: predictions } = await supabase.from('predictions').select('*').eq('match_id', match.id)
    if (predictions) {
      for (const pred of predictions) {
        await supabase.from('predictions')
          .update({ is_correct: pred.predicted_team === winners[match.id] })
          .eq('id', pred.id)
      }
    }
    setSaved(prev => ({ ...prev, [match.id]: true }))
    setSaving(prev => ({ ...prev, [match.id]: false }))
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
    setManualMatch({ team1: '', team2: '', match_time: '19:30' })
    fetchTodayMatches()
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

      <div style={{ background: '#13131F', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>➕ Add Match Manually</h2>
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
                    ? 'linear-gradient(90deg, #E91E8C, #FF6B35)' : '#0A0A0F',
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

      {todayMatches.length === 0 ? (
        <p style={{ color: '#555577', textAlign: 'center', fontSize: '0.85rem' }}>No matches today yet!</p>
      ) : (
        todayMatches.map((match, index) => (
          <div key={match.id} style={{ background: '#13131F', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>
              {todayMatches.length > 1 ? (index === 0 ? '☀️ Match 1' : '🌙 Match 2') : '🏏 Today\'s Match'}
            </h2>
            <div style={{ background: '#0A0A0F', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
              <p style={{ fontWeight: '700', fontSize: '1rem' }}>{match.team1}</p>
              <p style={{ color: '#E91E8C', fontWeight: '700', margin: '0.3rem 0' }}>VS</p>
              <p style={{ fontWeight: '700', fontSize: '1rem' }}>{match.team2}</p>
              <p style={{ color: '#8888AA', fontSize: '0.8rem', marginTop: '0.5rem' }}>⏰ {match.match_time}</p>
            </div>


            <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🏆 Enter Match Result</h2>
            {saved[match.id] && (
              <div style={{ background: '#00E67622', borderRadius: '12px', padding: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                <p style={{ color: '#00E676', fontSize: '0.9rem', fontWeight: '600' }}>✅ Result saved! Points updated.</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {[match.team1, match.team2].map(team => (
                <button
                  key={team}
                  onClick={() => setWinners(prev => ({ ...prev, [match.id]: team }))}
                  style={{
                    flex: 1, padding: '0.9rem 0.5rem', borderRadius: '14px',
                    background: winners[match.id] === team
                      ? 'linear-gradient(90deg, #E91E8C, #FF6B35)' : '#0A0A0F',
                    color: '#fff', fontSize: '0.8rem', fontWeight: '600',
                    border: winners[match.id] === team ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  🏆 {team.split(' ').slice(-1)[0]}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleSaveResult(match)}
              disabled={saving[match.id] || !winners[match.id]}
              style={{
                width: '100%', padding: '1rem', borderRadius: '14px',
                background: winners[match.id] ? 'linear-gradient(90deg, #E91E8C, #FF6B35)' : '#333',
                color: '#fff', fontSize: '1rem', fontWeight: '700'
              }}
            >
              {saving[match.id] ? 'Saving...' : '💾 Save Result & Update Points'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}