import prettyjson = require('prettyjson')
import { getCode } from './auxFunctions'

const clients = {} //Provider_StopCode is key, [{token, lines: [{line, time}]}] is value

export function addClient({ token, provider, stopCode, line }): void {
  const newEntry: ClientEntry = {
    token,
    lines: [{ line, time: null, destination: null }],
  }

  const code = getCode(provider, stopCode)
  const stop = clients[code]

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

    if (!found) clients[code] = [...stop, newEntry]
    else clients[code] = stopAdded
  } else {
    clients[code] = [newEntry]
  }

  console.log(prettyjson.render(clients))
}

export function updateClient(provider: string, stopCode: string, newData: ClientEntry[]): void {
  const code = getCode(provider, stopCode)

  newData = newData.filter(({ lines }) => lines.length)
  if (newData.length === 0) {
    delete clients[code]
  } else {
    clients[code] = newData
  }
}

export function getClients(): Record<string, ClientEntry[]> {
  return clients
}

export function removeClient({ token: tokenToRemove, provider, stopCode }): void {
  const code = getCode(provider, stopCode)
  console.log(code)
  const entry = clients[code]

  console.dir(prettyjson.render(entry))

  updateClient(provider, stopCode, entry.filter(({ token }) => token !== tokenToRemove)
}
