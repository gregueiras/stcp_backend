interface Request {
  token: string
  stopCode: string
  provider: string
  line: string
}

interface Line {
  line: string
  destination: string
  time: string
}

interface ClientEntry {
  token: string
  lines: Line[]
}
