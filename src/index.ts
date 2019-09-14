require('dotenv').config()
import express = require('express')
import Expo = require('expo-server-sdk')
import prettyjson = require('prettyjson')

import { addClient, removeClient, getClients } from './clients'
import { sendMessage } from './message'
import { handleStop } from './lines'

const expo = new Expo.Expo()
const app = express()

app.use(express.json())

const port = process.env.PORT || 3000
const interval = process.env.NODE_ENV === 'development' ? 5 : 30

app.post('/unsubscribe', (req, res) => {
  const { token, stopCode, provider } = req.body as Request

  removeClient({ token, provider, stopCode })

  res.send('SUCCESS')
})

app.post('/', (req: express.Request, res: express.Response) => {
  if (req.body.token) {
    const { token, stopCode, provider, line } = req.body as Request

    console.log(`Line ${line} in ${provider}:${stopCode} requested`)

    addClient({ token, provider, stopCode, line })

    res.send('SUCCESS')
    return
  }

  res.send(JSON.stringify(req.body))
})

app.listen(port, () => console.log(`Backend app listening on port ${port}!`))

setInterval(() => {
  const clients = getClients()

  const stops = Object.keys(clients)

  stops.map(stop => {
    const [provider, stopCode] = stop.split('_')
    const thisClients = clients[stop]

    handleStop(provider, stopCode, thisClients, expo, sendMessage)
  })

  if (stops.length > 0) console.log(prettyjson.render(clients))
}, interval * 1000)
