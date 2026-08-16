const TELEGRAM_START_RE = /^\/start(?:@[\w]+)?$/i

export function isTelegramStartCommand(text: string): boolean {
  return TELEGRAM_START_RE.test(text.trim())
}

export function isTelegramPrivateChat(targetChatId: string): boolean {
  const n = Number(targetChatId)
  return Number.isFinite(n) && n > 0
}
