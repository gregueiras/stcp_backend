export interface Request {
  token: string
  code: string
  provider: string
  line: string
}

export interface Line {
  line: string
  destination: string
  time: string
  remainingTime?: string
}

export interface ClientEntry {
  token: string
  lines: Line[]
}

export interface APIEntry {
    Key: number,
    Value: string[]
}
