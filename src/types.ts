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
}

export interface ClientEntry {
  token: string
  lines: Line[]
}
