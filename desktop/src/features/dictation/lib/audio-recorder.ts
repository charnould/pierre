const RATE = 16_000
const SHORTEST = 0.3

export type DictationRecording = {
  stop: () => Promise<Uint8Array | null>
  cancel: () => void
  level: () => number
}

function deviceConstraint(deviceId: string): MediaTrackConstraints | boolean {
  if (!deviceId || deviceId === 'default') return true
  return { deviceId: { exact: deviceId } }
}

function floatToPcm16(samples: Float32Array): Uint8Array {
  const pcm = new Uint8Array(samples.length * 2)
  const view = new DataView(pcm.buffer)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return pcm
}

async function toPcm16(blob: Blob): Promise<Uint8Array | null> {
  const decodeContext = new AudioContext()
  try {
    const decoded = await decodeContext.decodeAudioData(await blob.arrayBuffer())
    if (decoded.duration < SHORTEST) return null
    const length = Math.ceil(decoded.duration * RATE)
    const offline = new OfflineAudioContext(1, length, RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return floatToPcm16(rendered.getChannelData(0))
  } finally {
    await decodeContext.close()
  }
}

export async function startDictationRecording(deviceId: string): Promise<DictationRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: deviceConstraint(deviceId) })
  const context = new AudioContext()
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  const source = context.createMediaStreamSource(stream)
  source.connect(analyser)
  const samples = new Float32Array(analyser.fftSize)
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream)
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  })
  recorder.start()
  let settled = false
  const release = () => {
    for (const track of stream.getTracks()) track.stop()
    void context.close()
  }
  return {
    level: () => {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) sum += sample * sample
      const rms = Math.sqrt(sum / samples.length)
      return Math.min(1, Math.sqrt(Math.max(0, rms - 0.008) / 0.08))
    },
    cancel: () => {
      if (settled) return
      settled = true
      if (recorder.state !== 'inactive') recorder.stop()
      release()
    },
    stop: () =>
      new Promise((resolve, reject) => {
        if (settled) {
          resolve(null)
          return
        }
        settled = true
        recorder.addEventListener('stop', () => {
          release()
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          void toPcm16(blob).then(resolve, reject)
        })
        recorder.stop()
      })
  }
}
