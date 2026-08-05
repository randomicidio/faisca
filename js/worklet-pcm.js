// ============================================================
//  FAÍSCA — escuta o som cru do microfone na thread de áudio
//  Junta os pedacinhos (128 amostras) e manda de 4096 em 4096
//  pro codificador de MP3. Na thread de áudio não engasga nem
//  perde pedaço quando a tela está ocupada desenhando.
// ============================================================
const TAMANHO = 4096;

class TapPCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(TAMANHO);
    this.n = 0;
    this.ligado = true;
    this.port.onmessage = (e) => {
      if (e.data === "fim") {
        this.despejar();
        this.ligado = false;
      }
    };
  }

  despejar() {
    if (!this.n) return;
    this.port.postMessage(this.buf.slice(0, this.n));
    this.n = 0;
  }

  process(inputs) {
    if (!this.ligado) return false;
    const canal = inputs[0] && inputs[0][0];
    if (canal) {
      for (let i = 0; i < canal.length; i++) {
        this.buf[this.n++] = canal[i];
        if (this.n === TAMANHO) this.despejar();
      }
    }
    return true;
  }
}

registerProcessor("tap-pcm", TapPCM);
