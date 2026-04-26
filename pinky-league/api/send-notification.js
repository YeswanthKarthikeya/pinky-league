export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { title, message } = req.body

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key os_v2_app_ihgnyb4qhjccvklzozwnqbq6oufxcppxpyaudmvn4vywsfynrdialvirrihfyphvkjkqkw46e5u5dwo2ng4ds56btpdtdecsbo4fcra'
      },
      body: JSON.stringify({
        app_id: '41ccdc07-903a-442a-a979-766cd8061e75',
        included_segments: ['Total Subscriptions'],
        headings: { en: title },
        contents: { en: message }
      })
    })
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}