/** Fire-and-forget VM release for a conversation (server destroys smolVM immediately). */
export function releaseConversationVm(url: string | undefined, convId: string | undefined): void {
  if (!url || !convId) return
  void window.api.releaseConversationVm({ url, conv_id: convId })
}
