// ============================================================
//  FAÍSCA — codificador de MP3 (roda fora da tela principal)
//  Recebe pedaços de som cru (Float32) e devolve um MP3 pronto.
//  Fica num worker pra não travar o app enquanto grava/converte.
//  Motor: LAME (lamejs) — js/vendor/lamejs.iife.js
// ============================================================
/* global lamejs */
importScripts("./vendor/lamejs.iife.js");

const BLOCO = 1152; // tamanho de quadro que o LAME espera
let enc = null;
let canais = 1;
let partes = [];
let sobraL = null;
let sobraR = null;

// Float32 (-1..1) -> Int16, que é o que o LAME come
function paraInt16(f) {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = f[i] < -1 ? -1 : f[i] > 1 ? 1 : f[i];
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function juntar(sobra, novo) {
  if (!sobra || !sobra.length) return novo;
  const out = new Int16Array(sobra.length + novo.length);
  out.set(sobra, 0);
  out.set(novo, sobra.length);
  return out;
}

function moer(l, r) {
  sobraL = juntar(sobraL, l);
  if (canais === 2) sobraR = juntar(sobraR, r);
  let i = 0;
  while (sobraL.length - i >= BLOCO) {
    const buf = canais === 2
      ? enc.encodeBuffer(sobraL.subarray(i, i + BLOCO), sobraR.subarray(i, i + BLOCO))
      : enc.encodeBuffer(sobraL.subarray(i, i + BLOCO));
    if (buf.length) partes.push(new Int8Array(buf));
    i += BLOCO;
  }
  sobraL = sobraL.subarray(i);
  if (canais === 2) sobraR = sobraR.subarray(i);
}

self.onmessage = (e) => {
  const d = e.data || {};
  try {
    if (d.type === "init") {
      canais = d.canais === 2 ? 2 : 1;
      enc = new lamejs.Mp3Encoder(canais, d.taxa, d.kbps || 128);
      partes = [];
      sobraL = null;
      sobraR = null;
      return;
    }
    if (!enc) return;
    if (d.type === "pcm") {
      moer(paraInt16(d.l), d.r ? paraInt16(d.r) : null);
      return;
    }
    if (d.type === "fim") {
      if (sobraL && sobraL.length) {
        const buf = canais === 2
          ? enc.encodeBuffer(sobraL, sobraR)
          : enc.encodeBuffer(sobraL);
        if (buf.length) partes.push(new Int8Array(buf));
      }
      const rabo = enc.flush();
      if (rabo.length) partes.push(new Int8Array(rabo));
      const pronto = partes;
      partes = [];
      enc = null;
      self.postMessage({ type: "mp3", partes: pronto }, pronto.map((p) => p.buffer));
    }
  } catch (err) {
    self.postMessage({ type: "erro", msg: String((err && err.message) || err) });
  }
};
