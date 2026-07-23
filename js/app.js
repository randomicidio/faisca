// ============================================================
//  FAÍSCA — interface + interações + sincronização
// ============================================================
(function () {
  const S = window.Store;
  const D = window.Drive;
  const M = window.MediaStore;

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const fmtDur = (s) => { s = Math.floor(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");

  const I = {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>',
    cloud: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19h11.5Z"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9m0 0 4 4m-4-4-4 4M4 3h16"/></svg>',
    off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    cam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3z"/></svg>',
    clip: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5 12 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 16.5a1.5 1.5 0 0 1-2-2l7.5-7.5"/></svg>',
    image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>',
    upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0 4 4m-4-4-4 4M4 20h16"/></svg>',
    stop: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
    sort: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M6 12h12M9 18h6"/></svg>',
    grip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    google: '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-7.9Z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1-3.6 1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.9L6 14.3Z"/><path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.6 6-4.6Z"/></svg>',
  };

  // ---------- app state ----------
  let search = "";
  let openId = null;
  let boardFrozen = false;
  let dragId = null;
  let currentSpark = S.randomSpark();
  let drawerURLs = [];
  let rec = null;       // gravação em andamento
  let recTimer = null;

  // ---------- scaffold ----------
  const root = document.getElementById("app");
  root.innerHTML = `
    <header class="app-header">
      <div class="brand">
        <img class="brand__mark" src="./icons/icon-192.png" alt="">
        <div>
          <div class="brand__name">Faí<span>sca</span></div>
          <div class="brand__tag">seu estúdio de ideias</div>
        </div>
      </div>
      <div class="header-spacer"></div>
      <div class="header-actions">
        <button class="sync" id="sync" title="Sincronização"><span class="sync__dot"></span><span class="sync__label" id="syncLabel">Local</span></button>
        <button class="icon-btn" id="theme" title="Tema"></button>
        <button class="icon-btn" id="menu" title="Mais">${I.menu}</button>
      </div>
    </header>
    <main class="wrap">
      <section class="capture">
        <div class="spark-line">
          <span>💡</span>
          <span class="spark-text"><b>Faísca do dia:</b> <span id="sparkText"></span></span>
          <button class="spark-refresh" id="sparkNew">${I.refresh} outra</button>
        </div>
        <div class="capture__row">
          <input class="capture__input" id="capture" placeholder="Joga a ideia aqui e aperta Enter..." autocomplete="off">
          <button class="btn-add" id="addBtn">${I.plus} Adicionar</button>
        </div>
      </section>

      <div class="toolbar">
        <label class="toolbar-search">${I.search}<input id="search" type="search" placeholder="Buscar nas suas ideias..." autocomplete="off"></label>
        <button class="sort-btn" id="sortBtn" title="Ordenar">${I.sort}<span id="sortLabel">Manual</span></button>
      </div>

      <div id="boardHost"></div>
    </main>
    <div class="toasts" id="toasts"></div>
  `;
  $("#sparkText").textContent = currentSpark;

  // ---------- toasts ----------
  function toast(msg, warn) {
    const t = document.createElement("div");
    t.className = "toast" + (warn ? " warn" : "");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; setTimeout(() => t.remove(), 250); }, 2600);
  }

  // ---------- theme ----------
  function applyTheme() {
    const th = S.get().settings.theme;
    if (th === "light" || th === "dark") document.documentElement.setAttribute("data-theme", th);
    else document.documentElement.removeAttribute("data-theme");
    const dark = th === "dark" || (th === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    $("#theme").innerHTML = dark ? I.sun : I.moon;
  }
  $("#theme").addEventListener("click", () => {
    const cur = S.get().settings.theme;
    const dark = cur === "dark" || (cur === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    S.setTheme(dark ? "light" : "dark"); applyTheme();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  // ---------- capture ----------
  function doAdd() {
    const inp = $("#capture");
    const title = inp.value.trim();
    if (!title) { inp.focus(); return; }
    S.addIdea({ title });
    inp.value = ""; inp.focus();
    toast("Ideia capturada ✨");
  }
  $("#addBtn").addEventListener("click", doAdd);
  $("#capture").addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });
  $("#sparkNew").addEventListener("click", () => { currentSpark = S.randomSpark(); $("#sparkText").textContent = currentSpark; });
  $("#sparkText").addEventListener("click", () => { $("#capture").value = currentSpark; $("#capture").focus(); });

  // ---------- instalar no aparelho ----------
  // O navegador esconde a instalação no menu, e quase ninguém acha.
  // Guardamos o convite do navegador e oferecemos na hora certa.
  let convite = null;
  const LS_DISPENSOU = "faisca:instalar:dispensado";

  const jaEhApp = () =>
    matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    convite = e;
    mostrarFaixaInstalar();
  });
  window.addEventListener("appinstalled", () => {
    convite = null;
    localStorage.removeItem(LS_DISPENSOU);
    const f = $("#instalarFaixa"); if (f) f.remove();
    toast("Instalado! Agora é só abrir pelo ícone ✨");
  });

  function mostrarFaixaInstalar() {
    if (!convite || jaEhApp()) return;
    if (localStorage.getItem(LS_DISPENSOU) === "1") return;
    if ($("#instalarFaixa")) return;
    const f = document.createElement("div");
    f.className = "install-bar";
    f.id = "instalarFaixa";
    f.innerHTML = `
      <img src="./icons/icon-192.png" alt="">
      <div class="install-bar__txt">
        <b>Instale o Faísca no seu aparelho</b>
        <small>Abre direto pelo ícone, em tela cheia, e funciona sem internet.</small>
      </div>
      <button class="install-bar__no" data-i="nao">Agora não</button>
      <button class="install-bar__yes" data-i="sim">${I.down} Instalar</button>`;
    f.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-i]"); if (!b) return;
      if (b.dataset.i === "nao") { localStorage.setItem(LS_DISPENSOU, "1"); f.remove(); return; }
      f.remove();
      await instalarAgora();
    });
    const alvo = $(".toolbar");
    alvo.parentNode.insertBefore(f, alvo);
  }

  async function instalarAgora() {
    if (jaEhApp()) { toast("Você já está usando o app instalado"); return; }
    if (convite) {
      convite.prompt();
      try { await convite.userChoice; } catch (e) {}
      convite = null;
      return;
    }
    comoInstalarModal();
  }

  // Sem convite do navegador (iPhone, Firefox, ou já dispensado):
  // explicamos o caminho manual, que muda de navegador pra navegador.
  function comoInstalarModal() {
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const passos = iOS
      ? `<li>Toque no botão <b>Compartilhar</b> (o quadradinho com a seta pra cima), na barra do Safari.</li>
         <li>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</li>
         <li>Confirme em <b>Adicionar</b>.</li>`
      : `<li>Toque no menu do navegador (os <b>três pontinhos</b>, no canto).</li>
         <li>Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.</li>
         <li>Confirme em <b>Instalar</b>.</li>`;
    const host = document.createElement("div");
    host.className = "modal-center";
    host.innerHTML = `
      <div class="scrim open" style="position:absolute"></div>
      <div class="modal-card">
        <h3>Instalar o Faísca</h3>
        <p style="color:var(--text-dim);font-size:14px;margin:0 0 12px">
          Ele vira um app de verdade: ícone próprio, tela cheia, funciona sem internet e se atualiza sozinho.</p>
        <ol class="passos">${passos}</ol>
        <div class="row-btns"><button data-x="cancel">Fechar</button></div>
      </div>`;
    document.body.appendChild(host);
    const fechar = () => host.remove();
    host.querySelector('[data-x="cancel"]').addEventListener("click", fechar);
    host.querySelector(".scrim").addEventListener("click", fechar);
  }

  // ---------- ordenação ----------
  const SORTS = [
    { key: "manual",  label: "Manual",       hint: "a ordem que você arrastar" },
    { key: "status",  label: "Status",       hint: "mais perto de pronto no topo" },
    { key: "criacao", label: "Mais recentes", hint: "pela data de criação" },
  ];
  function atualizarBotaoOrdem() {
    const s = SORTS.find((x) => x.key === (S.get().settings.sort || "manual")) || SORTS[0];
    const lb = $("#sortLabel"); if (lb) lb.textContent = s.label;
  }
  $("#sortBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const aberto = $(".menu"); if (aberto) { aberto.remove(); return; }
    const atual = S.get().settings.sort || "manual";
    const m = document.createElement("div");
    m.className = "menu sort-menu";
    m.innerHTML = `<div class="muted">Ordenar por</div>` + SORTS.map((s) =>
      `<button data-s="${s.key}" class="${s.key === atual ? "is-on" : ""}">
         <span class="sort-tick">${s.key === atual ? I.check : ""}</span>
         <span><b>${s.label}</b><small>${s.hint}</small></span>
       </button>`).join("") +
      `<hr><div class="sort-note">Arrastar um card sempre volta pro manual.</div>`;
    const r = $("#sortBtn").getBoundingClientRect();
    m.style.top = r.bottom + 8 + "px";
    m.style.right = Math.max(12, window.innerWidth - r.right) + "px";
    document.body.appendChild(m);
    const fechar = () => { m.remove(); document.removeEventListener("click", fechar); };
    setTimeout(() => document.addEventListener("click", fechar), 0);
    m.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-s]"); if (!b) return;
      fechar();
      S.setSort(b.dataset.s);
      atualizarBotaoOrdem();
      renderBoard();
    });
  });

  // ---------- search ----------
  $("#search").addEventListener("input", debounce((e) => { search = e.target.value.trim().toLowerCase(); renderBoard(); }, 120));
  function visibleIdeas() {
    return S.get().ideas.filter((i) => {
      if (!search) return true;
      return (i.title + " " + i.script).toLowerCase().includes(search);
    });
  }

  // ---------- board ----------
  const boardHost = $("#boardHost");
  function renderBoard() {
    if (S.get().ideas.length === 0) {
      boardHost.innerHTML = `
        <div class="empty-all">
          <div class="flame">🔥</div>
          <h2>Toda grande postagem começou como uma faísca solta.</h2>
          <p>Joga sua primeira ideia lá em cima — nem precisa estar boa ainda. Depois é só ir empurrando ela pelas etapas até virar conteúdo.</p>
        </div>`;
      return;
    }
    // Lista única. Em qualquer ordenação, o que já foi postado vai pro fim:
    // não é mais trabalho pendente.
    const modo = S.get().settings.sort || "manual";
    const ideas = visibleIdeas().slice().sort((a, b) => {
      const pa = a.stage === "postado" ? 1 : 0, pb = b.stage === "postado" ? 1 : 0;
      if (pa !== pb) return pa - pb;
      if (modo === "criacao") {
        const d = (b.created || 0) - (a.created || 0);
        if (d) return d;
      } else if (modo === "status") {
        // mais perto de pronto fica mais em cima
        const d = (S.STAGE_PROGRESS[b.stage] || 0) - (S.STAGE_PROGRESS[a.stage] || 0);
        if (d) return d;
      }
      return (a.order || 0) - (b.order || 0);
    });

    const grid = document.createElement("div");
    grid.className = "board-flat";
    if (!ideas.length) {
      grid.innerHTML = `<div class="stage-empty">Nada encontrado por aqui.</div>`;
    } else {
      ideas.forEach((idea) => grid.appendChild(cardEl(idea)));
    }
    setupDrop(grid);
    boardHost.innerHTML = "";
    boardHost.appendChild(grid);
  }

  function cardEl(idea) {
    const prog = S.progressOf(idea);
    const preview = (idea.script || "").replace(/\s+/g, " ").trim();
    const mediaN = (idea.media || []).length;
    const plats = idea.platforms.map((p) => {
      const pf = S.PLATFORMS.find((x) => x.key === p); return pf ? `<span class="tag-plat">${I.check}${esc(pf.label)}</span>` : "";
    }).join("");
    const tags = (plats || mediaN)
      ? `<div class="card__tags">${plats}${mediaN ? `<span class="tag-media">${I.clip}${mediaN}</span>` : ""}</div>` : "";

    const stage = S.STAGES.find((s) => s.key === idea.stage) || S.STAGES[0];
    const el = document.createElement("article");
    el.className = "card stage-" + idea.stage + (idea.stage === "postado" ? " is-posted" : "");
    el.draggable = true;
    el.dataset.id = idea.id;
    el.innerHTML = `
      <div class="card__title">${esc(idea.title) || "<i style='color:var(--text-faint)'>Sem título</i>"}</div>
      ${preview ? `<div class="card__hook">${esc(preview)}</div>` : ""}
      ${tags}
      <div class="card__meta">
        <span class="mini-prog" title="Arraste para mudar a etapa"><i style="width:${prog}%"></i></span>
        <span class="mini-stage">${esc(stage.label)}</span>
      </div>`;

    el.addEventListener("click", () => openDrawer(idea.id));
    bindStageBar(el, idea);

    el.addEventListener("dragstart", (e) => {
      dragId = idea.id; el.classList.add("dragging");
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", () => {
      dragId = null; el.classList.remove("dragging");
    });
    return el;
  }

  // A barra do card é um controle de 4 posições: arraste (ou toque) nela pra
  // mudar a etapa sem precisar abrir o item.
  function bindStageBar(el, idea) {
    const bar = $(".mini-prog", el);
    const fill = $("i", bar);
    const label = $(".mini-stage", el);
    let arrastando = false;
    let alvo = S.STAGES.find((s) => s.key === idea.stage) || S.STAGES[0];

    // faixas iguais: cada etapa ocupa o mesmo pedaço da barra, senão
    // "Postado" (que começa em 90%) viraria um alvo minúsculo no celular
    const etapaEmX = (clientX) => {
      const b = bar.getBoundingClientRect();
      const f = b.width ? (clientX - b.left) / b.width : 0;
      const k = Math.floor(f * S.STAGES.length);
      return S.STAGES[Math.max(0, Math.min(S.STAGES.length - 1, k))];
    };
    const pintar = (s) => {
      el.className = "card stage-" + s.key + (s.key === "postado" ? " is-posted" : "") + " bar-live";
      fill.style.width = (S.STAGE_PROGRESS[s.key] || 0) + "%";
      label.textContent = s.label;
    };

    bar.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      arrastando = true;
      el.draggable = false;          // não deixa o arraste de reordenar começar
      bar.classList.add("is-live");
      try { bar.setPointerCapture(e.pointerId); } catch (x) {}
      alvo = etapaEmX(e.clientX); pintar(alvo);
    });
    bar.addEventListener("pointermove", (e) => {
      if (!arrastando) return;
      const s = etapaEmX(e.clientX);
      if (s.key !== alvo.key) { alvo = s; pintar(s); }
    });
    const soltar = (e) => {
      if (!arrastando) return;
      arrastando = false;
      el.draggable = true;
      bar.classList.remove("is-live");
      try { bar.releasePointerCapture(e.pointerId); } catch (x) {}
      if (alvo.key === idea.stage) { el.classList.remove("bar-live"); return; }
      S.updateIdea(idea.id, { stage: alvo.key });
      if (alvo.key === "postado") toast("No ar! Bora pra próxima 🎉");
    };
    bar.addEventListener("pointerup", soltar);
    bar.addEventListener("pointercancel", soltar);
    bar.addEventListener("click", (e) => e.stopPropagation());   // não abre a edição
  }

  // Uma lista só: arrastar reordena e passa a ordenação para "manual".
  function setupDrop(grid) {
    grid.addEventListener("dragover", (e) => {
      if (!dragId) return;
      e.preventDefault();
      const dragging = grid.querySelector(".card.dragging");
      if (!dragging) return;
      const ref = gridDragAfter(grid, e.clientX, e.clientY);
      if (ref == null) grid.appendChild(dragging);
      else if (ref !== dragging) grid.insertBefore(dragging, ref);
    });
    grid.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!dragId) return;
      // arrastar sempre vale: congela a ordem que está na tela e volta pro manual
      S.setSort("manual");
      S.reorderIdeas($$(".card", grid).map((c) => c.dataset.id));
      atualizarBotaoOrdem();
    });
  }

  function gridDragAfter(grid, x, y) {
    const els = $$(".card:not(.dragging)", grid);
    let best = null, bestD = Infinity, before = true;
    for (const el of els) {
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestD) {
        bestD = d; best = el;
        before = (y < cy - b.height * 0.25) || (Math.abs(y - cy) <= b.height * 0.75 && x < cx);
      }
    }
    if (!best) return null;
    return before ? best : best.nextElementSibling;
  }

  // ============================================================
  //  DRAWER
  // ============================================================
  let scrim, drawer;
  let drawerHistoryActive = false;
  function ensureDrawer() {
    if (drawer) return;
    scrim = document.createElement("div"); scrim.className = "scrim";
    drawer = document.createElement("div"); drawer.className = "drawer";
    document.body.appendChild(scrim); document.body.appendChild(drawer);
    scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openId) closeDrawer(); });
  }

  function openDrawer(id, fromHistory) {
    const idea = S.getIdea(id); if (!idea) return;
    ensureDrawer();
    openId = id; boardFrozen = true;
    if (!fromHistory && history.pushState) {
      history.pushState({ faiscaDrawer: id }, "", location.href);
      drawerHistoryActive = true;
    }
    drawer.innerHTML = drawerHTML(idea);
    bindDrawer(idea);
    void drawer.getBoundingClientRect();
    scrim.classList.add("open"); drawer.classList.add("open");
  }

  function closeDrawer(fromHistory) {
    if (!drawer) return;
    if (openId && drawerHistoryActive && !fromHistory && history.back) {
      history.back();
      return;
    }
    stopRec(true);
    revokeURLs();
    scrim.classList.remove("open"); drawer.classList.remove("open");
    openId = null; boardFrozen = false;
    drawerHistoryActive = false;
    renderBoard();
  }
  window.addEventListener("popstate", (e) => {
    if (openId) { closeDrawer(true); return; }
    const id = e.state && e.state.faiscaDrawer;
    if (id) openDrawer(id, true);
  });
  function revokeURLs() { drawerURLs.forEach((u) => URL.revokeObjectURL(u)); drawerURLs = []; }

  function drawerHTML(idea) {
    const stageBtns = S.STAGES.map((s) =>
      `<button class="stage-pick ${idea.stage === s.key ? "is-active" : ""} ${s.key === "postado" ? "done" : ""}" data-stage="${s.key}">${s.label}</button>`
    ).join("");
    const platChips = S.PLATFORMS.map((p) =>
      `<button class="chip plat-chip ${idea.platforms.includes(p.key) ? "on" : ""}" data-plat="${p.key}">${I.check}${p.label}</button>`
    ).join("");
    const created = new Date(idea.created);
    return `
      <div class="drawer__head">
        <span class="head-stage" id="dwHeadStage">${S.STAGES.find((s) => s.key === idea.stage).label}</span>
        <div style="flex:1"></div>
        <button class="icon-btn" id="dwClose" title="Fechar">${I.x}</button>
      </div>
      <div class="drawer__body">
        <div class="drawer__title">
          <textarea class="drawer__title-input" id="dwTitle" rows="1" placeholder="Título da ideia...">${esc(idea.title)}</textarea>
          <div class="drawer__created">Criada em ${created.getDate()} ${MESES[created.getMonth()]} ${created.getFullYear()}</div>
        </div>

        <div class="field">
          <label>Etapa</label>
          <div class="stages" id="dwStages">${stageBtns}</div>
          <div class="progress-big"><span class="bar"><i id="dwProgBar" style="width:${S.progressOf(idea)}%"></i></span><span class="pct" id="dwProgPct">${S.progressOf(idea)}%</span></div>
        </div>

        <div class="field">
          <label>Roteiro e anotações</label>
          <textarea class="textarea" id="dwScript" style="min-height:180px" placeholder="Escreva o roteiro, as ideias, os tópicos, lembretes... tudo junto, do seu jeito.">${esc(idea.script)}</textarea>
        </div>

        <div class="field">
          <label>Mídias <span class="label-hint">(ficam salvas neste aparelho)</span></label>
          <div class="media-actions">
            <button class="media-btn" id="dwRecAudio">${I.mic} Gravar áudio</button>
            <button class="media-btn" id="dwRecVideo">${I.cam} Gravar vídeo</button>
            <button class="media-btn" id="dwUpload">${I.image} Enviar foto/arquivo</button>
          </div>
          <div id="dwRec" class="rec-panel" hidden></div>
          <div id="dwMedia" class="media-list"></div>
        </div>

        <div class="field">
          <label>Postei em</label>
          <div class="chips" id="dwPlats">${platChips}</div>
        </div>
      </div>
      <div class="drawer__foot">
        <button class="btn-danger" id="dwDelete">${I.trash} Excluir</button>
        <button class="btn-save" id="dwSave">${I.check} Concluido</button>
      </div>`;
  }

  function bindDrawer(idea) {
    const id = idea.id;
    const g = (s) => $(s, drawer);

    g("#dwClose").addEventListener("click", closeDrawer);

    const title = g("#dwTitle");
    const grow = (t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };
    grow(title);
    title.addEventListener("input", () => { grow(title); S.updateIdea(id, { title: title.value }); });

    g("#dwStages").addEventListener("click", (e) => {
      const b = e.target.closest(".stage-pick"); if (!b) return;
      const antes = (S.getIdea(id) || {}).stage;
      S.updateIdea(id, { stage: b.dataset.stage });
      if (b.dataset.stage === "postado" && antes !== "postado") toast("No ar! Bora pra próxima 🎉");
      $$(".stage-pick", drawer).forEach((x) => x.classList.toggle("is-active", x === b));
      const p = S.progressOf(S.getIdea(id));
      g("#dwProgBar").style.width = p + "%"; g("#dwProgPct").textContent = p + "%";
      g("#dwHeadStage").textContent = S.STAGES.find((s) => s.key === b.dataset.stage).label;
    });

    const script = g("#dwScript");
    script.addEventListener("input", debounce(() => S.updateIdea(id, { script: script.value }), 250));

    g("#dwPlats").addEventListener("click", (e) => {
      const b = e.target.closest(".plat-chip"); if (!b) return;
      const it = S.getIdea(id); const k = b.dataset.plat;
      const arr = it.platforms.includes(k) ? it.platforms.filter((x) => x !== k) : [...it.platforms, k];
      S.updateIdea(id, { platforms: arr });
      b.classList.toggle("on");
    });

    // ---- mídia ----
    renderMediaList(id);
    g("#dwRecAudio").addEventListener("click", () => startRec("audio", id));
    g("#dwRecVideo").addEventListener("click", () => openVideoCamera(id));
    g("#dwUpload").addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*,audio/*,video/*"; inp.multiple = true;
      inp.addEventListener("change", async () => {
        for (const f of inp.files) {
          const t = f.type || "";
          const kind = t.startsWith("video") ? "video" : t.startsWith("image") ? "image" : "audio";
          await addMediaToIdea(id, { kind, mime: t, name: f.name, blob: f });
        }
        renderMediaList(id);
        if (inp.files.length) toast("Adicionado ✨");
      });
      inp.click();
    });

    // Tudo já é salvo enquanto você digita; o botão fecha e confirma.
    g("#dwSave").addEventListener("click", () => {
      S.updateIdea(id, { title: title.value, script: script.value });
      closeDrawer();
      toast("Salvo ✨");
      Sync.pushNow();
    });

    g("#dwDelete").addEventListener("click", () => {
      confirmModal("Excluir esta ideia?", "Isso também remove as mídias dela deste aparelho e do seu Drive. Não tem como voltar atrás.", "Excluir", async () => {
        await deleteIdeaFully(id);
        closeDrawer(); toast("Ideia excluída");
      }, true);
    });
  }

  // adiciona uma mídia à ideia: guarda o blob local, registra o metadado (sincroniza) e sobe pro Drive em 2º plano
  async function addMediaToIdea(id, { kind, mime, name, blob }) {
    const idea = S.getIdea(id); if (!idea) return;
    const mediaId = S.uid();
    await M.put(mediaId, blob, { ideaId: id, kind, name });
    const order = (idea.media.reduce((mx, x) => Math.max(mx, x.order || 0), 0)) + 1;
    idea.media.push({ id: mediaId, kind, mime: mime || blob.type || "", name: name || "", size: blob.size, order, driveFileId: null });
    S.updateIdea(id, { media: idea.media });
    if (D.isConnected() && S.get().settings.uploadMedia !== false) {
      uploadMediaBg(id, mediaId, blob, name || kind, mime || blob.type).catch(() => {});
    }
  }

  // sobe uma mídia pra subpasta da ideia no Drive
  async function uploadMediaBg(ideaId, mediaId, blob, name, mime) {
    try {
      let idea = S.getIdea(ideaId); if (!idea) return;
      let folderId = idea.driveFolderId;
      if (!folderId) {
        folderId = await D.ensureIdeaFolder(idea.title, null);
        S.updateIdea(ideaId, { driveFolderId: folderId });
      }
      const ext = extFor(mime);
      const fileId = await D.uploadMedia(folderId, blob, (name || "midia") + ext, mime);
      idea = S.getIdea(ideaId); if (!idea) return;
      const m = idea.media.find((x) => x.id === mediaId);
      if (m) { m.driveFileId = fileId; S.updateIdea(ideaId, { media: idea.media }); }
    } catch (e) {
      // fica só local e tenta de novo depois. Se o Drive encheu, a pessoa
      // precisa saber — senão parece que sincronizou e não foi.
      if (e && e.quotaExceeded) avisarDriveCheio();
    }
  }

  let jaAvisouCheio = false;
  function avisarDriveCheio() {
    if (jaAvisouCheio) return;
    jaAvisouCheio = true;
    toast("Seu Google Drive está cheio — as mídias ficaram só neste aparelho", true);
  }

  function extFor(mime) {
    mime = mime || "";
    if (mime.includes("mp4")) return ".mp4";
    if (mime.includes("webm")) return ".webm";
    if (mime.includes("ogg")) return ".ogg";
    if (mime.includes("mpeg") || mime.includes("mp3")) return ".mp3";
    if (mime.includes("wav")) return ".wav";
    if (mime.includes("png")) return ".png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
    if (mime.includes("gif")) return ".gif";
    if (mime.includes("webp")) return ".webp";
    if (mime.startsWith("video")) return ".mp4";
    if (mime.startsWith("image")) return ".png";
    return ".dat";
  }

  // sobe pro Drive as mídias que ainda não têm cópia lá (ex: gravadas offline ou antes de conectar)
  async function syncPendingMedia() {
    if (!D.isConnected()) return;
    if (S.get().settings.uploadMedia === false) return;
    for (const idea of S.get().ideas.slice()) {
      for (const m of (idea.media || []).slice()) {
        if (m.driveFileId) continue;
        const blob = await M.get(m.id);
        if (!blob) continue;
        await uploadMediaBg(idea.id, m.id, blob, m.name || m.kind, m.mime);
      }
    }
  }

  async function deleteIdeaFully(id) {
    const idea = S.getIdea(id);
    if (idea) {
      await M.delMany((idea.media || []).map((m) => m.id));
      if (D.isConnected() && idea.driveFolderId) D.trash(idea.driveFolderId).catch(() => {});
    }
    S.deleteIdea(id);
    if (D.isConnected()) await Sync.full(false);
  }

  async function renderMediaList(id) {
    const host = $("#dwMedia", drawer); if (!host) return;
    revokeURLs();
    host.innerHTML = "";
    const idea = S.getIdea(id); if (!idea) return;
    const clips = (idea.media || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!clips.length) { host.innerHTML = `<div class="media-empty">Nada por aqui ainda. Grave ou envie acima. 🎙️</div>`; return; }
    bindMediaReorder(host, id);
    for (const c of clips) {
      // 1) tenta local; 2) baixa do Drive sob demanda e cacheia
      let blob = await M.get(c.id);
      let downloading = false;
      if (!blob && c.driveFileId && D.isConnected()) { downloading = true; }
      const url = blob ? URL.createObjectURL(blob) : null;
      if (url) drawerURLs.push(url);
      const kindIcon = c.kind === "video" ? I.cam : c.kind === "image" ? I.image : I.mic;
      const defName = c.kind === "video" ? "Vídeo" : c.kind === "image" ? "Imagem" : "Áudio";
      const playerHTML = url
        ? (c.kind === "video"
            ? `<video controls preload="metadata" draggable="false" src="${url}"></video>`
            : c.kind === "image"
            ? `<img class="media-img" draggable="false" src="${url}" alt="${esc(c.name || defName)}">`
            : `<audio controls preload="metadata" draggable="false" src="${url}"></audio>`)
        : (downloading
            ? `<div class="media-loading">Baixando do Drive...</div>`
            : `<div class="media-loading">Indisponível neste aparelho</div>`);
      const row = document.createElement("div");
      row.className = "media-item";
      row.dataset.clip = c.id;
      row.innerHTML = `
        <div class="media-item__head">
          <span class="media-grip" title="Arraste para reordenar" draggable="true">${I.grip}</span>
          <span class="media-kind">${kindIcon}</span>
          <input class="media-name" draggable="false" value="${esc(c.name || defName)}" placeholder="Dê um nome a esta mídia...">
          <span class="media-size">${fmtSize(c.size || 0)}</span>
          <button class="media-del" title="Remover">${I.trash}</button>
        </div>
        <div class="media-player">${playerHTML}</div>`;
      row.querySelector(".media-name").addEventListener("input", debounce((e) => {
        const it = S.getIdea(id); const m = it && it.media.find((x) => x.id === c.id);
        if (m) { m.name = e.target.value; S.updateIdea(id, { media: it.media }); }
      }, 300));
      row.querySelector(".media-del").addEventListener("click", async () => {
        const it = S.getIdea(id); if (!it) return;
        const m = it.media.find((x) => x.id === c.id);
        S.addMediaTombstone(id, m || c);
        await M.del(c.id);
        if (m && m.driveFileId && D.isConnected()) D.trash(m.driveFileId).catch(() => {});
        renderMediaList(id);
      });
      const grip = row.querySelector(".media-grip");
      grip.addEventListener("dragstart", (e) => {
        row.classList.add("dragging");
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); try { e.dataTransfer.setDragImage(row, 24, 20); } catch (x) {} }
      });
      grip.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        const ids = $$(".media-item", host).map((r) => r.dataset.clip);
        const it = S.getIdea(id); if (!it) return;
        ids.forEach((mid, k) => { const m = it.media.find((x) => x.id === mid); if (m) m.order = k; });
        S.updateIdea(id, { media: it.media });
      });
      host.appendChild(row);

      // dispara o download em 2º plano e re-renderiza quando chegar
      if (downloading) {
        D.getMediaBlob(c.driveFileId).then(async (b) => {
          if (b) { await M.put(c.id, b, { ideaId: id, kind: c.kind, name: c.name }); if (openId === id) renderMediaList(id); }
        }).catch(() => {});
      }
    }
  }

  function bindMediaReorder(host, id) {
    if (host.__reorderBound) return;
    host.__reorderBound = true;
    host.addEventListener("dragover", (e) => {
      const dragging = host.querySelector(".media-item.dragging");
      if (!dragging) return; // ignora arraste de cards do board
      e.preventDefault();
      const after = mediaDragAfter(host, e.clientY);
      if (after == null) host.appendChild(dragging);
      else if (after !== dragging) host.insertBefore(dragging, after);
    });
  }
  function mediaDragAfter(host, y) {
    const els = $$(".media-item:not(.dragging)", host);
    let best = { offset: -Infinity, el: null };
    for (const el of els) {
      const box = el.getBoundingClientRect();
      const off = y - (box.top + box.height / 2);
      if (off < 0 && off > best.offset) best = { offset: off, el };
    }
    return best.el;
  }

  // ---- gravação (MediaRecorder) ----
  function pickVideoFromGallery(ideaId) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "video/*";
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      await addMediaToIdea(ideaId, { kind: "video", mime: f.type || "video/*", name: f.name, blob: f });
      if (openId === ideaId) renderMediaList(ideaId);
      toast("Video adicionado");
      closeVideoCamera();
    });
    inp.click();
  }

  async function openVideoCamera(ideaId) {
    if (rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Seu navegador nao permite gravar aqui", true); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
    } catch (e) {
      toast("Preciso de acesso a camera e ao microfone", true);
      return;
    }
    const host = document.createElement("div");
    host.className = "video-capture";
    host.innerHTML = `
      <video class="video-capture__preview" autoplay muted playsinline></video>
      <div class="video-capture__shade top"></div>
      <div class="video-capture__shade bottom"></div>
      <button class="video-capture__close" id="vcClose" title="Fechar">${I.x}</button>
      <div class="video-capture__time"><span class="rec-dot" hidden></span><span id="vcTime">0:00</span></div>
      <div class="video-capture__controls">
        <button class="video-capture__gallery" id="vcGallery">${I.image}<span>Galeria</span></button>
        <button class="video-capture__record" id="vcRecord" title="Gravar"></button>
      </div>`;
    document.body.appendChild(host);
    $(".video-capture__preview", host).srcObject = stream;
    let mr;
    try { mr = new MediaRecorder(stream); }
    catch (e) { stream.getTracks().forEach((t) => t.stop()); host.remove(); toast("Nao consegui iniciar a gravacao", true); return; }
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(recTimer); recTimer = null;
      const canceled = rec && rec.canceled;
      const blob = new Blob(chunks, { type: mr.mimeType || "video/webm" });
      rec = null;
      if (canceled || !blob.size) { host.remove(); return; }
      const stamp = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      try {
        await addMediaToIdea(ideaId, { kind: "video", mime: blob.type, name: "Video " + stamp, blob });
        if (openId === ideaId) renderMediaList(ideaId);
        toast("Video salvo");
      } catch (e) { toast("Nao consegui salvar o video", true); }
      host.remove();
    };
    rec = { mr, stream, kind: "video", startTs: null, canceled: false, host };
    $("#vcClose", host).addEventListener("click", closeVideoCamera);
    $("#vcGallery", host).addEventListener("click", () => pickVideoFromGallery(ideaId));
    $("#vcRecord", host).addEventListener("click", () => {
      if (!rec) return;
      if (rec.startTs) { stopRec(false); return; }
      rec.startTs = Date.now();
      host.classList.add("is-recording");
      $(".rec-dot", host).hidden = false;
      mr.start();
      recTimer = setInterval(renderRecTime, 250);
    });
  }

  function closeVideoCamera() {
    if (!rec || rec.kind !== "video") return;
    rec.canceled = true;
    try { rec.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    const inactive = !rec.mr || rec.mr.state === "inactive";
    try { if (!inactive) rec.mr.stop(); } catch (e) {}
    if (rec.host) rec.host.remove();
    clearInterval(recTimer); recTimer = null;
    if (inactive) rec = null;
  }

  async function startRec(kind, ideaId) {
    if (rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Seu navegador não permite gravar aqui", true); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(kind === "video" ? { video: { facingMode: "user" }, audio: true } : { audio: true });
    } catch (e) {
      toast(kind === "video" ? "Preciso de acesso à câmera e ao microfone" : "Preciso de acesso ao microfone", true);
      return;
    }
    let mr;
    try { mr = new MediaRecorder(stream); }
    catch (e) { stream.getTracks().forEach((t) => t.stop()); toast("Não consegui iniciar a gravação", true); return; }
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || (kind === "video" ? "video/webm" : "audio/webm") });
      const canceled = rec && rec.canceled;
      rec = null; clearInterval(recTimer); recTimer = null;
      renderRecPanel();
      if (canceled || !blob.size) return;
      const stamp = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      try {
        await addMediaToIdea(ideaId, { kind, mime: blob.type, name: (kind === "video" ? "Vídeo " : "Áudio ") + stamp, blob });
        if (openId === ideaId) renderMediaList(ideaId);
        toast("Gravação salva ✨");
      } catch (e) { toast("Não consegui salvar a gravação", true); }
    };
    rec = { mr, stream, kind, startTs: Date.now(), canceled: false };
    mr.start();
    renderRecPanel();
    recTimer = setInterval(renderRecTime, 250);
  }

  function stopRec(cancel) {
    if (!rec) return;
    if (cancel) rec.canceled = true;
    try { if (rec.mr.state !== "inactive") rec.mr.stop(); } catch (e) {}
    if (rec.kind === "video" && rec.host) rec.host.remove();
  }

  function renderRecPanel() {
    const panel = drawer && $("#dwRec", drawer); if (!panel) return;
    if (!rec) { panel.hidden = true; panel.innerHTML = ""; return; }
    panel.hidden = false;
    panel.innerHTML = `
      ${rec.kind === "video" ? `<video id="dwRecPreview" class="rec-preview" muted autoplay playsinline></video>` : ""}
      <div class="rec-bar">
        <span class="rec-dot"></span>
        <span class="rec-label">Gravando ${rec.kind === "video" ? "vídeo" : "áudio"}</span>
        <span class="rec-time" id="dwRecTime">0:00</span>
        <button class="rec-cancel" id="dwRecCancel">Cancelar</button>
        <button class="rec-stop" id="dwRecStop">${I.stop} Parar e salvar</button>
      </div>`;
    if (rec.kind === "video") { const v = $("#dwRecPreview", drawer); if (v) v.srcObject = rec.stream; }
    $("#dwRecStop", drawer).addEventListener("click", () => stopRec(false));
    $("#dwRecCancel", drawer).addEventListener("click", () => stopRec(true));
  }
  function renderRecTime() {
    const vc = rec && rec.host && $("#vcTime", rec.host);
    if (vc && rec.startTs) vc.textContent = fmtDur((Date.now() - rec.startTs) / 1000);
    const t = drawer && $("#dwRecTime", drawer);
    if (t && rec) t.textContent = fmtDur((Date.now() - rec.startTs) / 1000);
  }

  // ============================================================
  //  Modais centrais
  // ============================================================
  function confirmModal(title, body, okLabel, onOk, danger) {
    const host = document.createElement("div");
    host.className = "modal-center";
    host.innerHTML = `
      <div class="scrim open" style="position:absolute"></div>
      <div class="modal-card">
        <h3>${esc(title)}</h3>
        <p style="color:var(--text-dim);font-size:14px;margin:0">${esc(body)}</p>
        <div class="row-btns">
          <button data-x="cancel">Cancelar</button>
          <button class="${danger ? "danger" : "primary"}" data-x="ok">${esc(okLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(host);
    const close = () => host.remove();
    host.querySelector('[data-x="cancel"]').addEventListener("click", close);
    host.querySelector(".scrim").addEventListener("click", close);
    host.querySelector('[data-x="ok"]').addEventListener("click", () => { close(); onOk && onOk(); });
  }

  // ---- conflito de título ao mesclar (mesma ideia criada em dois aparelhos) ----
  const fmtWhen = (ts) => {
    const d = new Date(ts || 0);
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  function askConflicts(conflicts) {
    return new Promise((resolve) => {
      const choices = new Map();
      let applyAll = null;
      let idx = 0;
      const step = () => {
        if (idx >= conflicts.length) return resolve(choices);
        const c = conflicts[idx++];
        if (applyAll) { choices.set(c.remote.id, applyAll); return step(); }
        conflictModal(c, idx, conflicts.length, (choice, all) => {
          choices.set(c.remote.id, choice);
          if (all) applyAll = choice;
          step();
        });
      };
      step();
    });
  }

  function conflictModal(c, n, total, done) {
    const side = (idea, label, tag) => {
      const preview = (idea.script || "").replace(/\s+/g, " ").trim().slice(0, 160);
      const stage = S.STAGES.find((s) => s.key === idea.stage);
      return `
        <div class="conf-side">
          <div class="conf-side__top"><b>${esc(label)}</b><span class="conf-tag">${esc(tag)}</span></div>
          <div class="conf-when">Alterada em ${fmtWhen(idea.updated)}</div>
          <div class="conf-line">Etapa: ${esc(stage ? stage.label : idea.stage)}${(idea.media || []).length ? ` · ${(idea.media || []).length} mídia(s)` : ""}</div>
          <div class="conf-prev">${preview ? esc(preview) + ((idea.script || "").length > 160 ? "…" : "") : "<i>Sem roteiro escrito</i>"}</div>
        </div>`;
    };
    const newerIsRemote = (c.remote.updated || 0) >= (c.local.updated || 0);
    const host = document.createElement("div");
    host.className = "modal-center";
    host.innerHTML = `
      <div class="scrim open" style="position:absolute"></div>
      <div class="modal-card conflict-card">
        <h3>Mesma ideia nos dois lados</h3>
        <p class="conf-sub">Existe uma ideia chamada <b>“${esc(c.local.title)}”</b> aqui e no Drive, mas são cópias separadas. Qual você quer manter?${total > 1 ? ` <span class="conf-count">${n} de ${total}</span>` : ""}</p>
        <div class="conf-sides">
          ${side(c.local, "Neste aparelho", newerIsRemote ? "" : "mais atual")}
          ${side(c.remote, "No Drive", newerIsRemote ? "mais atual" : "")}
        </div>
        <div class="conf-choices">
          <button class="primary" data-c="newer">Manter a mais atual</button>
          <button data-c="local">Manter a deste aparelho</button>
          <button data-c="remote">Manter a do Drive</button>
          <button data-c="both">Ficar com as duas</button>
        </div>
        <label class="conf-all"><input type="checkbox" id="confAll"> Fazer isso com todos os casos</label>
      </div>`;
    document.body.appendChild(host);
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]"); if (!b) return;
      const all = host.querySelector("#confAll").checked;
      host.remove();
      done(b.dataset.c, all);
    });
  }

  // ---- espaço do Drive ----
  const fmtGB = (b) => {
    if (b == null) return "—";
    const gb = b / 1073741824;
    if (gb >= 100) return Math.round(gb) + " GB";
    // até 100 GB mantemos uma casa: "15 GB de 15 GB" com 400 MB livres confunde
    if (gb >= 1) return gb.toFixed(1).replace(".", ",") + " GB";
    const mb = b / 1048576;
    return (mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(".", ",")) + " MB";
  };

  async function renderQuota(box) {
    const a = await D.about();
    box.classList.remove("is-loading");
    if (!a) { box.remove(); return; }        // o Google não deixou ler: melhor não mostrar nada
    if (a.limite == null) {
      box.innerHTML = `<div class="quota__top"><span>Espaço no seu Google Drive</span><b>sem limite</b></div>
        <div class="quota__note">Esta conta não tem cota definida, então o espaço não deve ser problema.</div>`;
      return;
    }
    const pct = Math.min(100, Math.round((a.usado / a.limite) * 100));
    const livre = Math.max(0, a.limite - a.usado);
    const nivel = pct >= 95 ? "is-full" : pct >= 85 ? "is-warn" : "";
    box.className = "quota " + nivel;
    box.innerHTML = `
      <div class="quota__top"><span>Espaço no seu Google Drive</span><b>${fmtGB(a.usado)} de ${fmtGB(a.limite)}</b></div>
      <div class="quota__bar"><i style="width:${pct}%"></i></div>
      <div class="quota__note">
        ${pct >= 95
          ? `Só restam <b>${fmtGB(livre)}</b>. Novos áudios e vídeos podem falhar ao subir — eles continuam salvos aqui no aparelho, mas não vão pros outros.`
          : pct >= 85
          ? `Restam <b>${fmtGB(livre)}</b>. Vale liberar espaço antes que aperte.`
          : `Livres: <b>${fmtGB(livre)}</b>. Suas ideias em texto ocupam alguns KB; o que pesa mesmo são os áudios e vídeos.`}
        ${a.lixeira > 52428800 ? `<br>A lixeira do Drive está com ${fmtGB(a.lixeira)} — esvaziá-la devolve esse espaço.` : ""}
      </div>`;
  }

  function syncModal() {
    const host = document.createElement("div");
    host.className = "modal-center";
    const configured = D.available();
    const linked = D.isConnected();
    const active = D.isConnected();
    const account = D.user();
    host.innerHTML = `
      <div class="scrim open" style="position:absolute"></div>
      <div class="modal-card sheet">
        <h3>${I.cloud} Sincronização</h3>
        ${configured && linked ? `
          <div class="sync-account">
            <span class="sync-account__dot ${active ? "is-active" : ""}"></span>
            <div><b>${active ? "Google Drive sincronizado" : "Google Drive vinculado"}</b><small>${esc(account || "Conta Google")}</small></div>
          </div>
          <p>Suas ideias ficam salvas neste aparelho <b>e</b> numa cópia dentro do seu Google Drive. É essa cópia que mantém o celular, o computador e qualquer outro aparelho com exatamente o mesmo conteúdo: entrando com esta mesma conta em cada um, o que você escreve num aparece nos outros em segundos.</p>
          <div id="cmQuota" class="quota is-loading">Vendo quanto espaço tem no seu Drive...</div>
          <label class="opt-row">
            <input type="checkbox" id="cmMedia" ${S.get().settings.uploadMedia === false ? "" : "checked"}>
            <span><b>Enviar áudios, vídeos e fotos também</b><small>Desligado, as gravações ficam só no aparelho onde foram feitas e não ocupam espaço no Drive. O texto continua sincronizando.</small></span>
          </label>
          <div class="sync-actions">
            <button class="g-btn" id="cmSync">${I.refresh} Atualizar agora</button>
            <button class="g-btn" id="cmSwitch">${I.google} Trocar de conta</button>
            <button class="g-btn danger-outline" id="cmDisconnect">${I.off} Desconectar</button>
          </div>
        ` : `
          <p>O Faísca funciona normalmente sem conta: suas ideias ficam salvas só neste aparelho.</p>
          <p>Conectando o Google, ele passa a guardar uma cópia das suas ideias <b>no seu próprio Google Drive</b>. Serve pra usar o mesmo conteúdo em vários aparelhos — você entra com a mesma conta no celular e no computador, e os dois passam a mostrar e atualizar as mesmas ideias, cada um se atualizando sozinho quando o outro muda alguma coisa.</p>
          ${configured ? `<button class="g-btn" id="cmConnect">${I.google} Sincronizar com o Google</button>` : `<div class="note">A sincronização com o Drive ainda não foi configurada.</div>`}
        `}
        <div class="note" style="margin-top:14px">É o <b>seu</b> Drive, não um servidor nosso. O app só enxerga a pasta <b>Faísca</b> que ele mesmo cria — o resto do seu Drive continua invisível pra ele, e ninguém além de você vê suas ideias.</div>
        <div class="row-btns"><button data-x="cancel">Fechar</button></div>
      </div>`;
    document.body.appendChild(host);
    const close = () => host.remove();
    host.querySelector('[data-x="cancel"]').addEventListener("click", close);
    host.querySelector(".scrim").addEventListener("click", close);

    const optMedia = host.querySelector("#cmMedia");
    if (optMedia) optMedia.addEventListener("change", () => {
      S.setUploadMedia(optMedia.checked);
      if (optMedia.checked) { toast("As mídias vão subir na próxima sincronização"); syncPendingMedia().catch(() => {}); }
      else toast("As mídias vão ficar só neste aparelho");
    });

    const quotaBox = host.querySelector("#cmQuota");
    if (quotaBox) renderQuota(quotaBox);

    const cb = host.querySelector("#cmConnect");
    if (cb) cb.addEventListener("click", async () => { close(); await Sync.connect(); });
    const sync = host.querySelector("#cmSync");
    if (sync) sync.addEventListener("click", async () => { close(); active ? await Sync.full(true) : await Sync.connect(); });
    const change = host.querySelector("#cmSwitch");
    if (change) change.addEventListener("click", () => {
      close();
      confirmModal("Trocar a conta do Google?", "As ideias que estão neste aparelho serão sincronizadas com a nova conta escolhida.", "Trocar conta", async () => {
        D.disconnect(); Sync.setStatus("off"); await Sync.connect({ selectAccount: true });
      });
    });
    const disconnect = host.querySelector("#cmDisconnect");
    if (disconnect) disconnect.addEventListener("click", () => {
      close();
      confirmModal("Desconectar do Google Drive?", "As ideias deste aparelho continuam aqui. Apenas a sincronização será desligada.", "Desconectar", () => {
        D.disconnect(); Sync.setStatus("off"); toast("Drive desconectado");
      }, true);
    });
  }

  const connectModal = syncModal;

  function aboutModal() {
    confirmModal("Faísca 🔥", "Seu estúdio de ideias. Anote fácil, grave áudio e vídeo, organize cada ideia e acompanhe do rascunho até a postagem. Seus dados são seus — ficam neste aparelho e, se você conectar, o texto sincroniza no seu próprio Google Drive.", "Fechar", null);
  }

  // ============================================================
  //  Menu
  // ============================================================
  $("#menu").addEventListener("click", (e) => {
    e.stopPropagation();
    const existing = $(".menu"); if (existing) { existing.remove(); return; }
    const m = document.createElement("div");
    m.className = "menu";
    const connected = D.isConnected();
    m.innerHTML = `
      <div class="muted">Sincronização</div>
      ${D.available()
        ? (connected
          ? `<button data-a="syncnow">${I.refresh} Sincronizar agora</button><button data-a="disconnect">${I.off} Desconectar (${esc(D.user() || "Google")})</button>`
          : `<button data-a="connect">${I.google} Conectar Google Drive</button>`)
        : `<button data-a="connect">${I.cloud} Sobre a sincronização</button>`}
      <hr>
      <div class="muted">Backup</div>
      <button data-a="export">${I.down} Fazer backup (baixar)</button>
      <button data-a="import">${I.up} Restaurar backup</button>
      <hr>
      ${jaEhApp() ? "" : `<button data-a="install">${I.down} Instalar no aparelho</button>`}
      <button data-a="clearposted">${I.trash} Limpar itens postados</button>
      <button data-a="about">⚡ Sobre o Faísca</button>`;
    const r = $("#menu").getBoundingClientRect();
    m.style.top = r.bottom + 8 + "px";
    m.style.right = Math.max(12, window.innerWidth - r.right) + "px";
    document.body.appendChild(m);
    const closeM = () => { m.remove(); document.removeEventListener("click", closeM); };
    setTimeout(() => document.addEventListener("click", closeM), 0);
    m.addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b) return;
      closeM();
      const a = b.dataset.a;
      if (a === "connect") connectModal();
      else if (a === "syncnow") Sync.full(true);
      else if (a === "disconnect") { D.disconnect(); Sync.setStatus("off"); toast("Drive desconectado"); }
      else if (a === "export") doExport();
      else if (a === "import") doImport();
      else if (a === "install") instalarAgora();
      else if (a === "clearposted") clearPosted();
      else if (a === "about") aboutModal();
    });
  });

  function clearPosted() {
    const posted = S.get().ideas.filter((i) => i.stage === "postado");
    if (!posted.length) { toast("Nada postado pra limpar"); return; }
    confirmModal(`Limpar ${posted.length} ${posted.length === 1 ? "item postado" : "itens postados"}?`,
      "Eles saem do quadro e as mídias deles são removidas deste aparelho. Não tem como desfazer.",
      "Limpar", async () => {
        for (const i of posted) await deleteIdeaFully(i.id);
        toast("Postados limpos ✨");
      }, true);
  }

  // ---------- backup ----------
  function doExport() {
    const json = JSON.stringify(S.exportObject(), null, 2);
    const fname = "faisca-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    if (window.claude && window.claude.downloads && window.claude.downloads.save) {
      window.claude.downloads.save({ filename: fname, data: json }).then(() => toast("Backup salvo")).catch(() => fallbackDownload(json, fname));
    } else fallbackDownload(json, fname);
  }
  function fallbackDownload(text, fname) {
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Backup baixado");
  }
  function doImport() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json";
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { S.importObject(JSON.parse(rd.result)); toast("Backup restaurado ✨"); Sync.pushSoon(); }
        catch (e) { toast("Arquivo inválido", true); }
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  // ============================================================
  //  SYNC (Google Drive)
  // ============================================================
  let suppressPush = false;
  let activeUntil = 0;  // janela de "conversa rápida" logo após qualquer mudança

  // Uma operação de sincronização por vez: sem isso, dois ciclos simultâneos
  // podem perguntar a mesma coisa duas vezes ou gravar um por cima do outro.
  let syncQueue = Promise.resolve();
  function serial(fn) {
    const run = syncQueue.then(fn, fn);
    syncQueue = run.then(() => {}, () => {});
    return run;
  }
  let lastStatus = null;

  function markActive() { activeUntil = Date.now() + 90000; }

  // ---- mesclagem com pergunta em caso de título repetido ----
  const normTitle = (t) => String(t || "").trim().toLowerCase().replace(/\s+/g, " ");

  // Procura ideias diferentes (ids distintos) que tenham o mesmo título:
  // é o caso clássico de "criei a mesma coisa nos dois aparelhos".
  function findTitleConflicts(remoteObj) {
    const remoteData = (remoteObj && remoteObj.data) || remoteObj || {};
    const remoteIdeas = Array.isArray(remoteData.ideas) ? remoteData.ideas : [];
    if (!remoteIdeas.length) return [];
    const localIdeas = S.get().ideas;
    const remoteIds = new Set(remoteIdeas.map((i) => i.id));
    const localIds = new Set(localIdeas.map((i) => i.id));
    const deleted = new Set((S.get().tombstones || []).map((t) => t.id));

    const byTitle = new Map();
    for (const l of localIdeas) {
      if (remoteIds.has(l.id)) continue;       // é o mesmo item, a mesclagem normal resolve
      const k = normTitle(l.title); if (!k) continue;
      if (!byTitle.has(k)) byTitle.set(k, []);
      byTitle.get(k).push(l);
    }
    const out = [];
    for (const r of remoteIdeas) {
      if (localIds.has(r.id) || deleted.has(r.id)) continue;
      const k = normTitle(r.title); if (!k) continue;
      const pool = byTitle.get(k);
      if (pool && pool.length) out.push({ local: pool.shift(), remote: r });
    }
    return out;
  }

  // Emparelha as mídias das duas cópias. O id é sorteado em cada aparelho,
  // então quem reconhece o mesmo arquivo é tipo + nome + tamanho em bytes.
  // Devolve os pares, ou null se as listas não baterem.
  function pairMedia(a, b) {
    const A = a.media || [], B = b.media || [];
    if (A.length !== B.length) return null;
    const key = (m) => [m.kind || "", String(m.name || "").trim().toLowerCase(), m.size || 0].join(" ");
    const pool = new Map();
    for (const m of B) { const k = key(m); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(m); }
    const pairs = [];
    for (const m of A) {
      const list = pool.get(key(m));
      if (!list || !list.length) return null;
      pairs.push([m, list.shift()]);
    }
    return pairs;
  }

  // Duas cópias com o mesmo conteúdo não têm o que decidir: juntamos as duas
  // em uma só, sem perguntar nada. Devolve os pares de mídia, ou null.
  function sameContent(a, b) {
    const sig = (i) => JSON.stringify([
      normTitle(i.title), String(i.script || "").trim(), i.stage, (i.platforms || []).slice().sort(),
    ]);
    if (sig(a) !== sig(b)) return null;
    return pairMedia(a, b);
  }

  // Aplica as escolhas: tira do pacote remoto o que foi recusado e
  // apaga daqui o que a pessoa preferiu substituir pela versão do Drive.
  async function applyChoices(remoteObj, conflicts, choices) {
    const remoteData = (remoteObj && remoteObj.data) || remoteObj;
    const drop = new Set();
    for (const c of conflicts) {
      let choice = choices.get(c.remote.id) || "both";
      if (choice === "newer") choice = (c.remote.updated || 0) >= (c.local.updated || 0) ? "remote" : "local";
      if (choice === "local") {
        drop.add(c.remote.id);
        S.addTombstone(c.remote.id);           // some também do Drive na próxima gravação
      } else if (choice === "remote") {
        // Cópias iguais: os arquivos daqui continuam valendo para a versão que
        // ficou. Repassamos o blob para o id dela em vez de jogar fora e ter
        // que baixar tudo do Drive de novo (ou perder o que ainda não subiu).
        for (const [meu, dele] of (c.pairs || [])) {
          try {
            if (await M.has(dele.id)) continue;
            const blob = await M.get(meu.id);
            if (blob) await M.put(dele.id, blob, { ideaId: c.remote.id, kind: dele.kind, name: dele.name });
          } catch (e) {}
        }
        const manter = new Set((c.pairs || []).map((p) => p[1].id));
        await M.delMany((c.local.media || []).map((m) => m.id).filter((id) => !manter.has(id))).catch(() => {});
        S.deleteIdea(c.local.id);
      }
    }
    if (drop.size) remoteData.ideas = remoteData.ideas.filter((i) => !drop.has(i.id));
    return remoteObj;
  }

  async function applyRemote(remoteObj) {
    if (!remoteObj) return false;
    const conflicts = findTitleConflicts(remoteObj);
    if (conflicts.length) {
      const choices = new Map();
      const perguntar = [];
      for (const c of conflicts) {
        const pares = sameContent(c.local, c.remote);
        if (pares) { c.pairs = pares; choices.set(c.remote.id, "newer"); }
        else perguntar.push(c);
      }
      if (perguntar.length) {
        const respostas = await askConflicts(perguntar);
        respostas.forEach((v, k) => choices.set(k, v));
      }
      remoteObj = await applyChoices(remoteObj, conflicts, choices);
    }
    suppressPush = true;
    let changed = false;
    try { changed = S.importObject(remoteObj); } finally { suppressPush = false; }
    return changed;
  }

  const Sync = {
    async connect(options) {
      try {
        this.setStatus("syncing");
        await D.connect(options || {});
        this.setStatus("on");
        toast("Google Drive conectado ✨");
        await this.full();
      }
      catch (e) { this.setStatus(D.wasConnected() ? "on" : "off"); toast(e && e.message ? e.message : "Não deu pra conectar", true); }
    },
    full(manual) {
      if (!D.isConnected()) { if (manual) toast("Conecte o Drive primeiro", true); return Promise.resolve(false); }
      return serial(async () => {
        try {
          Sync.setStatus("syncing");
          D.forgetStamp();
          const remote = await D.pull();
          const changed = await applyRemote(remote);
          await D.push(S.exportObject());
          Sync.setStatus("on");
          if (manual) toast(changed ? "Sincronizado ✨" : "Já está tudo em dia");
          markActive();
          syncPendingMedia().catch(() => {});
          return true;
        } catch (e) {
        suppressPush = false; Sync.setStatus("error");
        if (e && e.quotaExceeded) toast("Seu Google Drive está cheio — libere espaço para sincronizar", true);
        else toast("Falha ao sincronizar", true);
        return false;
      }
      });
    },
    _push: debounce(function () { Sync.pushNow(); }, 1200),
    pushNow() {
      if (!D.isConnected() || suppressPush) return Promise.resolve();
      return serial(async () => {
        try {
          const r = await D.pullIfChanged();
          if (r.changed) await applyRemote(r.data);
          await D.push(S.exportObject());
          Sync.setStatus("on");
          markActive();
        }
        catch (e) { suppressPush = false; Sync.setStatus("error"); }
      });
    },
    pushSoon() { if (D.isConnected() && !suppressPush) { markActive(); this._push(); } },
    // silent: não mexe no indicador nem avisa nada quando não há novidade
    pull(opts) {
      const silent = !!(opts && opts.silent);
      if (!D.isConnected()) return Promise.resolve(false);
      return serial(async () => {
        try {
          if (!silent) Sync.setStatus("syncing");
          const r = await D.pullIfChanged();
          let changed = false;
          if (r.changed) { changed = await applyRemote(r.data); if (changed) markActive(); }
          Sync.setStatus("on");
          return changed;
        }
        catch (e) { suppressPush = false; Sync.setStatus(D.isConnected() ? "on" : "off"); return false; }
      });
    },
    async ensureReady(manual) {
      if (D.isConnected()) return true;
      if (await D.reconnectSilently()) { this.setStatus("on"); return true; }
      this.setStatus("off");
      if (manual) toast("Conecte o Drive para sincronizar", true);
      return false;
    },
    setStatus(s) {
      const pill = $("#sync"); const label = $("#syncLabel");
      if (!pill || !label) return;
      if (s === lastStatus) return;   // nada de piscar o indicador à toa
      lastStatus = s;
      pill.classList.remove("is-on", "is-syncing", "is-error");
      if (s === "on") { pill.classList.add("is-on"); label.textContent = "Sincronizado"; }
      else if (s === "syncing") { pill.classList.add("is-syncing"); label.textContent = "Sincronizando"; }
      else if (s === "error") { pill.classList.add("is-error"); label.textContent = "Erro"; }
      else if (s === "ready") { pill.classList.add("is-on"); label.textContent = "Drive ligado"; }
      else if (s === "off") { label.textContent = D.available() ? "Conectar" : "Local"; }
      else { label.textContent = "Local"; }
    },
  };
  $("#sync").addEventListener("click", () => {
    syncModal();
  });
  window.addEventListener("faisca:drive-state", (event) => {
    Sync.setStatus(event.detail && event.detail.connected ? "on" : "off");
  });
  window.addEventListener("faisca:drive-desktop-result", (event) => {
    if (event.detail && event.detail.ok) Sync.setStatus("on");
    else if (event.detail) { Sync.setStatus("off"); toast(event.detail.message, true); }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "faisca:drive:connected") Sync.setStatus(event.newValue === "1" ? "ready" : "off");
  });

  // ---------- subscription ----------
  S.subscribe(() => { if (!boardFrozen) renderBoard(); Sync.pushSoon(); });

  // ---------- checagem automática (leve) ----------
  // Cada ciclo pergunta ao Drive só a "versão" do arquivo (uns poucos bytes).
  // O conteúdo só é baixado quando alguém realmente mexeu em outro aparelho.
  let lastPull = 0;
  let pollTimer = null;
  let polling = false;

  function pollDelay() {
    if (document.hidden || !D.isConnected()) return 60000;
    return Date.now() < activeUntil ? 4000 : 15000;   // rápido logo após mudanças, calmo depois
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(async () => { await maybePull(); schedulePoll(); }, pollDelay());
  }
  async function maybePull(force) {
    if (polling) return false;
    if (!force && (document.hidden || Date.now() - lastPull < 2500)) return false;
    if (!(await Sync.ensureReady(false))) return false;
    polling = true;
    lastPull = Date.now();
    try { return await Sync.pull({ silent: true }); }
    finally { polling = false; }
  }
  async function refreshNow(manual) {
    if (!(await Sync.ensureReady(manual))) return;
    lastPull = Date.now();
    const changed = await Sync.pull({ silent: !manual });
    if (manual) toast(changed ? "Atualizado ✨" : "Já está tudo em dia");
  }
  window.addEventListener("focus", () => maybePull(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { maybePull(true); schedulePoll(); } });
  schedulePoll();

  // outros dispositivos: o ciclo acima resolve. Outras abas/janelas do mesmo
  // aparelho: o evento de storage avisa na hora, sem custo nenhum de rede.
  window.addEventListener("storage", (event) => {
    if (event.key !== S.KEY) return;
    const sig = S.signature();
    S.load();
    if (S.signature() !== sig && !boardFrozen) renderBoard();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "F5") return;
    e.preventDefault();
    refreshNow(true);
  });

  // "puxar pra atualizar" — só na tela do quadro, nunca com a edição aberta
  let pullStartY = null;
  let pullReady = false;
  function gestureBlocked(target) {
    if (openId || document.querySelector(".modal-center")) return true;
    if (target && target.closest && target.closest(".mini-prog")) return true;  // arrastando a etapa
    // ignora arrastes que começam dentro de algo que tem rolagem própria
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 2) {
        const ov = getComputedStyle(el).overflowY;
        if (ov === "auto" || ov === "scroll") return true;
      }
    }
    return false;
  }
  window.addEventListener("touchstart", (e) => {
    pullStartY = null; pullReady = false;
    if (window.scrollY <= 0 && e.touches.length === 1 && !gestureBlocked(e.target)) {
      pullStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (pullStartY == null || e.touches.length !== 1) return;
    pullReady = e.touches[0].clientY - pullStartY > 120 && window.scrollY <= 0;
  }, { passive: true });
  window.addEventListener("touchend", () => {
    if (pullReady) refreshNow(true);
    pullStartY = null;
    pullReady = false;
  });

  // ============================================================
  //  Boot
  // ============================================================
  async function boot() {
    S.load();
    applyTheme();
    atualizarBotaoOrdem();
    if (M) { try { await M.init(); await migrateOldMedia(); } catch (e) {} }
    renderBoard();
    if (D.available()) {
      const restored = await D.reconnectSilently();
      Sync.setStatus(restored ? "on" : "off");
      if (restored) Sync.pull();
    } else Sync.setStatus("local");
    if ("serviceWorker" in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (!event.data || event.data.type !== "FAISCA_CACHE_CLEARED") return;
        if (sessionStorage.getItem("faisca:reloaded:v40") === "1") return;
        sessionStorage.setItem("faisca:reloaded:v40", "1");
        location.reload();
      });
      navigator.serviceWorker.register("./service-worker.js").then((reg) => reg.update()).catch(() => {});
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_FAISCA_CACHE" });
      }
    }
    document.documentElement.dataset.appVersion = "40";
  }

  // migra mídias do modelo antigo (metadados só no IndexedDB) para dentro da ideia
  async function migrateOldMedia() {
    const recs = await M.allRecords();
    if (!recs.length) return;
    let changed = false;
    for (const r of recs) {
      if (!r.ideaId) continue;
      const idea = S.getIdea(r.ideaId);
      if (idea && !idea.media.some((m) => m.id === r.id)) {
        idea.media.push({
          id: r.id, kind: r.kind || "audio", mime: r.mime || (r.blob && r.blob.type) || "",
          name: r.name || "", size: r.size || (r.blob && r.blob.size) || 0,
          order: r.order != null ? r.order : Date.now(), driveFileId: null,
        });
        changed = true;
      }
    }
    if (changed) S.save(false);
  }

  boot();
})();
