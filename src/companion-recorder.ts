export const MAX_RECORDING_MS = 25_000;
export const MAX_RECORDING_BYTES = 650_000;
export function recordingMime(recorder: Pick<typeof MediaRecorder, 'isTypeSupported'>) {
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(mime => recorder.isTypeSupported(mime));
}
export function microphoneMessage(error: unknown) {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return '麥克風還沒開啟。請家長在瀏覽器的網站設定允許麥克風，再按一次。';
  if (name === 'NotFoundError') return '找不到麥克風，請家長檢查裝置。也可以用圖卡聊天。';
  if (name === 'NotReadableError') return '麥克風正在忙，請關閉其他收音程式後再試。';
  return '這次沒有收到聲音，請再試一次。也可以用圖卡聊天。';
}
// Testable ownership: cancel works even when permission is still pending.
export class CompanionRecorder {
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private canceled = false;
  private timer?: ReturnType<typeof setTimeout>;
  private chunks: Blob[] = [];
  private total = 0;
  private settled = false;
  constructor(private onReady: () => void, private onAudio: (audio: Blob) => void, private onError: (error: string) => void) {}
  async start() {
    try {
      if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
      let stream: MediaStream;
      try { stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}); }
      catch(error) {
        if (this.canceled) return;
        if (!error || typeof error !== 'object' || !('name' in error) || error.name !== 'OverconstrainedError') throw error;
        // Some Safari/input devices reject processing constraints; a plain audio
        // request keeps the permission boundary while allowing their native format.
        stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      }
      this.stream=stream;
      if (this.canceled) { this.release();return; }
      const mimeType=recordingMime(MediaRecorder);
      if (!mimeType) throw new Error('unsupported');
      const recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:64000}); this.recorder=recorder;
      recorder.ondataavailable=e=>{
        if(this.canceled || !e.data.size)return;
        this.total+=e.data.size;
        if(this.total>MAX_RECORDING_BYTES) {this.fail('這句太長了，請分成短句再說。');return;}
        this.chunks.push(e.data);
      };
      recorder.onerror=()=>this.fail('收音中斷了，請再說一次。');
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(!this.settled&&!this.canceled&&recorder.state==='recording')this.fail('麥克風中斷了，請再按一次說話。');}));
      recorder.onstop=()=>{
        clearTimeout(this.timer);this.release();
        if(this.canceled||this.settled)return;
        this.settled=true;
        const audio=new Blob(this.chunks,{type:recorder.mimeType});this.chunks=[];
        if(audio.size<100)this.onError('沒有聽到聲音，再說一次好嗎？');else this.onAudio(audio);
      };
      recorder.start(250);this.onReady();
      this.timer=setTimeout(()=>this.stop(),MAX_RECORDING_MS);
    } catch(error) {
      if(this.canceled)return;
      this.fail(error instanceof Error&&error.message==='unsupported'?'請用 Safari 或 Chrome 開啟網站，才能和我說話。圖卡仍可以使用。':microphoneMessage(error));
    }
  }
  stop() {
    clearTimeout(this.timer);
    if(this.recorder?.state==='recording') { this.recorder.stop();this.release(); }
    else this.cancel();
  }
  cancel() {
    this.canceled=true;clearTimeout(this.timer);
    if(this.recorder?.state==='recording')this.recorder.stop();
    this.release();this.chunks=[];
  }
  private release() {this.stream?.getTracks().forEach(track=>track.stop());this.stream=undefined;}
  private fail(message:string) {if(this.settled||this.canceled)return;this.settled=true;this.cancel();this.onError(message);}
}
export async function encodeRecording(blob: Blob) {
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
