// ============================================================
//  FAÍSCA — MP3
//  Áudio gravado aqui vira MP3, não WebM. MP3 toca em qualquer
//  lugar (editor de vídeo, celular, WhatsApp, e-mail) — WebM não.
//
//  Dois caminhos:
//   1) gravadorAoVivo(): codifica ENQUANTO você grava, então ao
//      parar o MP3 já está pronto — sem espera, mesmo em áudio longo.
//   2) converter(): pega um áudio já existente (WebM/M4A/WAV/OGG)
//      e transforma em MP3 — usado na hora de baixar as gravações
//      antigas e os arquivos que você enviou.
// ============================================================
(function () {
  const KBPS = 128;
  // taxas que o formato MP3 aceita; fora disso não dá pra codificar
  const TAXAS_OK = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
  const AC = window.AudioContext || window.webkitAudioContext;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  const suportado = () => !!(window.Worker && AC);
  const ehMp3 = (mime) => /mpeg|mp3/i.test(mime || "");

  // ---- ponte com o worker que codifica ----
  function abrirCodificador(taxa, canais) {
    const w = new Worker("./js/worker-mp3.js");
    let ok, falhou;
    const pronto = new Promise((res, rej) => { ok = res; falhou = rej; });
    pronto.catch(() => {}); // ninguém precisa ouvir se der errado antes da hora
    let vivo = true;
    const fechar = () => { if (vivo) { vivo = false; w.terminate(); } };
    w.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === "mp3") { ok(new Blob(d.partes, { type: "audio/mpeg" })); fechar(); }
      else if (d.type === "erro") { falhou(new Error(d.msg)); fechar(); }
    };
    w.onerror = (e) => { falhou(new Error((e && e.message) || "worker mp3")); fechar(); };
    w.postMessage({ type: "init", taxa, canais, kbps: KBPS });
    return {
      empurrar(l, r) {
        if (!vivo) return;
        const mover = r ? [l.buffer, r.buffer] : [l.buffer];
        w.postMessage({ type: "pcm", l, r: r || null }, mover);
      },
      fechar(msLimite) {
        if (!vivo) return Promise.reject(new Error("codificador fechado"));
        w.postMessage({ type: "fim" });
        // se o codificador travar, não deixa a gravação presa pra sempre
        return Promise.race([
          pronto,
          new Promise((_, rej) => setTimeout(() => { fechar(); rej(new Error("demorou demais")); }, msLimite || 30000)),
        ]);
      },
      cancelar() { falhou(new Error("cancelado")); fechar(); },
    };
  }

  // ---- 1) gravar já em MP3, em tempo real ----
  // Recebe o mesmo stream do microfone que o MediaRecorder está usando.
  // Devolve null se este aparelho não der conta (aí o app fica no formato original).
  async function gravadorAoVivo(stream) {
    if (!suportado()) return null;
    let ctx;
    try { ctx = new AC({ sampleRate: 48000 }); }
    catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
    if (TAXAS_OK.indexOf(ctx.sampleRate) < 0) { ctx.close().catch(() => {}); return null; }
    try { await ctx.resume(); } catch (e) {}

    const taxa = ctx.sampleRate;
    const cod = abrirCodificador(taxa, 1);
    let amostras = 0;
    const fonte = ctx.createMediaStreamSource(stream);
    const mudo = ctx.createGain();
    mudo.gain.value = 0; // o som precisa "chegar na saída" pra fluir, mas sem sair no alto-falante
    let no = null;
    let desligarTap = () => {};

    const receber = (pcm) => { amostras += pcm.length; cod.empurrar(pcm); };

    try {
      await ctx.audioWorklet.addModule("./js/worklet-pcm.js");
      no = new AudioWorkletNode(ctx, "tap-pcm", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      no.port.onmessage = (e) => receber(e.data);
      desligarTap = () => { try { no.port.postMessage("fim"); } catch (e) {} };
    } catch (e) {
      // navegador sem AudioWorklet: jeito antigo, ainda funciona em todos
      try {
        no = ctx.createScriptProcessor(4096, 1, 1);
        no.onaudioprocess = (ev) => receber(new Float32Array(ev.inputBuffer.getChannelData(0)));
        desligarTap = () => { no.onaudioprocess = null; };
      } catch (e2) {
        cod.cancelar(); ctx.close().catch(() => {}); return null;
      }
    }

    fonte.connect(no);
    no.connect(mudo);
    mudo.connect(ctx.destination);

    let encerrado = false;
    const desmontar = () => {
      if (encerrado) return;
      encerrado = true;
      desligarTap();
      try { fonte.disconnect(); no.disconnect(); mudo.disconnect(); } catch (e) {}
    };

    return {
      get segundos() { return amostras / taxa; },
      // devolve o Blob mp3 (ou null se algo falhou pelo caminho)
      async parar() {
        desmontar();
        await new Promise((r) => setTimeout(r, 60)); // deixa o último pedacinho chegar
        try {
          const blob = await cod.fechar();
          return blob && blob.size ? blob : null;
        } catch (e) { return null; }
        finally { ctx.close().catch(() => {}); }
      },
      cancelar() { desmontar(); cod.cancelar(); ctx.close().catch(() => {}); },
    };
  }

  // ---- 2) converter um áudio que já existe ----
  function decodificar(arrayBuffer) {
    // decodeAudioData reamostra pra taxa do contexto — 44.1 kHz serve pro MP3
    const ctx = OAC ? new OAC(1, 1, 44100) : new AC();
    return new Promise((res, rej) => {
      let p;
      try { p = ctx.decodeAudioData(arrayBuffer, res, rej); }
      catch (e) { rej(e); return; }
      if (p && p.then) p.then(res, rej); // Safari antigo só tem a versão com callback
    });
  }

  async function converter(blob, aoAndar) {
    if (!suportado()) return null;
    let audio;
    try { audio = await decodificar(await blob.arrayBuffer()); }
    catch (e) { return null; }
    const canais = audio.numberOfChannels >= 2 ? 2 : 1;
    const taxa = TAXAS_OK.indexOf(audio.sampleRate) >= 0 ? audio.sampleRate : 44100;
    const cod = abrirCodificador(taxa, canais);
    const esq = audio.getChannelData(0);
    const dir = canais === 2 ? audio.getChannelData(1) : null;
    const passo = taxa; // manda de 1 segundo em 1 segundo
    try {
      for (let i = 0; i < esq.length; i += passo) {
        cod.empurrar(
          new Float32Array(esq.subarray(i, i + passo)),
          dir ? new Float32Array(dir.subarray(i, i + passo)) : null
        );
        if (aoAndar) aoAndar(Math.min(1, (i + passo) / esq.length));
        await new Promise((r) => setTimeout(r, 0)); // dá espaço pro app respirar
      }
      const mp3 = await cod.fechar(120000);
      return mp3 && mp3.size ? mp3 : null;
    } catch (e) {
      cod.cancelar();
      return null;
    }
  }

  window.Mp3 = { suportado, ehMp3, gravadorAoVivo, converter };
})();
