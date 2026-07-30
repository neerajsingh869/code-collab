// The harness installed inside the worker ahead of any user code. Its job is
// to decide when the program is genuinely finished, which is not the same
// thing as "the last statement ran" — a pending timer or an in-flight request
// still has output to produce.
//
// Only macrotasks are counted. Microtasks deliberately are not: they always
// drain before the next macrotask runs, so deferring the completion check by
// one macrotask lets an entire promise chain settle — and schedule further
// work — before we conclude there is nothing left to wait for.
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

  // Always one macrotask late, so callbacks queued by whatever just finished
  // get their turn — and their chance to schedule more — before we decide.
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

  // An interval has no natural end, so it stays outstanding until cleared:
  // code that leaves one running has not finished, it is still running.
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

  // Throws from inside an async callback surface here rather than at the
  // try/catch wrapped around the synchronous body.
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
  // still runs when the body threw: timers scheduled before the throw are
  // real and their output is worth waiting for
  __runtime.markSyncFinished()
}
`;
