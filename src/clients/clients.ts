import prettyjson = require('prettyjson')
import { getCode } from '../auxFunctions'
import { ClientEntry } from '../types'
import { sendMessage } from './message'
import { handleStop } from '../services/lines'
import * as Sentry from '@sentry/node'
import Expo from 'expo-server-sdk'

const clients = {} //Provider_code is key, [{token, lines: [{line, time}]}] is value

export function addClient({ token, provider, code, line }): void {
  Sentry.captureMessage(`New Notification Request for ${provider}-${code} ${line} `)
  const newEntry: ClientEntry = {
    token,
    lines: [{ line, time: null, destination: null }],
  }

  const stopCode = getCode(provider, code)
  const stop = clients[stopCode]

  if (stop) {
    let found = false
    const stopAdded = stop.map(({ token: tokenA, lines }) => {
      let newLines = lines
      if (token === tokenA) {
        newLines = [...lines, newEntry.lines[0]]
        found = true
      }

      const entry: ClientEntry = { token: tokenA, lines: newLines }
      return entry
    })

    if (!found) clients[stopCode] = [...stop, newEntry]
    else clients[stopCode] = stopAdded
  } else {
    clients[stopCode] = [newEntry]
  }

  if (process.env.NODE_ENV === 'development') console.log(prettyjson.render(clients))
}

export function updateClient(provider: string, code: string, newData: ClientEntry[]): void {
  const stopCode = getCode(provider, code)

  newData = newData.filter(({ lines }) => lines.length)
  if (newData.length === 0) {
    delete clients[stopCode]
  } else {
    clients[stopCode] = newData
  }
}

export function getClients(): Record<string, ClientEntry[]> {
  return clients
}

export function removeClient({ token: tokenToRemove, provider, code }): void {
  const stopCode = getCode(provider, code)

  const entry = clients[code]

  if (process.env.NODE_ENV === 'development') console.dir(prettyjson.render(entry))

  updateClient(
    provider,
    stopCode,
    entry.filter(({ token }) => token !== tokenToRemove),
  )
}

export function setupNotifications(expo: Expo, interval: number) {
  setInterval(() => {
    const clients = getClients()

    const stops = Object.keys(clients)

    stops.map((stop) => {
      const [provider, code] = stop.split('_')
      const thisClients = clients[stop]

      handleStop(provider, code, thisClients, expo, sendMessage)
    })
  }, interval * 1000)
}
