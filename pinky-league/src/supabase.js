import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jnxpcyqwryxidmjpubec.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHBjeXF3cnl4aWRtanB1YmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDEzNDQsImV4cCI6MjA5MjQxNzM0NH0.LiB7fftl36JOHoMGXr8Ivg75vYIesCMAvgvEVmswX1k'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const PLAYERS = [
  { name: 'Sunny', email: 'yeswanthkarthikeya11@gmail.com' },
  { name: 'Karthik', email: 'saikarthikpokala@gmail.com' },
  { name: 'Prasanth', email: 'prasanthaishu937@gmail.com' },
  { name: 'Pinky', email: 'deviaishwarya1279@gmail.com' },
  { name: 'Jeevan', email: 'jeevansaipokala235@gmail.com' },
]

export const getPlayerName = (email) => {
  const player = PLAYERS.find(p => p.email === email)
  return player ? player.name : email
}

export const RAPIDAPI_KEY = 'cec19665d6mshe59c08f80698090p19bd68jsnacf264b7f245'
export const RAPIDAPI_HOST = 'cricbuzz-cricket.p.rapidapi.com'