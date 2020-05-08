require('dotenv').config()
import * as express from 'express'
import Expo from 'expo-server-sdk'
import * as Sentry from '@sentry/node'

import { setupNotifications } from './clients/clients'

import { unsubscribe, subscribe } from './clients/controller'
import { getStop } from './stops/controller'

const expo = new Expo()
const app = express()
if (process.env.NODE_ENV !== 'development') {
  Sentry.init({ dsn: process.env.SENTRY })
  app.use(Sentry.Handlers.requestHandler())
}

app.use(express.json())

const port = process.env.PORT || 3000

app.post('/subscribe', subscribe)
app.post('/unsubscribe', unsubscribe)
app.post('/stops', getStop)

app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!')
})

app.use(Sentry.Handlers.errorHandler())

app.listen(port, () => console.log(`Backend app listening on port ${port}!`))

const interval = process.env.NODE_ENV === 'development' ? 5 : 30
setupNotifications(expo, interval)
