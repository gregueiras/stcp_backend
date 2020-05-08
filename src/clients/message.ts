import AuxExpo = require('expo-server-sdk')
import Expo = AuxExpo.Expo
import ExpoPushMessage = AuxExpo.ExpoPushMessage
import { Line } from '../types'

function sendMessage(token: string, lines: Line[], code: string, expo: Expo): void {
  if (!Expo.isExpoPushToken(token)) {
    console.error('Invalid Token')
    return
  }

  const body = lines
    .map(({ line, destination, time }) => `${line} - ${destination.replace(/\t/g, '').replace(/  */g, ' ')} - ${time}`)
    .join('\n')

  const message: ExpoPushMessage = {
    to: token,
    sound: 'default',
    body,
    title: code,
  }

  if (body.length > 0) {
    expo.sendPushNotificationsAsync([message])
    console.log('SENT')
  }
}

export { sendMessage }
