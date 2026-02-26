/**
 * Singleton AudioContext manager with iOS Safari suspend/resume handling.
 * All audio processing flows through this shared context.
 */

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (ctx && ctx.state !== "closed") {
    return ctx;
  }
  ctx = new AudioContext({ sampleRate: 44100 });
  return ctx;
}

/**
 * Resume audio context after a user gesture (required for iOS Safari).
 * Call this from a click/touch handler before starting audio capture.
 */
export async function resumeAudioContext(): Promise<void> {
  const audioCtx = getAudioContext();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
}

/**
 * Close and release the audio context.
 */
export async function closeAudioContext(): Promise<void> {
  if (ctx && ctx.state !== "closed") {
    await ctx.close();
    ctx = null;
  }
}

/**
 * Request microphone access and return a MediaStream.
 */
export async function getMicrophoneStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
}

/**
 * Create a MediaStreamAudioSourceNode from a microphone stream.
 */
export function createMicSource(stream: MediaStream): MediaStreamAudioSourceNode {
  const audioCtx = getAudioContext();
  return audioCtx.createMediaStreamSource(stream);
}
