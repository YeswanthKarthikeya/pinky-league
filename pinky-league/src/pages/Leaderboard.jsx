import { useState, useEffect } from 'react'
import { supabase, PLAYERS } from '../supabase'

const TEAM_LOGOS = {
  'chennai super kings': 'https://scores.iplt20.com/ipl/teamlogos/CSK.png',
  'mumbai indians': 'https://scores.iplt20.com/ipl/teamlogos/MI.png',
  'royal challengers bengaluru': 'https://scores.iplt20.com/ipl/teamlogos/RCB.png',
  'kolkata knight riders': 'https://scores.iplt20.com/ipl/teamlogos/KKR.png',
  'delhi capitals': 'https://scores.iplt20.com/ipl/teamlogos/DC.png',
  'punjab kings': 'https://scores.iplt20.com/ipl/teamlogos/PBKS.png',
  'rajasthan royals': 'https://scores.iplt20.com/ipl/teamlogos/RR.png',
  'sunrisers hyderabad': 'https://scores.iplt20.com/ipl/teamlogos/SRH.png',
  'lucknow super giants': 'https://scores.iplt20.com/ipl/teamlogos/LSG.png',
  'gujarat titans': 'https://scores.iplt20.com/ipl/teamlogos/GT.png',
}

const getTeamLogo = (team) => {
  if (!team) return null
  const lower = team.toLowerCase().trim()
  if (TEAM_LOGOS[lower]) return TEAM_LOGOS[lower]
  if (lower.includes('rajasthan')) return TEAM_LOGOS['rajasthan royals']
  if (lower.includes('lucknow')) return TEAM_LOGOS['lucknow super giants']
  if (lower.includes('chennai')) return TEAM_LOGOS['chennai super kings']
  if (lower.includes('mumbai')) return TEAM_LOGOS['mumbai indians']
  if (lower.includes('royal challengers')) return TEAM_LOGOS['royal challengers bengaluru']
  if (lower.includes('kolkata')) return TEAM_LOGOS['kolkata knight riders']
  if (lower.includes('delhi')) return TEAM_LOGOS['delhi capitals']
  if (lower.includes('punjab')) return TEAM_LOGOS['punjab kings']
  if (lower.includes('sunrisers')) return TEAM_LOGOS['sunrisers hyderabad']
  if (lower.includes('gujarat')) return TEAM_LOGOS['gujarat titans']
  return null
}

