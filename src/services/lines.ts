import * as Expo from 'expo-server-sdk'
import axios from 'axios'
import * as Sentry from '@sentry/node'

import { updateClient } from '~/clients/clients'
import { cleanTime, getCode } from '~/auxFunctions'
import { Line, ClientEntry, APIEntry } from '~/types'
import CacheService from './cache'

const ttl = 30 // cache for 30 seconds
const cache = new CacheService(ttl) // Create a new cache service instance

async function loadLines(providerName: string, stop: string): Promise<Line[]> {
    try {
        // Load the page to retrieve the correct tokens/headers
        const url = 'http://www.move-me.mobi/NextArrivals'
        const searchURL = `${url}/Search`
        const lineURL = `${url}/GetScheds`

        const init = await axios({
            method: "GET",
            url: searchURL,
        })

        const regex = /^.*?;/
        const tokenRegex = /(\<form action=\"\/NextArrivals\/Search\" id=\"__AjaxAntiForgeryForm\" method=\"post\"\>\<input name=\"__RequestVerificationToken\" type=\"hidden\" value=\")(.*?)" /

        const token = tokenRegex.exec(init.data)[2]

        const cookies = init.headers["set-cookie"].map((header: string) => 
            regex.exec(header)[0]
        ).reduce((unique: string[], item:string) =>  
            unique.includes(item) ? unique : [...unique, item],
            []
        ).join(
            " "
        ).slice(0, -1)

        const stopCode = `${providerName}_${stop}`

        const headers = {
            'perda': 'de Tempo',
            '__RequestVerificationToken': token,
            'Content-Type': 'application/json',
            'Origin': 'http://www.move-me.mobi',
            'Referer': lineURL,
            'Cookie': cookies
        };

        const response = await axios({
            method: "POST",
            url: lineURL,
            data: { providerName, stopCode },
            headers,
        })
        const data = response.data as APIEntry[]

        const lines = data.map(({ Value }) => {
            const [line, destination, time] = Value

            return {
                line,
                destination,
                time
            }
        })

        return lines;

    } catch (error) {
        console.log('ERROR')
        Sentry.captureException(error)
        console.log(error.response.status)
        console.log(error.response.statusText)
    }
    /**
     * 
      // Alternative API, only works for STCP
      if (provider !== 'STCP') throw 'Invalid Provider'
      const searchUrl = `https://www.stcp.pt/pt/itinerarium/soapclient.php?codigo=${stop}`

      const response = await fetch(searchUrl) // fetch page
      const page = await response.text() // get response text
      const parsed = parse(page) as HTMLElement

      const rows = parsed.querySelectorAll('tr').slice(1)
      const lines = rows.map((row) =>
        row
          .querySelectorAll('td')
          .map((cell) => {
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

      return lines as Line[]
    } catch (error) {
      console.log('ERROR')
      Sentry.captureException(error)
      console.log(error)
    } 

  */

}

export async function handleStop(
    provider: string,
    code: string,
    clientsArray: ClientEntry[],
    expo: Expo.Expo,
    sendMessage: Function,
): Promise<void> {
    const info = await loadLines(provider, code)
    const lines = [...new Set(info.map(({ line }) => line))]

    const nextLines = lines
        .map((wantedLine) => info.find(({ line }) => line === wantedLine))
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
            .filter((entry) => entry !== null)
            .sort(({ time: timeA }, { time: timeB }) => {
                return cleanTime(timeA) - cleanTime(timeB)
            })

        sendMessage(token, wantedLines, code, expo)
        return { token, lines: wantedLines }
    })

    updateClient(provider, code, newData)
}

export async function getLines(provider: string, codeTemp: string): Promise<Line[]> {
    // Remove accented characters and lower case all characters
    const code = codeTemp.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

    const key = getCode(provider, code)
    Sentry.captureMessage(`New Line Request for ${provider}-${code}`)

    return await cache.get(key, () => loadLines(provider, code))
}
