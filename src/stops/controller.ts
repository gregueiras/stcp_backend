import { getLines } from 'src/services/lines'
import * as Express from 'express'
import { Request } from 'src/types'

export const getStop = async (req: Express.Request, res: Express.Response): Promise<void> => {
  const { code, provider } = req.body as Request

  const result = await getLines(provider, code)
  res.send(result)
}
