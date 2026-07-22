/**
 * blobToWav — decode a recorded audio Blob (webm/opus, mp4, ogg…) into a
 * 16-bit mono PCM WAV Blob using the Web Audio API. This lets the backend
 * (Parselmouth) read the audio natively without any server-side ffmpeg,
 * keeping the pipeline identical across Preview and Production.
 */
function encodeWav(audioBuffer, trimStartMs = 0) {
  const numCh = 1; // mono (mix down)
  const sampleRate = audioBuffer.sampleRate;
  // Drop the first ~trimStartMs (cold-mic warm-up segment) at PCM level — safe,
  // unlike dropping webm chunks (which would corrupt the header/decoding).
  const trimSamples = Math.min(audioBuffer.length, Math.floor((trimStartMs / 1000) * sampleRate));
  const length = audioBuffer.length - trimSamples;

  // Mix all channels to mono.
  const mono = new Float32Array(length);
  const chCount = audioBuffer.numberOfChannels;
  for (let c = 0; c < chCount; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i + trimSamples] / chCount;
  }

  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);         // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    let s = Math.max(-1, Math.min(1, mono[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
    offset += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}

export async function blobToWav(blob, trimStartMs = 0) {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return encodeWav(audioBuffer, trimStartMs);
  } finally {
    try { await ctx.close(); } catch (_) { /* ignore */ }
  }
}

export default blobToWav;
