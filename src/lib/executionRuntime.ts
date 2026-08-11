// Runs inside the worker ahead of user code. Counts outstanding macrotasks, so
// a run ends when nothing is left to run, even if the last statement returned
// long ago.
// Microtasks aren't counted: they drain before the next macrotask, so putting
// the check on a macrotask lets a whole promise chain settle first.
const RUNTIME_SOURCE = `
const __runtime = (() => {
  const nativeSetTimeout = self.setTimeout.bind(self)
  const nativeClearTimeout = self.clearTimeout.bind(self)
  const nativeSetInterval = self.setInterval.bind(self)
  const nativeClearInterval = self.clearInterval.bind(self)

  let outstanding = 0
  let syncFinished = false
  let announced = false

  const serialize = (value) => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    if (value instanceof Error) return value.name + ': ' + value.message
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value)
      }
    }
    return String(value)
  }

  const send = (type, text) => self.postMessage({ type, text })

  const emit = (type, args) =>
    send(type, Array.from(args).map(serialize).join(' '))

  const announceDone = () => {
    if (announced || !syncFinished || outstanding > 0) return
    announced = true
    self.postMessage({ type: 'done' })
  }

  // one macrotask late, so queued callbacks still get to schedule more work
  const checkDone = () => nativeSetTimeout(announceDone, 0)

  const acquire = () => {
    outstanding += 1
  }

  const release = () => {
    outstanding -= 1
    checkDone()
  }

  const liveTimeouts = new Set()
  const liveIntervals = new Set()

  self.setTimeout = (handler, delay, ...args) => {
    if (typeof handler !== 'function') return nativeSetTimeout(handler, delay)
    acquire()
    const id = nativeSetTimeout(() => {
      liveTimeouts.delete(id)
      try {
        handler(...args)
      } finally {
        release()
      }
    }, delay)
    liveTimeouts.add(id)
    return id
  }

  self.clearTimeout = (id) => {
    if (liveTimeouts.delete(id)) release()
    nativeClearTimeout(id)
  }

  // no natural end, so it stays outstanding until cleared
  self.setInterval = (handler, delay, ...args) => {
    if (typeof handler !== 'function') return nativeSetInterval(handler, delay)
    acquire()
    const id = nativeSetInterval(() => handler(...args), delay)
    liveIntervals.add(id)
    return id
  }

  self.clearInterval = (id) => {
    if (liveIntervals.delete(id)) release()
    nativeClearInterval(id)
  }

  if (typeof self.fetch === 'function') {
    const nativeFetch = self.fetch.bind(self)
    self.fetch = (...args) => {
      acquire()
      return nativeFetch(...args).finally(release)
    }
  }

  console.log = function () {
    emit('log', arguments)
  }
  console.info = console.log
  console.debug = console.log
  console.warn = console.log
  console.error = function () {
    emit('error', arguments)
  }

  // async throws land here, not in the try/catch around the sync body
  self.onerror = (message) => {
    send('error', String(message))
    checkDone()
  }

  self.onunhandledrejection = (event) => {
    send('error', 'Unhandled rejection: ' + serialize(event.reason))
    checkDone()
  }

  return {
    reportError: (error) => send('error', serialize(error)),
    markSyncFinished: () => {
      syncFinished = true
      checkDone()
    },
  }
})()
`;

export const buildWorkerSource = (code: string) => `${RUNTIME_SOURCE}
try {
${code}
} catch (error) {
  __runtime.reportError(error)
} finally {
  // runs even if the body threw: timers scheduled before it are still live
  __runtime.markSyncFinished()
}
`;
