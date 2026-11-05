import type { AttackStyle } from './conquest-choreography';

export class ConquestAudio {
  private context: AudioContext | null = null;
  private volume: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicBuffer: Promise<AudioBuffer> | null = null;
  private musicWanted = false;
  private muted = false;
  private musicOffset = 0;
  private musicStarted = 0;
  private musicFade: ReturnType<typeof setTimeout> | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (!this.volume) { this.volume = this.context.createGain(); this.volume.gain.value = .13; this.volume.connect(this.context.destination); }
      void this.context.resume().catch(() => {});
    } catch { /* The visual timeline remains available when audio is unsupported. */ }
  }
  mute(muted: boolean) {
    this.muted = muted;
    if (this.context && this.volume) this.volume.gain.setTargetAtTime(muted ? 0 : .13, this.context.currentTime, .02);
    if (this.context && this.musicGain) { this.musicGain.gain.cancelScheduledValues(this.context.currentTime); this.musicGain.gain.setTargetAtTime(muted || !this.musicWanted ? 0 : .22, this.context.currentTime, .04); }
    if (muted) this.stopVoices();
  }
  setMusic(wanted: boolean) {
    this.musicWanted = wanted;
    const context = this.context;
    if (!wanted) { this.fadeMusic(.65); return; }
    if (!context) return;
    if (this.musicFade !== null) { clearTimeout(this.musicFade); this.musicFade = null; }
    if (this.music && this.musicGain) { this.musicGain.gain.cancelScheduledValues(context.currentTime); this.musicGain.gain.setTargetAtTime(this.muted ? 0 : .22, context.currentTime, .15); return; }
    this.musicBuffer ??= fetch('/assets/conquest/audio/onaldin-battle.mp3').then(response => { if (!response.ok) throw Error('Battle music unavailable'); return response.arrayBuffer(); }).then(data => context.decodeAudioData(data));
    void this.musicBuffer.then(buffer => {
      // Late downloads must not restart music after skip, close or a hidden tab.
      if (!this.musicWanted || this.context !== context || this.music) return;
      const source = context.createBufferSource(), gain = context.createGain(); source.buffer = buffer; source.loop = true;
      gain.gain.value = 0; source.connect(gain); gain.connect(context.destination);
      this.music = source; this.musicGain = gain; this.musicStarted = context.currentTime;
      source.start(0, this.musicOffset % buffer.duration); gain.gain.setTargetAtTime(this.muted ? 0 : .22, context.currentTime, .2);
    }).catch(() => { /* Missing or unsupported music never blocks the battle. */ });
  }
  private fadeMusic(seconds: number) {
    if (this.musicFade !== null) { clearTimeout(this.musicFade); this.musicFade = null; }
    const source = this.music, gain = this.musicGain, context = this.context;
    if (!source || !gain || !context) return;
    const stop = () => {
      if (this.music !== source) return;
      this.musicOffset = (this.musicOffset + Math.max(0, context.currentTime - this.musicStarted)) % (source.buffer?.duration ?? 1);
      try { source.stop(); } catch { /* Already stopped. */ }
      source.disconnect(); gain.disconnect(); this.music = null; this.musicGain = null; this.musicFade = null;
    };
    if (!seconds) { stop(); return; }
    gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setTargetAtTime(0, context.currentTime, seconds / 5);
    this.musicFade = setTimeout(stop, seconds * 1000);
  }
  stop() { this.musicWanted = false; this.fadeMusic(0); this.stopVoices(); }
  private stopVoices() { this.voices.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } }); this.voices.clear(); }
  impact(style: AttackStyle, finale: boolean) {
    const context = this.context; if (!context || !this.volume || context.state !== 'running') return;
    const now = context.currentTime, duration = finale ? .45 : .23, envelope = context.createGain();
    envelope.gain.setValueAtTime(.001, now); envelope.gain.exponentialRampToValueAtTime(.7, now + .008); envelope.gain.exponentialRampToValueAtTime(.001, now + duration); envelope.connect(this.volume);
    const oscillator = context.createOscillator(); oscillator.type = style === 'stone' || style === 'rush' ? 'triangle' : 'sine'; oscillator.frequency.setValueAtTime(finale ? 180 : style === 'star' ? 740 : 320, now); oscillator.frequency.exponentialRampToValueAtTime(55, now + duration); oscillator.connect(envelope);
    const noise = context.createBufferSource(), buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate), values = buffer.getChannelData(0);
    for (let i = 0; i < values.length; i++) values[i] = (Math.random() * 2 - 1) * .22;
    noise.buffer = buffer; const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = style === 'stone' ? 700 : 2200; noise.connect(filter); filter.connect(envelope);
    for (const source of [oscillator, noise]) { this.voices.add(source); source.onended = () => { this.voices.delete(source); source.disconnect(); }; source.start(now); source.stop(now + duration); }
    noise.addEventListener('ended', () => { filter.disconnect(); envelope.disconnect(); }, { once: true });
  }
  victory() {
    const context = this.context; if (!context || !this.volume || context.state !== 'running') return;
    for (const [index, frequency] of [392, 493.88, 587.33, 783.99].entries()) {
      const start = context.currentTime + index * .14, envelope = context.createGain(), tone = context.createOscillator();
      tone.type = 'triangle'; tone.frequency.value = frequency; envelope.gain.setValueAtTime(.001, start); envelope.gain.exponentialRampToValueAtTime(.22, start + .035); envelope.gain.exponentialRampToValueAtTime(.001, start + .65); tone.connect(envelope); envelope.connect(this.volume);
      this.voices.add(tone); tone.onended = () => { this.voices.delete(tone); tone.disconnect(); envelope.disconnect(); }; tone.start(start); tone.stop(start + .7);
    }
  }
  close() { this.stop(); const context = this.context; this.context = null; this.volume = null; this.musicBuffer = null; this.musicOffset = 0; if (context) void context.close().catch(() => {}); }
}
