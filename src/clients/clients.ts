import prettyjson from 'prettyjson'
import { getCode } from '~/auxFunctions'
import { ClientEntry, Request } from '~/types'
import { sendMessage } from './message'
import { handleStop } from '~/services/lines'
import * as Sentry from '@sentry/node'
import Expo from 'expo-server-sdk'

interface Clients {
  [key: string]: ClientEntry[]
}

const clients: Clients = {} //Provider_code is key, [{token, lines: [{line, time}]}] is value

export function addClient({ token, provider, code, line }: Request): void {
  Sentry.captureMessage(`New Notification Request for ${getCode(provider, code)} ${line} `)
   
  if ( !token || !provider || !code || !line ) return;
  
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

export function getClients(): Clients {
  return clients
}

export function removeClient({
  token: tokenToRemove,
  provider,
  code,
}: Pick<Request, 'code' | 'provider' | 'token'>): void {
  const stopCode = getCode(provider, code)

  const entry = clients[code]

  if (process.env.NODE_ENV === 'development') console.dir(prettyjson.render(entry))

  try {
    updateClient(
      provider,
      stopCode,
      entry.filter(({ token }) => token !== tokenToRemove),
    )
  } catch (error) {
    Sentry.captureException(error)
  }
}

export function setupNotifications(expo: Expo, interval: number): void {
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
