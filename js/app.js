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
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
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
    caret: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    grip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    google: '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-7.9Z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1-3.6 1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.9L6 14.3Z"/><path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.6 6-4.6Z"/></svg>',
  };

  // ---------- app state ----------
  let search = "";
  let openId = null;
  let boardFrozen = false;
  let dragId = null;
  let dragFromStage = null;
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
    const ideas = visibleIdeas().slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const byStage = {}; S.STAGES.forEach((s) => (byStage[s.key] = []));
    ideas.forEach((i) => (byStage[i.stage] || byStage.ideia).push(i));
    const collapsed = new Set(S.get().settings.collapsedStages || []);

    const wrap = document.createElement("div");
    wrap.className = "stages-vertical";
    S.STAGES.forEach((stage) => {
      const list = byStage[stage.key];
      const sec = document.createElement("section");
      sec.className = "stage-section" + (stage.key === "postado" ? " is-done" : "")
        + (collapsed.has(stage.key) ? " collapsed" : "") + (list.length === 0 ? " empty" : "");
      sec.innerHTML = `
        <button class="stage-header" type="button">
          <span class="stage-caret">${I.caret}</span>
          <span class="col__dot"></span>
          <span class="stage-name">${stage.label}</span>
          <span class="stage-hint">${stage.hint}</span>
          <span class="col__count">${list.length}</span>
        </button>
        <div class="stage-grid" data-stage="${stage.key}"></div>`;
      const grid = sec.querySelector(".stage-grid");
      if (list.length === 0) grid.innerHTML = `<div class="stage-empty">Nada aqui ainda.</div>`;
      else list.forEach((idea) => grid.appendChild(cardEl(idea)));
      setupDrop(sec, stage.key); // solta em qualquer lugar da seção (inclusive recolhida)
      sec.querySelector(".stage-header").addEventListener("click", () => toggleCollapse(stage.key));
      wrap.appendChild(sec);
    });
    boardHost.innerHTML = "";
    boardHost.appendChild(wrap);
  }

  function toggleCollapse(key) {
    const st = S.get().settings;
    const set = new Set(st.collapsedStages || []);
    set.has(key) ? set.delete(key) : set.add(key);
    st.collapsedStages = Array.from(set);
    S.save(false);
    renderBoard();
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

    const el = document.createElement("article");
    el.className = "card";
    el.draggable = true;
    el.dataset.id = idea.id;
    el.innerHTML = `
      <div class="card__title">${esc(idea.title) || "<i style='color:var(--text-faint)'>Sem título</i>"}</div>
      ${preview ? `<div class="card__hook">${esc(preview)}</div>` : ""}
      ${tags}
      <div class="card__meta">
        <span class="mini-prog"><i style="width:${prog}%"></i></span>
        <span class="mini-count">${prog}%</span>
      </div>
      <div class="card__foot">
        <button class="move-btn" data-move="-1" title="Voltar etapa" ${idea.stage === S.STAGES[0].key ? "disabled" : ""}>${I.left}<span>Voltar</span></button>
        <button class="move-btn move-fwd" data-move="1" title="Avançar etapa" ${idea.stage === "postado" ? "disabled" : ""}><span>Avançar</span>${I.right}</button>
      </div>`;

    el.addEventListener("click", (e) => {
      if (e.target.closest(".move-btn")) return;
      openDrawer(idea.id);
    });
    el.querySelectorAll(".move-btn").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); moveStage(idea.id, +b.dataset.move); }));

    el.addEventListener("dragstart", (e) => {
      dragId = idea.id; dragFromStage = idea.stage; el.classList.add("dragging");
      $(".stages-vertical") && $(".stages-vertical").classList.add("dragging-active");
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", () => {
      dragId = null; dragFromStage = null; el.classList.remove("dragging");
      $(".stages-vertical") && $(".stages-vertical").classList.remove("dragging-active");
      $$(".drop-hint").forEach((b) => b.classList.remove("drop-hint"));
    });
    return el;
  }

  function setupDrop(sec, stageKey) {
    const grid = sec.querySelector(".stage-grid");
    sec.addEventListener("dragover", (e) => {
      if (!dragId) return;
      e.preventDefault();
      if (stageKey === dragFromStage) {
        const dragging = boardHost.querySelector(".card.dragging");
        if (dragging && grid) {
          const ref = gridDragAfter(grid, e.clientX, e.clientY);
          if (ref == null) grid.appendChild(dragging);
          else if (ref !== dragging) grid.insertBefore(dragging, ref);
        }
        sec.classList.remove("drop-hint");
      } else {
        sec.classList.add("drop-hint");
      }
    });
    sec.addEventListener("dragleave", (e) => { if (!sec.contains(e.relatedTarget)) sec.classList.remove("drop-hint"); });
    sec.addEventListener("drop", (e) => {
      e.preventDefault(); sec.classList.remove("drop-hint");
      if (!dragId) return;
      if (stageKey === dragFromStage) {
        const ids = $$(".card", grid).map((c) => c.dataset.id);
        S.reorderIdeas(ids);
      } else {
        S.moveIdeaToStageEnd(dragId, stageKey);
      }
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

  function moveStage(id, dir) {
    const idea = S.getIdea(id); if (!idea) return;
    const idx = S.STAGES.findIndex((s) => s.key === idea.stage);
    const ni = Math.max(0, Math.min(S.STAGES.length - 1, idx + dir));
    if (ni === idx) return;
    const newStage = S.STAGES[ni].key;
    S.updateIdea(id, { stage: newStage });
    if (newStage === "postado") toast("No ar! Bora pra próxima 🎉");
  }

  // ============================================================
  //  DRAWER
  // ============================================================
  let scrim, drawer;
  function ensureDrawer() {
    if (drawer) return;
    scrim = document.createElement("div"); scrim.className = "scrim";
    drawer = document.createElement("div"); drawer.className = "drawer";
    document.body.appendChild(scrim); document.body.appendChild(drawer);
    scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openId) closeDrawer(); });
  }

  function openDrawer(id) {
    const idea = S.getIdea(id); if (!idea) return;
    ensureDrawer();
    openId = id; boardFrozen = true;
    drawer.innerHTML = drawerHTML(idea);
    bindDrawer(idea);
    void drawer.getBoundingClientRect();
    scrim.classList.add("open"); drawer.classList.add("open");
  }

  function closeDrawer() {
    if (!drawer) return;
    stopRec(true);
    revokeURLs();
    scrim.classList.remove("open"); drawer.classList.remove("open");
    openId = null; boardFrozen = false;
    renderBoard();
  }
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
        <textarea class="drawer__title-input" id="dwTitle" rows="1" placeholder="Título da ideia...">${esc(idea.title)}</textarea>

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
        <span class="foot-meta">Criada em ${created.getDate()} ${MESES[created.getMonth()]} ${created.getFullYear()}</span>
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
      S.updateIdea(id, { stage: b.dataset.stage });
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
    g("#dwRecVideo").addEventListener("click", () => startRec("video", id));
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
    if (D.isConnected()) uploadMediaBg(id, mediaId, blob, name || kind, mime || blob.type).catch(() => {});
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
    } catch (e) { /* fica só local; tenta de novo numa próxima */ }
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
        it.media = it.media.filter((x) => x.id !== c.id);
        S.updateIdea(id, { media: it.media });
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

  function connectModal() {
    const host = document.createElement("div");
    host.className = "modal-center";
    const configured = D.available();
    host.innerHTML = `
      <div class="scrim open" style="position:absolute"></div>
      <div class="modal-card sheet">
        <h3>${I.cloud} Sincronizar com o Google Drive</h3>
        ${configured ? `
          <p>Conecte sua conta do Google e seu texto e etapas passam a viver no <b>seu próprio Drive</b> — sincronizando entre o computador e o celular. O app só acessa o próprio arquivo que ele cria.</p>
          <button class="g-btn" id="cmConnect">${I.google} Conectar com o Google</button>
          <div class="note" style="margin-top:14px">As mídias (áudio/vídeo) ficam salvas em cada aparelho, por serem pesadas.</div>
        ` : `
          <p>A sincronização com o Drive ainda não foi configurada neste app. Se você é quem está publicando o Faísca, cole seu <b>Client ID do Google</b> em <code>js/config.js</code> (passo a passo no <b>LEIA-ME.md</b>).</p>
          <div class="note">Enquanto isso, o app funciona normal e salva tudo neste aparelho. Use <b>Fazer backup</b> no menu pra guardar seus dados.</div>
        `}
        <div class="row-btns"><button data-x="cancel">Fechar</button></div>
      </div>`;
    document.body.appendChild(host);
    const close = () => host.remove();
    host.querySelector('[data-x="cancel"]').addEventListener("click", close);
    host.querySelector(".scrim").addEventListener("click", close);
    const cb = host.querySelector("#cmConnect");
    if (cb) cb.addEventListener("click", async () => { close(); await Sync.connect(); });
  }

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
  const Sync = {
    async connect() {
      try {
        this.setStatus("syncing");
        await D.connect();
        this.setStatus("on");
        toast("Google Drive conectado ✨");
        await this.full();
      }
      catch (e) { this.setStatus(D.wasConnected() ? "on" : "off"); toast(e && e.message ? e.message : "Não deu pra conectar", true); }
    },
    async full(manual) {
      if (!D.isConnected()) { if (manual) toast("Conecte o Drive primeiro", true); return false; }
      try {
        this.setStatus("syncing");
        const remote = await D.pull();
        if (remote) { suppressPush = true; S.importObject(remote); suppressPush = false; }
        await D.push(S.exportObject());
        this.setStatus("on"); if (manual) toast("Sincronizado ✨");
        syncPendingMedia().catch(() => {});
        return true;
      } catch (e) { suppressPush = false; this.setStatus("error"); toast("Falha ao sincronizar", true); return false; }
    },
    _push: debounce(async function () {
      if (!D.isConnected()) return;
      try { Sync.setStatus("syncing"); await D.push(S.exportObject()); Sync.setStatus("on"); }
      catch (e) { Sync.setStatus("error"); }
    }, 1600),
    pushSoon() { if (D.isConnected() && !suppressPush) this._push(); },
    async pull() {
      if (!D.isConnected()) return;
      try { this.setStatus("syncing"); const r = await D.pull(); if (r) { suppressPush = true; S.importObject(r); suppressPush = false; } this.setStatus("on"); }
      catch (e) { suppressPush = false; this.setStatus(D.isConnected() ? "on" : "off"); }
    },
    async ensureReady(manual) {
      if (D.isConnected()) return true;
      this.setStatus("off");
      if (manual) toast("Conecte o Drive para sincronizar", true);
      return false;
    },
    setStatus(s) {
      const pill = $("#sync"); const label = $("#syncLabel");
      if (!pill || !label) return;
      pill.classList.remove("is-on", "is-syncing", "is-error");
      if (s === "on") { pill.classList.add("is-on"); label.textContent = "Sincronizado"; }
      else if (s === "syncing") { pill.classList.add("is-syncing"); label.textContent = "Sincronizando"; }
      else if (s === "error") { pill.classList.add("is-error"); label.textContent = "Erro"; }
      else if (s === "ready") { pill.classList.add("is-on"); label.textContent = "Drive ligado"; }
      else if (s === "off") {
        if (D.wasConnected()) { pill.classList.add("is-on"); label.textContent = "Drive ligado"; }
        else label.textContent = D.available() ? "Conectar" : "Local";
      }
      else { label.textContent = "Local"; }
    },
  };
  $("#sync").addEventListener("click", () => {
    if (!D.available()) return connectModal();
    if (D.isConnected()) Sync.full(true); else Sync.connect();
  });
  window.addEventListener("faisca:drive-state", (event) => {
    Sync.setStatus(event.detail && event.detail.connected ? "on" : "off");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "faisca:drive:connected") Sync.setStatus(event.newValue === "1" ? "ready" : "off");
  });

  // ---------- subscription ----------
  S.subscribe(() => { if (!boardFrozen) renderBoard(); Sync.pushSoon(); });

  let lastPull = 0;
  async function maybePull() {
    if (Date.now() - lastPull < 8000) return;
    if (!(await Sync.ensureReady(false))) return;
    lastPull = Date.now();
    Sync.pull();
  }
  async function refreshNow(manual) {
    if (!(await Sync.ensureReady(manual))) return;
    lastPull = Date.now();
    await Sync.pull();
    if (manual) toast("Atualizado");
  }
  window.addEventListener("focus", maybePull);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) maybePull(); });
  setInterval(() => {
    if (!document.hidden) maybePull();
  }, 20000);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "F5") return;
    e.preventDefault();
    refreshNow(true);
  });

  let pullStartY = null;
  let pullReady = false;
  window.addEventListener("touchstart", (e) => {
    if (window.scrollY <= 0 && e.touches.length === 1) {
      pullStartY = e.touches[0].clientY;
      pullReady = false;
    }
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (pullStartY == null || e.touches.length !== 1) return;
    pullReady = e.touches[0].clientY - pullStartY > 90 && window.scrollY <= 0;
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
    if (M) { try { await M.init(); await migrateOldMedia(); } catch (e) {} }
    renderBoard();
    if (D.available()) {
      Sync.setStatus(D.isConnected() ? "on" : (D.wasConnected() ? "ready" : "off"));
    } else Sync.setStatus("local");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    document.documentElement.dataset.appVersion = "21";
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
