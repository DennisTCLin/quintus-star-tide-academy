// Call synchronously in a tap handler, before network work. iOS may report
// "interrupted" as well as the standard suspended state after a system event.
export function prepareCompanionAudio(existing?: AudioContext) {
  const context = !existing || existing.state === 'closed' ? new AudioContext() : existing;
  const ready = context.state === 'running' ? Promise.resolve(true) : context.resume().then(() => context.state === 'running', () => false);
  return {context,ready};
}
