import { addClient, removeClient } from './clients'
import * as Express from 'express'
import { Request } from '~/types'
import { getCode } from '~/auxFunctions'

export const unsubscribe = (req: Express.Request, res: Express.Response): void => {
  const { token, code, provider } = req.body as Request

  removeClient({ token, provider, code })

  res.send('SUCCESS')
}

export const subscribe = (req: Express.Request, res: Express.Response): void => {
  if (req.body.token) {
    const { token, code, provider, line } = req.body as Request

    console.log(`Line ${line} in ${getCode(provider, code)} requested`)

    addClient({ token, provider, code, line })

    res.send('SUCCESS')
    return
  }

  res.status(404).send('No expo token sent in body')
}
