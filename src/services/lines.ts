import * as Expo from 'expo-server-sdk'
import * as fetch from 'node-fetch'
import { updateClient } from '../clients/clients'
import { cleanTime } from '../auxFunctions'
import { Line, ClientEntry } from '../types'

async function loadLines(providerTemp: string, code: string): Promise<Line[]> {
  try {
    const provider = providerTemp.replace(/ /g, '+').toUpperCase()
    const stop = code.replace(/ /g, '+')

    const searchUrl = `http://www.move-me.mobi/NextArrivals/GetScheds?providerName=${provider}&code=${provider}_${stop}`

    const response = await fetch(searchUrl) // fetch page
    const json = await response.json() // get response text

    const info = json
      .map(({ Value }) => Value)
      .map(([line, destination, time]) => {
        const ret: Line = {
          line,
          destination,
          time,
        }

        return ret
      })

    return info
  } catch (error) {
    console.log('ERROR')
    console.log(error)
  }
}

async function handleStop(
  provider: string,
  code: string,
  clientsArray: ClientEntry[],
  expo: Expo.Expo,
  sendMessage: Function,
): Promise<void> {
  const info = await loadLines(provider, code)
  const lines = [...new Set(info.map(({ line }) => line))]

  const nextLines = lines
    .map(wantedLine => info.find(({ line }) => line === wantedLine))
    .sort(({ time: timeA }, { time: timeB }) => {
      return cleanTime(timeA) - cleanTime(timeB)
    })

  const newData = clientsArray.map(({ token, lines }) => {
    const wantedLines: Line[] = lines
      .map(({ line: wantedLine, time: lastTime }) => {
        const { line, destination, time } = nextLines.find(({ line }) => line === wantedLine)

        if (lastTime) {
          const timeDiff = Math.abs(cleanTime(lastTime) - cleanTime(time))
          if (timeDiff > 3) return null
        }
        return { line, destination, time }
      })
      .flat(2)
      .filter(entry => entry !== null)
      .sort(({ time: timeA }, { time: timeB }) => {
        return cleanTime(timeA) - cleanTime(timeB)
      })

    sendMessage(token, wantedLines, code, expo)
    return { token, lines: wantedLines }
  })

  updateClient(provider, code, newData)
}

export { handleStop, loadLines }
