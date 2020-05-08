import { loadLines } from '../services/lines'
import * as Express from 'express'
import { Request } from '../types'

export const getStop = async (req: Express.Request, res: Express.Response): Promise<void> => {
  const { code, provider } = req.body as Request

  const result = await loadLines(provider, code)
  res.send(result)
}
