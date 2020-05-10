import * as Express from 'express'
import { getLines } from '~/services/lines'
import { Request } from '~/types'

export const getStop = async (req: Express.Request, res: Express.Response): Promise<void> => {
  const { code, provider } = req.body as Request

  const result = await getLines(provider, code)
  res.send(result)
}
