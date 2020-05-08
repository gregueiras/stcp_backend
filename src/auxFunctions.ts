export function getCode(provider: string, code: string): string {
  return `${provider}_${code}`
}

export function cleanTime(time: string): number {
  return parseInt(time.replace(/\*/g, ''))
}
