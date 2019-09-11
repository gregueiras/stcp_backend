function getCode(provider: string, stopCode: string): string {
  return `${provider}_${stopCode}`
}

export { getCode }
