import { useState, useEffect } from 'react'
import { supabase, getPlayerName, RAPIDAPI_KEY, RAPIDAPI_HOST } from '../supabase'

const TEAM_LOGOS = {
  'chennai super kings': 'https://scores.iplt20.com/ipl/teamlogos/CSK.png',
  'mumbai indians': 'https://scores.iplt20.com/ipl/teamlogos/MI.png',
  'royal challengers bengaluru': 'https://scores.iplt20.com/ipl/teamlogos/RCB.png',
  'royal challengers bangalore': 'https://scores.iplt20.com/ipl/teamlogos/RCB.png',
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

export default function Home({ user }) {
  const [todayMatch, setTodayMatch] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [myPrediction, setMyPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [matchLocked, setMatchLocked] = useState(false)
  const [matchLive, setMatchLive] = useState(false)
  const [result, setResult] = useState(null)
  const [autoFetching, setAutoFetching] = useState(false)

  const playerName = getPlayerName(user.email)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchTodayMatch()
  }, [])

  useEffect(() => {
    if (!todayMatch || result) return
    const now = new Date()
    const [hours, minutes] = todayMatch.match_time.split(':')
    const matchStart = new Date()
    matchStart.setHours(parseInt(hours), parseInt(minutes), 0)
    const matchEnd = new Date(matchStart.getTime() + 4 * 60 * 60 * 1000)
    if (now >= matchStart) setMatchLive(true)
    if (now >= matchEnd) {
      autoFetchResult(todayMatch)
    } else if (now >= matchStart) {
      const delay = matchEnd - now
      const timer = setTimeout(() => autoFetchResult(todayMatch), delay)
      return () => clearTimeout(timer)
    }
  }, [todayMatch, result])

useEffect(() => {
    checkPreviousMatchResult()
  }, [])

  const checkPreviousMatchResult = async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: prevMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('match_date', yesterdayStr)
      .single()
    if (prevMatch && !prevMatch.winner && prevMatch.api_match_id) {
      try {
        const data = await fetchFromCricbuzz(`mcenter/v1/${prevMatch.api_match_id}/hscard`)
        if (data?.ismatchcomplete && data?.status) {
          const status = data.status
          const winner = status.includes('won') ?
            (status.includes('Lucknow') ? 'Lucknow Super Giants' :
            status.includes('Rajasthan') ? 'Rajasthan Royals' :
            status.includes('Mumbai') ? 'Mumbai Indians' :
            status.includes('Chennai') ? 'Chennai Super Kings' :
            status.includes('Kolkata') ? 'Kolkata Knight Riders' :
            status.includes('Delhi') ? 'Delhi Capitals' :
            status.includes('Punjab') ? 'Punjab Kings' :
            status.includes('Sunrisers') ? 'Sunrisers Hyderabad' :
            status.includes('Gujarat') ? 'Gujarat Titans' :
            status.includes('Royal') ? 'Royal Challengers Bengaluru' : null) : null
          if (winner) {
            await saveResult(prevMatch, winner)
          }
        }
      } catch (err) {
        console.error('Previous match result fetch failed:', err)
      }
    }
  }

  const fetchFromCricbuzz = async (endpoint) => {
    const res = await fetch(`https://cricbuzz-cricket.p.rapidapi.com/${endpoint}`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    })
    return await res.json()
  }

  const findIPLMatch = (data) => {
    if (!data?.typeMatches) return null
    for (const typeMatch of data.typeMatches) {
      for (const seriesMatch of typeMatch.seriesMatches || []) {
        for (const match of seriesMatch.seriesAdWrapper?.matches || []) {
          const matchInfo = match.matchInfo
          const isIPL = matchInfo?.seriesName?.toLowerCase().includes('indian premier league')
          if (isIPL) return matchInfo
        }
      }
    }
    return null
  }

  const fetchTodayMatch = async () => {
    setLoading(true)
    try {
      const { data: existing } = await supabase
        .from('matches').select('*').eq('match_date', today).single()
      if (existing) {
        setTodayMatch(existing)
        checkLock(existing.match_time)
        if (existing.winner) setResult(existing.winner)
        await fetchPredictions(existing.id)
        setLoading(false)
        return
      }

      let foundMatch = null

      const liveData = await fetchFromCricbuzz('matches/v1/live')
      foundMatch = findIPLMatch(liveData)

      if (!foundMatch) {
        const upcomingData = await fetchFromCricbuzz('matches/v1/upcoming')
        foundMatch = findIPLMatch(upcomingData)
      }

      if (!foundMatch) {
        const recentData = await fetchFromCricbuzz('matches/v1/recent')
        foundMatch = findIPLMatch(recentData)
      }

      if (foundMatch) {
        const matchTime = new Date(parseInt(foundMatch.startDate))
        const istOffset = 5.5 * 60 * 60 * 1000
        const istTime = new Date(matchTime.getTime() + istOffset)
        const hours = istTime.getUTCHours().toString().padStart(2, '0')
        const mins = istTime.getUTCMinutes().toString().padStart(2, '0')
        const matchDateStr = new Date(parseInt(foundMatch.startDate)).toISOString().split('T')[0]
        const newMatch = {
          match_date: matchDateStr,
          team1: foundMatch.team1?.teamName || 'Team 1',
          team2: foundMatch.team2?.teamName || 'Team 2',
          match_time: `${hours}:${mins}`,
          api_match_id: foundMatch.matchId?.toString()
        }
        const { data: existing2 } = await supabase
  .from('matches').select('*').eq('match_date', matchDateStr).single()
if (existing2) {
  setTodayMatch(existing2)
  checkLock(existing2.match_time)
  await fetchPredictions(existing2.id)
  setLoading(false)
  return
}
const { data: saved } = await supabase.from('matches').insert(newMatch).select().single()
        if (saved) {
          setTodayMatch(saved)
          checkLock(saved.match_time)
          await fetchPredictions(saved.id)
        }
      }
    } catch (err) {
      console.error('Error fetching match:', err)
    }
    setLoading(false)
  }

  const autoFetchResult = async (match) => {
    if (!match?.api_match_id) return
    setAutoFetching(true)
    try {
      const data = await fetchFromCricbuzz(`mcenter/v1/${match.api_match_id}/hscard`)
      if (data?.ismatchcomplete && data?.status) {
        const status = data.status
        const winner = status.includes('won') ?
          (status.includes('Lucknow') ? 'Lucknow Super Giants' :
          status.includes('Rajasthan') ? 'Rajasthan Royals' :
          status.includes('Mumbai') ? 'Mumbai Indians' :
          status.includes('Chennai') ? 'Chennai Super Kings' :
          status.includes('Kolkata') ? 'Kolkata Knight Riders' :
          status.includes('Delhi') ? 'Delhi Capitals' :
          status.includes('Punjab') ? 'Punjab Kings' :
          status.includes('Sunrisers') ? 'Sunrisers Hyderabad' :
          status.includes('Gujarat') ? 'Gujarat Titans' :
          status.includes('Royal') ? 'Royal Challengers Bengaluru' : null) : null
        if (winner) {
          await saveResult(match, winner)
        } else {
          setTimeout(() => autoFetchResult(match), 10 * 60 * 1000)
        }
      } else {
        setTimeout(() => autoFetchResult(match), 10 * 60 * 1000)
      }
    } catch (err) {
      setTimeout(() => autoFetchResult(match), 10 * 60 * 1000)
    }
    setAutoFetching(false)
  }

  const saveResult = async (match, winner) => {
    await supabase.from('matches').update({ winner }).eq('id', match.id)
    const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', match.id)
    if (preds) {
      for (const pred of preds) {
        await supabase.from('predictions')
          .update({ is_correct: pred.predicted_team === winner })
          .eq('id', pred.id)
      }
    }
    setResult(winner)
    setMatchLive(false)
    fetchPredictions(match.id)
  }

  const checkLock = (matchTime) => {
    const now = new Date()
    const [hours, minutes] = matchTime.split(':')
    const matchDate = new Date()
    matchDate.setHours(parseInt(hours), parseInt(minutes), 0)
    const matchEnd = new Date(matchDate.getTime() + 4 * 60 * 60 * 1000)
    setMatchLocked(now >= matchDate)
    setMatchLive(now >= matchDate && now < matchEnd)
  }

  const fetchPredictions = async (matchId) => {
    const { data } = await supabase.from('predictions').select('*').eq('match_id', matchId)
    if (data) {
      setPredictions(data)
      const mine = data.find(p => p.player_email === user.email)
      if (mine) setMyPrediction(mine.predicted_team)
    }
  }

  const handleVote = async (team) => {
    if (matchLocked || voting) return
    setVoting(true)
    try {
      const existing = predictions.find(p => p.player_email === user.email)
      if (existing) {
        await supabase.from('predictions').update({ predicted_team: team }).eq('id', existing.id)
      } else {
        await supabase.from('predictions').insert({
          match_id: todayMatch.id,
          player_email: user.email,
          player_name: playerName,
          predicted_team: team
        })
      }
      setMyPrediction(team)
      await fetchPredictions(todayMatch.id)
    } catch (err) {
      console.error('Vote error:', err)
    }
    setVoting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
        <p style={{ color: '#8888AA' }}>Fetching today's match...</p>
      </div>
    </div>
  )

  if (!todayMatch) return (
    <div style={{ padding: '2rem', textAlign: 'center', marginTop: '3rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😴</div>
      <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>No IPL match today!</p>
      <p style={{ color: '#555577', fontSize: '0.85rem', marginTop: '0.5rem' }}>Check back tomorrow 🏏</p>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#8888AA', fontSize: '0.85rem' }}>Hey {playerName}! 👋</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Today's Match 🏏</h1>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #13131F, #1A1A2E)',
        borderRadius: '24px', padding: '1.5rem',
        border: matchLive ? '1px solid rgba(255, 59, 59, 0.4)' : '1px solid rgba(233,30,140,0.2)',
        marginBottom: '1.5rem', textAlign: 'center'
      }}>

        {matchLive && !result && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FF3B3B22', borderRadius: '20px',
            padding: '0.3rem 0.8rem', marginBottom: '1rem'
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#FF3B3B', animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ color: '#FF3B3B', fontSize: '0.75rem', fontWeight: '700' }}>LIVE</span>
          </div>
        )}

        {!matchLive && !result && (
          <p style={{ fontSize: '0.75rem', color: '#8888AA', marginBottom: '1rem' }}>
            {matchLocked ? '🔒 Voting Closed' : `⏰ Voting open till ${todayMatch.match_time}`}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              {getTeamLogo(todayMatch.team1)
                ? <img src={getTeamLogo(todayMatch.team1)} alt={todayMatch.team1}
                    style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                : <span style={{ fontSize: '2.5rem' }}>🏏</span>}
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{todayMatch.team1}</p>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: '#0A0A0F', borderRadius: '12px' }}>
            <p style={{ fontSize: '1rem', fontWeight: '700', color: '#E91E8C' }}>VS</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              {getTeamLogo(todayMatch.team2)
                ? <img src={getTeamLogo(todayMatch.team2)} alt={todayMatch.team2}
                    style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                : <span style={{ fontSize: '2.5rem' }}>🏏</span>}
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{todayMatch.team2}</p>
          </div>
        </div>

        {matchLive && !result && (
          <div style={{ background: '#FF3B3B22', borderRadius: '12px', padding: '0.7rem', marginBottom: '1rem' }}>
            <p style={{ color: '#FF3B3B', fontSize: '0.85rem', fontWeight: '600' }}>
              🏏 Match is in progress! Results will update automatically.
            </p>
          </div>
        )}

        {autoFetching && (
          <div style={{ background: '#FFD60022', borderRadius: '12px', padding: '0.7rem', marginBottom: '1rem' }}>
            <p style={{ color: '#FFD600', fontSize: '0.8rem' }}>⏳ Fetching match result automatically...</p>
          </div>
        )}

        {result && (
          <div style={{ background: '#00E67622', borderRadius: '14px', padding: '0.8rem', marginBottom: '1rem' }}>
            <p style={{ color: '#00E676', fontWeight: '700', fontSize: '0.95rem' }}>🏆 Winner: {result}</p>
          </div>
        )}

        {!matchLocked && (
          <div>
            <p style={{ fontSize: '0.8rem', color: '#8888AA', marginBottom: '0.8rem' }}>
              {myPrediction ? `Your pick: ${myPrediction} ✅` : 'Who will win?'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[todayMatch.team1, todayMatch.team2].map(team => (
                <button
                  key={team}
                  onClick={() => handleVote(team)}
                  disabled={voting}
                  style={{
                    flex: 1, padding: '0.9rem 0.5rem', borderRadius: '14px',
                    background: myPrediction === team
                      ? 'linear-gradient(90deg, #E91E8C, #FF6B35)'
                      : '#0A0A0F',
                    color: '#fff', fontSize: '0.8rem', fontWeight: '600',
                    border: myPrediction === team ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  {getTeamLogo(team)
                    ? <img src={getTeamLogo(team)} alt={team}
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    : '🏏'}
                  <span>{team.split(' ').slice(-1)[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        background: '#13131F', borderRadius: '24px', padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem', fontWeight: '600' }}>🗳️ Everyone's Picks</h2>
        {predictions.length === 0 ? (
          <p style={{ color: '#555577', fontSize: '0.85rem' }}>No predictions yet...</p>
        ) : (
          predictions.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.8rem 1rem', background: '#0A0A0F',
              borderRadius: '12px', marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E91E8C, #FF6B35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: '700'
                }}>
                  {p.player_name[0]}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{p.player_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getTeamLogo(p.predicted_team)
                  ? <img src={getTeamLogo(p.predicted_team)} alt={p.predicted_team}
                      style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                  : '🏏'}
                <span style={{ fontSize: '0.8rem', color: '#8888AA' }}>
                  {p.predicted_team.split(' ').slice(-1)[0]}
                </span>
                {result && (
                  <span style={{ fontSize: '1rem' }}>
                    {p.predicted_team === result ? '✅' : '❌'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}