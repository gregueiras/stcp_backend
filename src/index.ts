require('dotenv').config()
import * as express from 'express'
import * as Expo from 'expo-server-sdk'
import * as prettyjson from 'prettyjson'

import { getClients } from './clients/clients'
import { sendMessage } from './clients/message'
import { handleStop } from './services/lines'

import { unsubscribe, subscribe } from './clients/controller'
import { getStop } from './stops/controller'

const expo = new Expo.Expo()
const app = express()

app.use(express.json())

const port = process.env.PORT || 3000
const interval = process.env.NODE_ENV === 'development' ? 5 : 30

app.post('/subscribe', subscribe)
app.post('/unsubscribe', unsubscribe)
app.post('/stops', getStop)

app.listen(port, () => console.log(`Backend app listening on port ${port}!`))

// Update Subscribed Stops
setInterval(() => {
  const clients = getClients()

  const stops = Object.keys(clients)

  stops.map(stop => {
    const [provider, code] = stop.split('_')
    const thisClients = clients[stop]

    handleStop(provider, code, thisClients, expo, sendMessage)
  })

  if (stops.length > 0) console.log(prettyjson.render(clients))
}, interval * 1000)
