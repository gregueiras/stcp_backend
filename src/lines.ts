import Expo = require('expo-server-sdk')
import fetch = require('node-fetch')
import { updateClient } from './clients'

async function loadLines(providerTemp: string, stopCode: string): Promise<Line[]> {
  try {
    const provider = providerTemp.replace(/ /g, '+').toUpperCase()
    const stop = stopCode.replace(/ /g, '+')

    const searchUrl = `http://www.move-me.mobi/NextArrivals/GetScheds?providerName=${provider}&stopCode=${provider}_${stop}`

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
  stopCode: string,
  clientsArray: ClientEntry[],
  expo: Expo.Expo,
  sendMessage: Function,
): Promise<void> {
  const info = await loadLines(provider, stopCode)
  const lines = [...new Set(info.map(({ line }) => line))]

  const nextLines = lines
    .map(wantedLine => info.find(({ line }) => line === wantedLine))
    .sort(({ time: timeA }, { time: timeB }) => {
      return parseInt(timeA.replace('*', '')) - parseInt(timeB.replace('*', ''))
    })

  const newData = clientsArray.map(({ token, lines }) => {
    const wantedLines: Line[] = lines
      .map(({ line: wantedLine, time: lastTime }) => {
        const { line, destination, time } = nextLines.find(({ line }) => line === wantedLine)

        if (lastTime) {
          const timeDiff = Math.abs(parseInt(lastTime.replace('*', '')) - parseInt(time.replace('*', '')))
          if (timeDiff > 3) return null
        }
        return { line, destination, time }
      })
      .flat(2)
      .filter(entry => entry !== null)
      .sort(({ time: timeA }, { time: timeB }) => {
        return parseInt(timeA.replace('*', '')) - parseInt(timeB.replace('*', ''))
      })

    sendMessage(token, wantedLines, stopCode, expo)
    return { token, lines: wantedLines }
  })

  updateClient(provider, stopCode, newData)
}

export { handleStop, loadLines }
