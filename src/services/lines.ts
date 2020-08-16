import * as Expo from 'expo-server-sdk'
import axios from 'axios'
import * as Sentry from '@sentry/node'

import { parse, HTMLElement } from 'node-html-parser'

import { updateClient } from '~/clients/clients'
import { cleanTime, getCode } from '~/auxFunctions'
import { Line, ClientEntry, APIEntry } from '~/types'
import CacheService from './cache'

const ttl = 30 // cache for 30 seconds
const cache = new CacheService(ttl) // Create a new cache service instance

async function loadLines(providerName: string, stop: string): Promise<Line[]> {
    try {

        const stopCode = `${providerName}_${stop}`

        const headers = {
            'Perda': 'de Tempo',
            '__RequestVerificationToken': 'JRqFPQew1Lx4thDU7cjZ27nL4SE6-SWhc3vv9F_oh71-hw86WkfjtuuPWV0i2SaM_M3J5RHmNKzXTidZWxhrbYkvNRnmucywh8yftB_2vXFsdH6H0brSjO_wHRzAYQw9x0dRN0yhyAYdNLOPKWh_b6tXN-iDhQaqZtRoRPdFLjc1',
            'Content-Type': 'application/json',
            'Origin': 'http://www.move-me.mobi',
            'Referer': 'http://www.move-me.mobi/NextArrivals/Search',
            'Cookie': 'ASP.NET_SessionId=mbhg35wzzvwi5wduybayctfj; __RequestVerificationToken=FhTs2cc4vcIWqQxfQwv2dMVN0F_hoTzxY0CPyOSGhSYc0m_JeDU3_NsOIiHJMmGAbrWtjpVFSyuWeZnE0IobrEABCX-xH0om3DWbxmSRBh15CQoYrP7bmwM3CHib7T7Tlwt2J_3-cLBxfgE5wI4G7g2'
        };

        const searchUrl = 'http://www.move-me.mobi/NextArrivals/GetScheds'
        const response = await axios({
            method: "POST",
            url: searchUrl,
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
        console.log(error)
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
