// ============================================================
//  FAÍSCA — Store (dados + salvamento local + mesclagem)
// ============================================================
(function () {
  const LS_KEY = "faisca:data:v1";

  // ---- Etapas do fluxo ----
  const STAGES = [
    { key: "ideia",    label: "Ideia",    hint: "Rascunho e roteiro" },
    { key: "gravacao", label: "Gravação", hint: "Na câmera" },
    { key: "edicao",   label: "Edição",   hint: "Montando" },
    { key: "postado",  label: "Postado",  hint: "No ar 🎉" },
  ];
  const STAGE_PROGRESS = { ideia: 15, gravacao: 50, edicao: 80, postado: 100 };

  const PLATFORMS = [
    { key: "tiktok",    label: "TikTok" },
    { key: "reels",     label: "Reels" },
    { key: "shorts",    label: "Shorts" },
    { key: "youtube",   label: "YouTube" },
    { key: "instagram", label: "Instagram" },
    { key: "kwai",      label: "Kwai" },
  ];

  // Faíscas do dia — temas pensados pra conteúdo de MÚSICA
  const SPARKS = [
    "Faça um cover de uma música que te marcou — e conte por quê.",
    "Uma curiosidade sobre uma banda que quase ninguém sabe.",
    "Explique um conceito de teoria musical em 30 segundos.",
    "Mostre a mesma música em 3 estilos diferentes.",
    "A história por trás daquele riff/solo famoso.",
    "Reaja à primeira vez ouvindo um clássico do seu jeito.",
    "Ensine um acorde ou progressão que todo mundo consegue tocar.",
    "Por que essa música é tão viciante? (o truque escondido)",
    "Compare o original com um cover famoso — qual é melhor?",
    "Cante um trecho e desafie: adivinha a música?",
    "3 músicas com a mesma progressão de acordes.",
    "A teoria por trás de um refrão que gruda na cabeça.",
    "Curiosidade sobre um instrumento que você toca.",
    "Recomende 5 músicas do seu gênero pra quem tá começando.",
    "Toque/cante uma música pedida nos comentários.",
    "O que faz uma voz soar 'profissional'? Mostre na prática.",
    "Desça a régua num mito musical que todo mundo repete.",
    "A evolução de uma banda: primeiro álbum vs. auge.",
    "Ensine a ouvir uma música 'por dentro' (baixo, harmonia, levada).",
    "Transforme uma música triste em algo alegre (ou o contrário).",
    "Bastidores: como você ensaia/grava um cover.",
    "Um artista subestimado que merece mais ouvintes.",
    "O segredo daquela modulação que arrepia.",
    "Cante a mesma frase em 3 emoções diferentes.",
    "Explique um termo musical que confunde todo mundo.",
    "Sua evolução cantando/tocando ao longo do tempo.",
    "Reharmonize uma música conhecida e mostre a diferença.",
    "Qual detalhe de produção você só percebe de fone?",
  ];

  let state = { ideas: [], tombstones: [], updatedAt: 0, settings: { theme: "system" } };
  const listeners = new Set();

  function now() { return Date.now(); }
  function uid() { return "id_" + Math.random().toString(36).slice(2, 10) + now().toString(36); }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) state = normalize(JSON.parse(raw));
    } catch (e) { console.warn("Falha ao ler dados locais", e); }
    return state;
  }

  function normalize(s) {
    s = s || {};
    return {
      ideas: Array.isArray(s.ideas) ? s.ideas.map(normalizeIdea) : [],
      tombstones: Array.isArray(s.tombstones) ? s.tombstones : [],
      updatedAt: s.updatedAt || 0,
      settings: Object.assign({ theme: "system" }, s.settings || {}),
    };
  }

  function normalizeIdea(i) {
    i = i || {};
    // migra modelo antigo (hook/notes/script separados) para um campo só
    let script = i.script;
    if (script == null) script = [i.hook, i.notes].filter(Boolean).join("\n\n");
    // migra etapas antigas
    let stage = i.stage;
    if (stage === "roteiro") stage = "ideia";
    if (stage === "pronto") stage = "edicao";
    if (STAGE_PROGRESS[stage] == null) stage = "ideia";
    return {
      id: i.id || uid(),
      title: i.title || "",
      stage: stage,
      script: script || "",
      platforms: Array.isArray(i.platforms) ? i.platforms : [],
      media: Array.isArray(i.media) ? i.media.map(normMedia) : [],
      driveFolderId: i.driveFolderId || null,
      order: i.order != null ? i.order : -(i.created || now()), // menor = mais no topo
      created: i.created || now(),
      updated: i.updated || now(),
    };
  }

  function normMedia(m) {
    m = m || {};
    return {
      id: m.id || uid(),
      kind: m.kind || "audio",
      mime: m.mime || "",
      name: m.name || "",
      size: m.size || 0,
      order: m.order != null ? m.order : 0,
      driveFileId: m.driveFileId || null,
    };
  }

  function save(touch = true) {
    if (touch) state.updatedAt = now();
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { console.warn(e); }
    emit();
  }

  function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) {} }); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  // ---- CRUD ----
  function addIdea(partial) {
    const idea = normalizeIdea(Object.assign({ created: now(), updated: now(), order: -now() }, partial || {}));
    state.ideas.unshift(idea);
    save();
    return idea;
  }

  // reordena as ideias na sequência dada (dentro de uma etapa)
  function reorderIdeas(orderedIds) {
    orderedIds.forEach((id, k) => { const i = getIdea(id); if (i) { i.order = k; i.updated = now(); } });
    save();
  }

  // move uma ideia para outra etapa, no fim dela
  function moveIdeaToStageEnd(id, stage) {
    const i = getIdea(id); if (!i) return;
    const maxOrder = state.ideas.filter((x) => x.stage === stage && x.id !== id).reduce((m, x) => Math.max(m, x.order || 0), 0);
    i.stage = stage; i.order = maxOrder + 1; i.updated = now();
    save();
  }
  function getIdea(id) { return state.ideas.find((i) => i.id === id); }
  function updateIdea(id, patch) {
    const i = getIdea(id);
    if (!i) return;
    Object.assign(i, patch);
    i.updated = now();
    save();
    return i;
  }
  function deleteIdea(id) {
    const idx = state.ideas.findIndex((i) => i.id === id);
    if (idx < 0) return;
    state.ideas.splice(idx, 1);
    const t = state.tombstones.find((x) => x.id === id);
    if (t) t.deleted = now(); else state.tombstones.push({ id, deleted: now() });
    save();
  }
  function setTheme(theme) { state.settings.theme = theme; save(false); }

  // ---- Mesclagem (sincronização Drive) ----
  function mergeRemote(remote) {
    remote = normalize(remote || {});
    const byId = new Map();
    for (const i of state.ideas) byId.set(i.id, i);
    for (const r of remote.ideas) {
      const local = byId.get(r.id);
      if (!local || (r.updated || 0) > (local.updated || 0)) byId.set(r.id, r);
    }
    const tomb = new Map();
    for (const t of state.tombstones) tomb.set(t.id, t.deleted || 0);
    for (const t of remote.tombstones) tomb.set(t.id, Math.max(tomb.get(t.id) || 0, t.deleted || 0));
    for (const [id, delTs] of tomb) {
      const item = byId.get(id);
      if (item && delTs > (item.updated || 0)) byId.delete(id);
    }
    state.ideas = Array.from(byId.values()).sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(normalizeIdea);
    state.tombstones = Array.from(tomb, ([id, deleted]) => ({ id, deleted }));
    state.updatedAt = Math.max(state.updatedAt || 0, remote.updatedAt || 0, now());
    state.settings = Object.assign({}, remote.settings || {}, state.settings || {});
    save(false);
  }

  function exportObject() { return { app: "faisca", version: 1, exportedAt: now(), data: state }; }
  function importObject(obj) {
    if (!obj) throw new Error("Arquivo vazio.");
    mergeRemote(obj.data || obj);
  }

  window.Store = {
    STAGES, STAGE_PROGRESS, PLATFORMS, SPARKS,
    load, save, subscribe, get: () => state,
    addIdea, getIdea, updateIdea, deleteIdea, setTheme, reorderIdeas, moveIdeaToStageEnd,
    mergeRemote, exportObject, importObject,
    uid, now,
    progressOf: (i) => (i.stage === "postado" ? 100 : STAGE_PROGRESS[i.stage] || 0),
    randomSpark: () => SPARKS[Math.floor(Math.random() * SPARKS.length)],
  };
})();