export default function Leaderboard({ user }) {
  const [standings, setStandings] = useState([])
  const [history, setHistory] = useState([])
const [allPredictions, setAllPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .not('winner', 'is', null)
      .order('match_date', { ascending: false })

    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')

    if (matches && predictions) {
      calculateStandings(matches, predictions)
      setHistory(matches)
      setAllPredictions(predictions)
    }
    setLoading(false)
  }

  const calculateStandings = (matches, predictions) => {
    const scores = {}
    PLAYERS.forEach(p => {
      scores[p.email] = { name: p.name, correct: 0, total: 0, email: p.email, team: p.team }
    })

    const completedMatchIds = new Set(matches.filter(m => m.winner).map(m => m.id))

    predictions.forEach(pred => {
      if (scores[pred.player_email] && completedMatchIds.has(pred.match_id)) {
        scores[pred.player_email].total++
        if (pred.is_correct) {
          scores[pred.player_email].correct++
        }
      }
    })

    const sorted = Object.values(scores).sort((a, b) => b.correct - a.correct)
    setStandings(sorted)
  }

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const getPredictionsForMatch = async (matchId) => {
    const { data } = await supabase.from('predictions').select('*').eq('match_id', matchId)
    return data || []
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8888AA' }}>Loading leaderboard...</p>
    </div>
  )

  const getMilestone = (correct, total) => {
    const wrong = total - correct
    const milestones = {
      right: {
        6: { name: '🏏 SIX SIXES MODE', quote: "Yuvraj Singh energy! Six right in a row — boundaries everywhere!", img: 'https://d1af7m13b2f34i.cloudfront.net/2022/06/Yuvraj-Singh-1.jpg', color: '#FFD600', bg: 'rgba(255,214,0,0.08)', border: 'rgba(255,214,0,0.2)' },
        7: { name: '🚁 HELICOPTER MODE', quote: "Finisher mode activated! Even Dhoni would be proud of this chase!", img: 'https://wallpapercave.com/wp/wp2496969.jpg', color: '#FFD600', bg: 'rgba(255,214,0,0.08)', border: 'rgba(255,214,0,0.2)' },
        10: { name: '🏏 STRAIGHT DRIVE CLUB', quote: "The Sachin of predictions — a century is loading!", img: 'https://kartikv.krajee.com/wp-content/uploads/2013/11/Sachin-Straight-Drive.jpg', color: '#00E676', bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.2)' },
        17: { name: '🎲 RISHABH\'S ROULETTE', quote: "Unpredictable, explosive, unstoppable! Pure Pant energy!", img: 'https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1H9jf7.img?w=1200&h=900&m=4&q=65', color: '#E91E8C', bg: 'rgba(233,30,140,0.08)', border: 'rgba(233,30,140,0.2)' },
        18: { name: '👑 CHASE MASTER ELITE', quote: "Chasing targets like it's a World Cup final. King Kohli approves!", img: 'https://im.rediff.com/cricket/2023/jan/17kohli1.jpg', color: '#FF6B35', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.2)' },
      },
      wrong: {
        6: { name: '😢 SIX MISSES, YUVI WEEPS', quote: "Six wrong predictions! Even Yuvi is shedding a tear for you!", img: 'https://cdn1.wionews.com/prod/wion/images/2025/20250913/image-1757766759237.png', color: '#FF5252', bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)' },
        7: { name: '📺 DRS DISASTER', quote: "Even Dhoni couldn't finish this one. Time to review the DRS!", img: 'https://www.financialexpress.com/wp-content/uploads/2025/04/FotoJet-2025-04-15T073318.995.jpg', color: '#FF5252', bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)' },
        10: { name: '😢 SACHIN WOULD CRY', quote: "Even God gets it wrong sometimes. But 10 times? Sachin is in tears!", img: 'https://media.gettyimages.com/id/1141630243/photo/indias-sachin-tendulkar-walks-back-after-getting-out-during-final-day-of-the-third-test.jpg?s=612x612&w=gi&k=20&c=3YC6pmbW62IXdyiNzq4iAy2i9p7vljOjFTefF6JELWw=', color: '#FF5252', bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)' },
        17: { name: '🧤 STUMPED LIKE PANT', quote: "Pant would've stumped you by now. Time to glove up!", img: 'https://c.ndtvimg.com/2021-03/78eje1og_rishabh-pant-bcci_625x300_06_March_21.jpg', color: '#FF5252', bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)' },
        18: { name: '💔 NOT EVEN ANUSHKA', quote: "Not even Anushka can save your predictions now. Virat is disappointed!", img: 'https://static.independent.co.uk/2023/05/03/03/Screenshot%202023-05-03%20081417.png', color: '#FF5252', bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)' },
      }
    }
    if (milestones.right[correct]) return milestones.right[correct]
    if (milestones.wrong[wrong]) return milestones.wrong[wrong]
    return null
  }

  return (
    <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.3rem' }}>🏆 Leaderboard</h1>
      <p style={{ color: '#8888AA', fontSize: '0.85rem', marginBottom: '1.5rem' }}>The Pinky League standings</p>

      <div style={{ marginBottom: '1.5rem' }}>
  {standings.map((player, index) => (
    <div key={player.email} style={{
      padding: '1rem 1.2rem',
      background: player.email === user.email
        ? 'linear-gradient(135deg, #E91E8C22, #FF6B3522)'
        : '#13131F',
      borderRadius: '18px',
      marginBottom: '0.6rem',
      border: player.email === user.email
        ? '1px solid rgba(233,30,140,0.3)'
        : '1px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: index < 3 ? '1.5rem' : '1rem', minWidth: '32px', textAlign: 'center', color: '#8888AA', fontWeight: '700' }}>
          {getMedalEmoji(index)}
        </div>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: '#0A0A0F',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden'
        }}>
          {getTeamLogo(player.team)
            ? <img src={getTeamLogo(player.team)} alt={player.team}
                style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            : <span style={{ fontSize: '1rem', fontWeight: '700' }}>{player.name[0]}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>
            {player.name} {player.email === user.email ? '(you)' : ''}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#8888AA' }}>
            {player.correct}/{player.total} correct
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: index === 0 ? '#FFD600' : '#fff' }}>
            {player.correct}
          </p>
          <p style={{ fontSize: '0.7rem', color: '#8888AA' }}>points</p>
        </div>
      </div>
      {(() => {
        const milestone = getMilestone(player.correct, player.total)
        if (!milestone) return null
        return (
          <div style={{
            marginTop: '0.8rem',
            background: milestone.bg,
            border: `1px solid ${milestone.border}`,
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <img src={milestone.img} alt="milestone"
              style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '1px', color: milestone.color, marginBottom: '4px' }}>
                {milestone.name}
              </p>
              <p style={{ fontSize: '0.78rem', color: milestone.color, opacity: 0.8, lineHeight: 1.4 }}>
                {milestone.quote}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  ))}
</div>

      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#8888AA' }}>📅 Match History</h2>
          {history.map(match => {
            const matchPreds = allPredictions.filter(p => p.match_id === match.id)
            return (
              <div key={match.id} style={{
                background: '#13131F', borderRadius: '18px', padding: '1rem 1.2rem',
                marginBottom: '0.6rem', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                      {match.team1} vs {match.team2}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#8888AA', marginTop: '0.2rem' }}>
                      {formatDate(match.match_date)}
                    </p>
                  </div>
                  <div style={{ background: '#00E67622', borderRadius: '10px', padding: '0.4rem 0.8rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#00E676', fontWeight: '600' }}>
                      🏆 {match.winner?.split(' ').slice(-2).join(' ')}
                    </p>
                  </div>
                </div>

                {matchPreds.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
                    {matchPreds.map(pred => (
                      <div key={pred.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: '0.4rem'
                      }}>
                        <span style={{ fontSize: '0.78rem', color: '#8888AA' }}>{pred.player_name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#fff' }}>
                            {pred.predicted_team.split(' ').slice(-1)[0]}
                          </span>
                          <span>{pred.is_correct ? '✅' : '❌'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p style={{ color: '#555577', fontSize: '0.85rem' }}>No completed matches yet!</p>
        </div>
      )}
    </div>
  )
}