export function getClientIp(event: Parameters<typeof getHeader>[0]) {
  const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = getHeader(event, 'x-real-ip')?.trim()
  const remoteAddress = event.node.req.socket.remoteAddress

  return forwardedFor || realIp || remoteAddress || 'unknown'
}
