let preferredVoice: SpeechSynthesisVoice | null = null;
let muted = false;

function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function initVoices(): void {
  if (!canSpeak()) return;

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    preferredVoice =
      voices.find((voice) => voice.lang === 'en-US' && /natural|google|microsoft|samantha/i.test(voice.name)) ||
      voices.find((voice) => voice.lang === 'en-GB' && /natural|google|microsoft|daniel/i.test(voice.name)) ||
      voices.find((voice) => voice.lang.startsWith('en')) ||
      voices[0] ||
      null;
  };

  window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
  pickVoice();
  setTimeout(pickVoice, 300);
}

export function speak(word: string, onEnd?: () => void): void {
  if (muted || !canSpeak()) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
  utterance.voice = preferredVoice;
  utterance.lang = preferredVoice?.lang || 'en-US';
  utterance.rate = 0.88;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function toggleMute(): boolean {
  muted = !muted;
  if (muted) stopSpeaking();
  return muted;
}

export function isMuted(): boolean {
  return muted;
}
