import * as Expo from 'expo-server-sdk'
import fetch from 'node-fetch'
import { parse, HTMLElement } from 'node-html-parser'

import { updateClient } from '../clients/clients'
import { cleanTime } from '../auxFunctions'
import { Line, ClientEntry } from '../types'

async function loadLines(providerTemp: string, code: string): Promise<Line[]> {
  try {
    const provider = providerTemp.replace(/ /g, '+').toUpperCase()
    const stop = code.replace(/ /g, '+')

    if (provider !== 'STCP') throw 'Invalid Provider'

    // MOVE-ME API stopped working, even in the official site
    //const searchUrl = `http://www.move-me.mobi/NextArrivals/GetScheds?providerName=${provider}&code=${provider}_${stop}`
    const searchUrl = `https://www.stcp.pt/pt/itinerarium/soapclient.php?codigo=${stop}`

    const response = await fetch(searchUrl) // fetch page
    const page = await response.text() // get response text
    const parsed = parse(page) as HTMLElement

    const rows = parsed.querySelectorAll('tr').slice(1)
    const lines = rows.map(row =>
      row
        .querySelectorAll('td')
        .map(cell => {
          const length = cell.childNodes.length

          if (length > 1) {
            return {
              line: cell.childNodes[1].childNodes[1].text.trim(),
              destination: cell.childNodes[2].rawText.replace(/(&nbsp;)|(-)/g, '').trim(),
            }
          }

          if (cell?.childNodes[0]?.childNodes?.length > 0) {
            return { time: cell.rawText.trim() }
          } else {
            return { remainingTime: cell.rawText }
          }
        })
        // @ts-ignore
        .reduce((acc, currVal) => ({ ...acc, ...currVal })),
    )

    return lines;
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
