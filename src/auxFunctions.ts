export function getCode(provider: string, stopCode: string): string {
  return `${provider}_${stopCode}`
}

export function cleanTime(time: string): number {
  return parseInt(time.replace(/\*/g, ''))
}
