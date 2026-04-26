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

const getWinnerFromStatus = (status) => {
  if (!status || !status.includes('won')) return null
  if (status.includes('Lucknow')) return 'Lucknow Super Giants'
  if (status.includes('Rajasthan')) return 'Rajasthan Royals'
  if (status.includes('Mumbai')) return 'Mumbai Indians'
  if (status.includes('Chennai')) return 'Chennai Super Kings'
  if (status.includes('Kolkata')) return 'Kolkata Knight Riders'
  if (status.includes('Delhi')) return 'Delhi Capitals'
  if (status.includes('Punjab')) return 'Punjab Kings'
  if (status.includes('Sunrisers')) return 'Sunrisers Hyderabad'
  if (status.includes('Gujarat')) return 'Gujarat Titans'
  if (status.includes('Royal')) return 'Royal Challengers Bengaluru'
  return null
}

export default function Home({ user }) {
  const [todayMatches, setTodayMatches] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  const playerName = getPlayerName(user.email)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchTodayMatches()
    checkPreviousMatchResult()
  }, [])

  const fetchFromCricbuzz = async (endpoint) => {
    const res = await fetch(`https://cricbuzz-cricket.p.rapidapi.com/${endpoint}`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    })
    return await res.json()
  }

  const findIPLMatches = (data) => {
    const matches = []
    if (!data?.typeMatches) return matches
    for (const typeMatch of data.typeMatches) {
      for (const seriesMatch of typeMatch.seriesMatches || []) {
        for (const match of seriesMatch.seriesAdWrapper?.matches || []) {
          const matchInfo = match.matchInfo
          const isIPL = matchInfo?.seriesName?.toLowerCase().includes('indian premier league')
          if (isIPL) matches.push(matchInfo)
        }
      }
    }
    return matches
  }

  const fetchTodayMatches = async () => {
    setLoading(true)
    try {
      const { data: existing } = await supabase
        .from('matches').select('*').eq('match_date', today).order('match_time')
      if (existing && existing.length > 0) {
        setTodayMatches(existing)
        await fetchAllPredictions(existing.map(m => m.id))
        setLoading(false)
        return
      }

      let foundMatches = []
      const liveData = await fetchFromCricbuzz('matches/v1/live')
      foundMatches = [...foundMatches, ...findIPLMatches(liveData)]
      const upcomingData = await fetchFromCricbuzz('matches/v1/upcoming')
      foundMatches = [...foundMatches, ...findIPLMatches(upcomingData)]

      const todayMatches = foundMatches.filter(m => {
        const matchDateStr = new Date(parseInt(m.startDate)).toISOString().split('T')[0]
        return matchDateStr === today
      })

      const uniqueMatches = todayMatches.filter((m, i, arr) =>
        arr.findIndex(x => x.matchId === m.matchId) === i
      )

      const savedMatches = []
      for (let i = 0; i < uniqueMatches.length; i++) {
        const m = uniqueMatches[i]
        const { data: existingMatch } = await supabase
          .from('matches').select('*')
          .eq('api_match_id', m.matchId.toString()).single()

        if (existingMatch) {
          savedMatches.push(existingMatch)
          continue
        }

        const matchTime = new Date(parseInt(m.startDate))
        const istOffset = 5.5 * 60 * 60 * 1000
        const istTime = new Date(matchTime.getTime() + istOffset)
        const hours = istTime.getUTCHours().toString().padStart(2, '0')
        const mins = istTime.getUTCMinutes().toString().padStart(2, '0')

        const newMatch = {
          match_date: today,
          team1: m.team1?.teamName || 'Team 1',
          team2: m.team2?.teamName || 'Team 2',
          match_time: `${hours}:${mins}`,
          api_match_id: m.matchId.toString(),
          venue: m.venueInfo?.ground || '',
          city: m.venueInfo?.city || '',
          match_number: i + 1
        }
        const { data: saved } = await supabase.from('matches').insert(newMatch).select().single()
        if (saved) savedMatches.push(saved)
      }

      setTodayMatches(savedMatches)
      await fetchAllPredictions(savedMatches.map(m => m.id))
    } catch (err) {
      console.error('Error fetching matches:', err)
    }
    setLoading(false)
  }

  const fetchAllPredictions = async (matchIds) => {
    const { data } = await supabase
      .from('predictions').select('*')
      .in('match_id', matchIds)
    if (data) setPredictions(data)
  }

  const checkPreviousMatchResult = async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: prevMatches } = await supabase
      .from('matches').select('*').eq('match_date', yesterdayStr)
    if (!prevMatches) return
    for (const prevMatch of prevMatches) {
      if (prevMatch.winner || !prevMatch.api_match_id) continue
      try {
        const data = await fetchFromCricbuzz(`mcenter/v1/${prevMatch.api_match_id}/hscard`)
        if (data?.ismatchcomplete) {
          const winner = getWinnerFromStatus(data.status)
          if (winner) {
            await saveResult(prevMatch, winner)
          }
        } else {
          const recentData = await fetchFromCricbuzz('matches/v1/recent')
          const recentMatches = findIPLMatches(recentData)
          const found = recentMatches.find(m => m.matchId?.toString() === prevMatch.api_match_id)
          if (found && found.state === 'Complete') {
            const winner = getWinnerFromStatus(found.status)
            if (winner) await saveResult(prevMatch, winner)
          }
        }
      } catch (err) {
        console.error('Previous match result fetch failed:', err)
      }
    }
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
  }

  const isMatchLocked = (matchTime) => {
    const now = new Date()
    const [hours, minutes] = matchTime.split(':')
    const matchDate = new Date()
    matchDate.setHours(parseInt(hours), parseInt(minutes), 0)
    return now >= matchDate
  }

  const isMatchLive = (matchTime) => {
    const now = new Date()
    const [hours, minutes] = matchTime.split(':')
    const matchStart = new Date()
    matchStart.setHours(parseInt(hours), parseInt(minutes), 0)
    const matchEnd = new Date(matchStart.getTime() + 4 * 60 * 60 * 1000)
    return now >= matchStart && now < matchEnd
  }

  const handleVote = async (matchId, team) => {
    const existing = predictions.find(p => p.match_id === matchId && p.player_email === user.email)
    if (existing) {
      await supabase.from('predictions').update({ predicted_team: team }).eq('id', existing.id)
    } else {
      await supabase.from('predictions').insert({
        match_id: matchId,
        player_email: user.email,
        player_name: playerName,
        predicted_team: team
      })
    }
    await fetchAllPredictions(todayMatches.map(m => m.id))
  }

  const getMyPrediction = (matchId) => {
    return predictions.find(p => p.match_id === matchId && p.player_email === user.email)?.predicted_team
  }

  const getMatchPredictions = (matchId) => {
    return predictions.filter(p => p.match_id === matchId)
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
        <p style={{ color: '#8888AA' }}>Fetching today's match...</p>
      </div>
    </div>
  )

  if (todayMatches.length === 0) return (
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
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>
          Today's {todayMatches.length > 1 ? 'Matches 🏏🏏' : 'Match 🏏'}
        </h1>
      </div>

      {todayMatches.map((match, index) => {
        const locked = isMatchLocked(match.match_time)
        const live = isMatchLive(match.match_time)
        const myPrediction = getMyPrediction(match.id)
        const matchPreds = getMatchPredictions(match.id)

        return (
          <div key={match.id} style={{ marginBottom: '1.5rem' }}>
            {todayMatches.length > 1 && (
              <p style={{ fontSize: '0.8rem', color: '#E91E8C', fontWeight: '700', marginBottom: '0.5rem' }}>
                {index === 0 ? '☀️ Match 1' : '🌙 Match 2'}
              </p>
            )}

            <div style={{
              background: 'linear-gradient(135deg, #13131F, #1A1A2E)',
              borderRadius: '24px', padding: '1.5rem',
              border: live ? '1px solid rgba(255,59,59,0.4)' : '1px solid rgba(233,30,140,0.2)',
              textAlign: 'center'
            }}>
              {live && !match.winner && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#FF3B3B22', borderRadius: '20px',
                  padding: '0.3rem 0.8rem', marginBottom: '0.5rem'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF3B3B' }} />
                  <span style={{ color: '#FF3B3B', fontSize: '0.75rem', fontWeight: '700' }}>LIVE</span>
                </div>
              )}

              {!live && !match.winner && (
                <p style={{ fontSize: '0.75rem', color: '#8888AA', marginBottom: '0.3rem' }}>
                  {locked ? '🔒 Voting Closed' : `⏰ Voting open till ${match.match_time}`}
                </p>
              )}

              {match.venue && (
                <p style={{ fontSize: '0.7rem', color: '#555577', marginBottom: '1rem' }}>
                  📍 {match.venue}, {match.city}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    {getTeamLogo(match.team1)
                      ? <img src={getTeamLogo(match.team1)} alt={match.team1}
                          style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                      : <span style={{ fontSize: '2.5rem' }}>🏏</span>}
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{match.team1}</p>
                </div>
                <div style={{ padding: '0.5rem 1rem', background: '#0A0A0F', borderRadius: '12px' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: '#E91E8C' }}>VS</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    {getTeamLogo(match.team2)
                      ? <img src={getTeamLogo(match.team2)} alt={match.team2}
                          style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                      : <span style={{ fontSize: '2.5rem' }}>🏏</span>}
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{match.team2}</p>
                </div>
              </div>

              {live && !match.winner && (
                <div style={{ background: '#FF3B3B22', borderRadius: '12px', padding: '0.7rem', marginBottom: '1rem' }}>
                  <p style={{ color: '#FF3B3B', fontSize: '0.85rem', fontWeight: '600' }}>
                    🏏 Match in progress! Results update automatically.
                  </p>
                </div>
              )}

              {match.winner && (
                <div style={{ background: '#00E67622', borderRadius: '14px', padding: '0.8rem', marginBottom: '1rem' }}>
                  <p style={{ color: '#00E676', fontWeight: '700', fontSize: '0.95rem' }}>🏆 Winner: {match.winner}</p>
                </div>
              )}

              {!locked && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#8888AA', marginBottom: '0.8rem' }}>
                    {myPrediction ? `Your pick: ${myPrediction} ✅` : 'Who will win?'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {[match.team1, match.team2].map(team => (
                      <button
                        key={team}
                        onClick={() => handleVote(match.id, team)}
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
              border: '1px solid rgba(255,255,255,0.06)', marginTop: '0.75rem'
            }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem', fontWeight: '600' }}>🗳️ Everyone's Picks</h2>
              {matchPreds.length === 0 ? (
                <p style={{ color: '#555577', fontSize: '0.85rem' }}>No predictions yet...</p>
              ) : (
                matchPreds.map(p => (
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
                      {locked ? (
                        <>
                          {getTeamLogo(p.predicted_team)
                            ? <img src={getTeamLogo(p.predicted_team)} alt={p.predicted_team}
                                style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                            : '🏏'}
                          <span style={{ fontSize: '0.8rem', color: '#8888AA' }}>
                            {p.predicted_team.split(' ').slice(-1)[0]}
                          </span>
                          {match.winner && (
                            <span style={{ fontSize: '1rem' }}>
                              {p.predicted_team === match.winner ? '✅' : '❌'}
                            </span>
                          )}
                        </>
                      ) : (
                        p.player_email === user.email ? (
                          <>
                            {getTeamLogo(p.predicted_team)
                              ? <img src={getTeamLogo(p.predicted_team)} alt={p.predicted_team}
                                  style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                              : '🏏'}
                            <span style={{ fontSize: '0.8rem', color: '#E91E8C' }}>
                              {p.predicted_team.split(' ').slice(-1)[0]} (you)
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#555577' }}>🔒 Hidden</span>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}