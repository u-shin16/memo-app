// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  uid:             null,
  data:            null,
  templates:       [],
  templatePreviewId: null,
  mindMap:         null,
  mindMapList:     [],
  mindMapLoaded:   false,
  mindMapSelectedId: null,
  mindMapContextNodeId: null,
  mindMapContextLinkNodeId: null,
  mindMapUndoStack: [],
  mindMapEditSnapshot: null,
  isApplyingMindMapUndo: false,
  mindMapSaveTimer: null,
  mindMapZoom:     1,
  mindMapPanX:     0,
  mindMapPanY:     0,
  mindMapCentered: false,
  mindMapPanning:  null,
  mindMapNodeDrag: null,
  selectedId:      null,
  expanded:        new Set(),
  saveTimer:       null,
  contextNoteId:   null,
  isDraggingNote:  false,
  suppressTreeClickUntil: 0,
  mediaCmFigure:   null,
  pendingMediaCaretFigure: null,
  undoStack:       [],
  isApplyingUndo:  false,
};

const MAX_UNDO = 50;
const NO_SELECTION_MESSAGE = "メモを選択するか作成してください";

let _isComposing = false;
let _isMindMapNodeTitleComposing = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const els = {
  sidebar:          document.getElementById("sidebar"),
  mobileMenuBtn:   document.getElementById("mobileMenuBtn"),
  mobileMenuBackdrop: document.getElementById("mobileMenuBackdrop"),
  tree:             document.getElementById("tree"),
  noteCount:        document.getElementById("noteCount"),
  titleInput:       document.getElementById("titleInput"),
  contentInput:     document.getElementById("contentInput"),
  breadcrumb:       document.getElementById("breadcrumb"),
  selectedInfo:     document.getElementById("selectedInfo"),
  saveStatus:       document.getElementById("saveStatus"),
  searchInput:      document.getElementById("searchInput"),
  newRootBtn:       document.getElementById("newRootBtn"),
  mindMapBtn:       document.getElementById("mindMapBtn"),
  mindMapOverlay:   document.getElementById("mindMapOverlay"),
  mindMapClose:     document.getElementById("mindMapClose"),
  mindMapListBtn:   document.getElementById("mindMapListBtn"),
  mindMapListPanel: document.getElementById("mindMapListPanel"),
  mindMapListItems: document.getElementById("mindMapListItems"),
  mindMapContextMenu: document.getElementById("mindMapContextMenu"),
  mindMapLinkContextMenu: document.getElementById("mindMapLinkContextMenu"),
  mindMapLinkContextPalette: document.getElementById("mindMapLinkContextPalette"),
  mindMapTitleInput: document.getElementById("mindMapTitleInput"),
  mindMapUndoBtn:    document.getElementById("mindMapUndoBtn"),
  mindMapNewBtn:    document.getElementById("mindMapNewBtn"),
  mindMapSideNewBtn: document.getElementById("mindMapSideNewBtn"),
  mindMapAccountBtn: document.getElementById("mindMapAccountBtn"),
  mindMapAddChildBtn: document.getElementById("mindMapAddChildBtn"),
  mindMapAlignChildrenBtn: document.getElementById("mindMapAlignChildrenBtn"),
  mindMapDeleteNodeBtn: document.getElementById("mindMapDeleteNodeBtn"),
  mindMapCenterBtn: document.getElementById("mindMapCenterBtn"),
  mindMapNodeTitleInput: document.getElementById("mindMapNodeTitleInput"),
  mindMapNodeFillColorButton: document.getElementById("mindMapNodeFillColorButton"),
  mindMapNodeFillPalette: document.getElementById("mindMapNodeFillPalette"),
  mindMapNodeFillColorInput: document.getElementById("mindMapNodeFillColorInput"),
  mindMapNodeBorderColorButton: document.getElementById("mindMapNodeBorderColorButton"),
  mindMapNodeBorderPalette: document.getElementById("mindMapNodeBorderPalette"),
  mindMapNodeBorderColorInput: document.getElementById("mindMapNodeBorderColorInput"),
  mindMapLinkColorButton: document.getElementById("mindMapLinkColorButton"),
  mindMapLinkPalette: document.getElementById("mindMapLinkPalette"),
  mindMapLinkColorInput: document.getElementById("mindMapLinkColorInput"),
  mindMapZoomOutBtn: document.getElementById("mindMapZoomOutBtn"),
  mindMapZoomInBtn: document.getElementById("mindMapZoomInBtn"),
  mindMapZoomLabel: document.getElementById("mindMapZoomLabel"),
  mindMapStatus:    document.getElementById("mindMapStatus"),
  mindMapCanvas:    document.getElementById("mindMapCanvas"),
  mindMapScene:     document.getElementById("mindMapScene"),
  mindMapLinks:     document.getElementById("mindMapLinks"),
  mindMapNodes:     document.getElementById("mindMapNodes"),
  templatesBtn:     document.getElementById("templatesBtn"),
  templatesOverlay: document.getElementById("templatesOverlay"),
  templatesClose:   document.getElementById("templatesClose"),
  templatesList:    document.getElementById("templatesList"),
  templateNameInput: document.getElementById("templateNameInput"),
  templateSaveBtn:  document.getElementById("templateSaveBtn"),
  undoBtn:          document.getElementById("undoBtn"),
  checkBtn:         document.getElementById("checkBtn"),
  addChildBtn:      document.getElementById("addChildBtn"),
  mediaBtn:         document.getElementById("mediaBtn"),
  mediaInput:       document.getElementById("mediaInput"),
  deleteBtn:        document.getElementById("deleteBtn"),
  editorArea:       document.getElementById("editorArea"),
  toast:            document.getElementById("toast"),
  confirmOverlay:   document.getElementById("confirmOverlay"),
  contextMenu:      document.getElementById("contextMenu"),
  mediaContextMenu: document.getElementById("mediaContextMenu"),
  mediaSizeSection: document.getElementById("mediaSizeSection"),
  mediaTrimBtn:     document.getElementById("mediaTrimBtn"),
  // Lightbox
  lightboxOverlay:  document.getElementById("lightboxOverlay"),
  lightboxImg:      document.getElementById("lightboxImg"),
  lightboxClose:    document.getElementById("lightboxClose"),
  // Crop
  cropOverlay:      document.getElementById("cropOverlay"),
  cropCanvas:       document.getElementById("cropCanvas"),
  cropOk:           document.getElementById("cropOk"),
  cropCancel:       document.getElementById("cropCancel"),
  // Auth
  appShell:           document.querySelector(".app-shell"),
  authOverlay:        document.getElementById("authOverlay"),
  authDialog:         document.getElementById("authDialog"),
  authNotConfigured:  document.getElementById("authNotConfigured"),
  authFormWrap:       document.getElementById("authFormWrap"),
  authForm:           document.getElementById("authForm"),
  authTitle:          document.getElementById("authTitle"),
  authTabs:           document.querySelectorAll(".auth-tab"),
  authEmail:          document.getElementById("authEmail"),
  authPassword:       document.getElementById("authPassword"),
  authPasswordField:  document.getElementById("authPasswordField"),
  authShowPassword:   document.getElementById("authShowPassword"),
  authShowPasswordField: document.getElementById("authShowPasswordField"),
  authRemember:       document.getElementById("authRemember"),
  authRememberField:  document.getElementById("authRememberField"),
  authError:          document.getElementById("authError"),
  authInfo:           document.getElementById("authInfo"),
  authSubmitBtn:      document.getElementById("authSubmitBtn"),
  authForgotLink:     document.getElementById("authForgotLink"),
  authBackToLoginLink: document.getElementById("authBackToLoginLink"),
  authVerifyPanel:    document.getElementById("authVerifyPanel"),
  authVerifyEmail:    document.getElementById("authVerifyEmail"),
  authVerifyStatus:   document.getElementById("authVerifyStatus"),
  authVerifyResendBtn: document.getElementById("authVerifyResendBtn"),
  authVerifyRefreshBtn: document.getElementById("authVerifyRefreshBtn"),
  authVerifyLogoutBtn: document.getElementById("authVerifyLogoutBtn"),
  authVerifyDeleteBtn: document.getElementById("authVerifyDeleteBtn"),
  // Account menu
  accountBtn:            document.getElementById("accountBtn"),
  accountMenu:           document.getElementById("accountMenu"),
  accountMenuName:       document.getElementById("accountMenuName"),
  accountMenuEmail:      document.getElementById("accountMenuEmail"),
  accountMenuStatus:     document.getElementById("accountMenuStatus"),
  editDisplayNameBtn:    document.getElementById("editDisplayNameBtn"),
  displayNameEditRow:    document.getElementById("displayNameEditRow"),
  displayNameInput:      document.getElementById("displayNameInput"),
  displayNameSaveBtn:    document.getElementById("displayNameSaveBtn"),
  displayNameCancelBtn:  document.getElementById("displayNameCancelBtn"),
  resendVerificationBtn: document.getElementById("resendVerificationBtn"),
  refreshStatusBtn:      document.getElementById("refreshStatusBtn"),
  logoutBtn:             document.getElementById("logoutBtn"),
  deleteAccountBtn:      document.getElementById("deleteAccountBtn"),
};

// ── Firebase Auth ─────────────────────────────────────────────────────────────

const auth    = (window.FIREBASE_READY && typeof firebase !== "undefined") ? firebase.auth() : null;
const db      = (window.FIREBASE_READY && typeof firebase !== "undefined") ? firebase.firestore() : null;
const storage = (window.FIREBASE_READY && typeof firebase !== "undefined") ? firebase.storage() : null;
if (auth) auth.languageCode = "ja";

// Firebase Storage は現在Sparkプラン（無料）では利用できないため、
// Blazeプランへアップグレードするまでメディア機能（画像・動画の添付・トリミング）を無効化する。
const STORAGE_ENABLED = false;
if (!STORAGE_ENABLED) {
  els.mediaBtn.hidden = true;
  if (els.mediaTrimBtn) els.mediaTrimBtn.hidden = true;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2600);
}

const mobileMenuMql = window.matchMedia("(max-width: 860px)");

function isMobileMenuLayout() {
  return mobileMenuMql.matches;
}

function setMobileMenuOpen(open) {
  const shouldOpen = Boolean(open) && isMobileMenuLayout();
  els.appShell.classList.toggle("mobile-menu-open", shouldOpen);
  els.mobileMenuBackdrop.hidden = !shouldOpen;
  document.body.classList.toggle("has-mobile-menu-open", shouldOpen);
  els.mobileMenuBtn.setAttribute("aria-expanded", String(shouldOpen));
  els.mobileMenuBtn.setAttribute(
    "aria-label",
    shouldOpen ? "メモ一覧を閉じる" : "メモ一覧を開く"
  );
  els.mobileMenuBtn.title = shouldOpen ? "メモ一覧を閉じる" : "メモ一覧を開く";

  const icon = els.mobileMenuBtn.querySelector(".mobile-menu-icon");
  if (icon) icon.textContent = shouldOpen ? "×" : "☰";
}

function toggleMobileMenu() {
  setMobileMenuOpen(!els.appShell.classList.contains("mobile-menu-open"));
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function suppressTreeClickAfterDrag() {
  state.suppressTreeClickUntil = Date.now() + 700;
}

function shouldSuppressTreeClick() {
  return Date.now() < state.suppressTreeClickUntil;
}

function isTreeToggleClick(e, row, toggle, hasKids) {
  if (!hasKids) return false;
  if (e.target === toggle || toggle.contains(e.target)) return true;
  if (!isMobileMenuLayout()) return false;

  const rowRect = row.getBoundingClientRect();
  const toggleRect = toggle.getBoundingClientRect();
  const hitRight = Math.max(toggleRect.right, rowRect.left + 56);
  return e.clientX >= rowRect.left && e.clientX <= hitRight;
}

function setButtonContent(button, icon, label = "") {
  if (!button) return;
  button.innerHTML = `<span class="btn-icon" aria-hidden="true">${icon}</span>` +
                     (label ? `<span class="btn-label">${label}</span>` : "");
}

function isImeComposing(e, localFlag = false) {
  return Boolean(localFlag || e?.isComposing || e?.keyCode === 229);
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

let _confirmResolve = null;

function showConfirm(message, okLabel = "削除") {
  document.getElementById("confirmMsg").textContent = message;
  document.getElementById("confirmOk").textContent  = okLabel;
  els.confirmOverlay.classList.add("open");
  requestAnimationFrame(() => document.getElementById("confirmOk").focus());
  return new Promise(r => { _confirmResolve = r; });
}

function resolveConfirm(result) {
  els.confirmOverlay.classList.remove("open");
  if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(result); }
}

(function initConfirmModal() {
  document.getElementById("confirmOk")    .addEventListener("click", () => resolveConfirm(true));
  document.getElementById("confirmCancel").addEventListener("click", () => resolveConfirm(false));
  els.confirmOverlay.addEventListener("click", e => {
    if (e.target === els.confirmOverlay) resolveConfirm(false);
  });
})();

// ── ローカルヘルパー（ID・日時・コレクション参照）──────────────────────────────────

function makeId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

function nowIso() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function nowSortableIso() {
  return new Date().toISOString();
}

function notesCollection() {
  return db.collection("users").doc(state.uid).collection("notes");
}

function templatesCollection() {
  return db.collection("users").doc(state.uid).collection("templates");
}

function mindMapsCollection() {
  return db.collection("users").doc(state.uid).collection("mindmaps");
}

// ── 階層・並び順ヘルパー ─────────────────────────────────────────────────────────

function wouldCreateCycle(notes, noteId, newParentId) {
  if (newParentId === null) return false;
  let current = newParentId;
  while (current !== null) {
    if (current === noteId) return true;
    const parent = notes.find(n => n.id === current);
    current = parent ? parent.parent_id : null;
  }
  return false;
}

const ORDER_EPSILON = 1e-9;

function siblingsOf(parentId, excludeId = null) {
  return getChildren(parentId).filter(n => n.id !== excludeId);
}

function nextOrderForNewNote(parentId) {
  const siblings = siblingsOf(parentId);
  return siblings.length > 0 ? (siblings[siblings.length - 1].order ?? 0) + 1000 : 1000;
}

async function renumberSiblings(parentId) {
  const siblings = siblingsOf(parentId);
  const batch = db.batch();
  const ref   = notesCollection();
  siblings.forEach((n, i) => {
    const order = (i + 1) * 1000;
    n.order = order;
    batch.set(ref.doc(n.id), { order }, { merge: true });
  });
  await batch.commit();
}

async function orderForReorder(noteId, beforeId, parentId) {
  const siblings = siblingsOf(parentId, noteId);
  let order;

  if (!beforeId) {
    order = siblings.length > 0 ? (siblings[siblings.length - 1].order ?? 0) + 1000 : 1000;
  } else {
    const idx = siblings.findIndex(n => n.id === beforeId);
    if (idx === -1) {
      order = siblings.length > 0 ? (siblings[siblings.length - 1].order ?? 0) + 1000 : 1000;
    } else if (idx === 0) {
      order = (siblings[0].order ?? 1000) / 2;
    } else {
      order = ((siblings[idx - 1].order ?? 0) + (siblings[idx].order ?? 0)) / 2;
    }
  }

  const collides = siblings.some(n => Math.abs((n.order ?? 0) - order) < ORDER_EPSILON);
  if (collides) {
    await renumberSiblings(parentId);
    return orderForReorder(noteId, beforeId, parentId);
  }
  return order;
}

// ── テンプレートヘルパー ─────────────────────────────────────────────────────────

const OFFICIAL_TEMPLATE_TIMESTAMP    = "2026-06-10T00:00:00";
const RETIRED_OFFICIAL_TEMPLATE_IDS  = new Set(["official-todo", "official-diary"]);

const OFFICIAL_TEMPLATES = [
  {
    id:         "official-dev-note",
    name:       "開発メモ",
    official:   true,
    created_at: OFFICIAL_TEMPLATE_TIMESTAMP,
    updated_at: OFFICIAL_TEMPLATE_TIMESTAMP,
    tree: {
      title:    "開発メモ",
      content:  "開発中のアイデア、実装、改善案をまとめるテンプレートです。",
      children: [
        { title: "アイデア",     content: "今後実装したいものや、思いついたことを書き留めます。", children: [] },
        { title: "実装メモ",     content: "作業した内容、判断したこと、参考リンクを残します。", children: [] },
        { title: "改善案",       content: "使いにくい点や、直したい挙動を書き留めます。", children: [] },
        { title: "不具合",       content: "再現手順、期待する動き、実際の動きをまとめます。", children: [] },
        { title: "リリースメモ", content: "公開前に確認することや、変更点をまとめます。", children: [] },
      ],
    },
  },
];

function countTemplateNodes(node) {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countTemplateNodes(c), 0);
}

function buildTemplateTree(notes, noteId) {
  const note     = notes.find(n => n.id === noteId);
  const children = notes
    .filter(n => n.parent_id === noteId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    title:    note.title,
    content:  note.content,
    children: children.map(c => buildTemplateTree(notes, c.id)),
  };
}

function createNotesFromTemplate(node, parentId, order) {
  const id = makeId();
  const ts = nowIso();
  const note = {
    id,
    parent_id:   parentId,
    title:       String(node.title || "新しいメモ").slice(0, 120),
    content:     String(node.content || ""),
    created_at:  ts,
    updated_at:  ts,
    source_file: null,
    media:       [],
    pinned:      false,
    checked:     false,
    checked_at:  null,
    order,
  };
  const created = [note];
  (node.children ?? []).forEach((child, i) => {
    created.push(...createNotesFromTemplate(child, id, (i + 1) * 1000));
  });
  return created;
}

async function ensureOfficialTemplates(uid) {
  const ref   = db.collection("users").doc(uid).collection("templates");
  const snap  = await ref.get();
  const byId  = new Map();
  const batch = db.batch();
  let hasWrites = false;

  snap.docs.forEach(doc => {
    if (RETIRED_OFFICIAL_TEMPLATE_IDS.has(doc.id)) {
      batch.delete(doc.ref);
      hasWrites = true;
      return;
    }
    byId.set(doc.id, { id: doc.id, ...doc.data() });
  });

  for (const official of OFFICIAL_TEMPLATES) {
    const current = byId.get(official.id);
    if (!current) {
      batch.set(ref.doc(official.id), official);
      byId.set(official.id, { ...official });
      hasWrites = true;
      continue;
    }
    const updates = {};
    for (const key of ["name", "official", "tree"]) {
      if (JSON.stringify(current[key]) !== JSON.stringify(official[key])) {
        updates[key] = official[key];
      }
    }
    if (current.created_at === undefined) updates.created_at = official.created_at;
    if (current.updated_at !== official.updated_at) updates.updated_at = official.updated_at;
    if (Object.keys(updates).length > 0) {
      batch.update(ref.doc(official.id), updates);
      Object.assign(current, updates);
      hasWrites = true;
    }
  }

  if (hasWrites) await batch.commit();
  return [...byId.values()];
}

// ── 一括削除（アカウント削除）────────────────────────────────────────────────────

async function deleteCollectionInBatches(ref, batchSize = 500) {
  for (;;) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < batchSize) return;
  }
}

async function deleteStoragePrefix(prefix) {
  const ref = storage.ref(prefix);
  let pageToken;
  do {
    const res = await ref.list({ maxResults: 1000, pageToken });
    await Promise.all(res.items.map(item => item.delete().catch(() => {})));
    pageToken = res.nextPageToken;
  } while (pageToken);
}

// ── メディアヘルパー ─────────────────────────────────────────────────────────────

function pruneOrphanedMedia(note, newContent) {
  const kept = [];
  for (const item of (note.media ?? [])) {
    if (item.downloadURL && newContent.includes(item.downloadURL)) {
      kept.push(item);
    } else if (item.storagePath && STORAGE_ENABLED) {
      storage.ref(item.storagePath).delete().catch(() => {});
    }
  }
  return kept;
}

// ── Note helpers ──────────────────────────────────────────────────────────────

function getNotes()        { return state.data?.notes ?? []; }
function getSelectedNote() { return getNotes().find(n => n.id === state.selectedId) ?? null; }
function getChildren(pid) {
  return getNotes()
    .filter(n => n.parent_id === pid)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getParentChain(note) {
  const chain = [];
  let cur = note;
  while (cur) {
    chain.unshift(cur.title);
    cur = getNotes().find(n => n.id === cur.parent_id) ?? null;
  }
  return chain;
}

function matchesSearch(note, q) {
  if (!q) return true;
  const lq = q.toLowerCase();
  if (note.title.toLowerCase().includes(lq) || note.content.toLowerCase().includes(lq)) return true;
  return getChildren(note.id).some(c => matchesSearch(c, q));
}

function countDescendants(noteId) {
  const children = getChildren(noteId);
  return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
}

function checkedTimestampValue(note) {
  const value = note.checked_at;
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
  if (typeof value === "number") return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") {
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6);
  }
  return 0;
}

function orderTreeChildren(parentId, children) {
  return [...children].sort((a, b) => {
    if (parentId === null) {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) return pinDiff;
    }
    const checkDiff = Number(Boolean(b.checked)) - Number(Boolean(a.checked));
    if (checkDiff !== 0) return checkDiff;
    if (a.checked && b.checked) {
      const checkedAtDiff = checkedTimestampValue(b) - checkedTimestampValue(a);
      if (checkedAtDiff !== 0) return checkedAtDiff;
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

function createTreeRenderContext(q) {
  const childrenByParent = new Map();
  getNotes().forEach(note => {
    const key = note.parent_id ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(note);
  });

  const query = q.toLowerCase();
  const matchMemo = new Map();
  const countMemo = new Map();

  function childrenOf(parentId) {
    const key = parentId ?? null;
    return orderTreeChildren(key, childrenByParent.get(key) ?? []);
  }

  function matches(note) {
    if (!query) return true;
    if (matchMemo.has(note.id)) return matchMemo.get(note.id);
    const title = String(note.title ?? "").toLowerCase();
    const content = String(note.content ?? "").toLowerCase();
    const result = title.includes(query) ||
                   content.includes(query) ||
                   childrenOf(note.id).some(child => matches(child));
    matchMemo.set(note.id, result);
    return result;
  }

  function descendantCount(noteId) {
    if (countMemo.has(noteId)) return countMemo.get(noteId);
    const total = childrenOf(noteId).reduce(
      (sum, child) => sum + 1 + descendantCount(child.id),
      0,
    );
    countMemo.set(noteId, total);
    return total;
  }

  return { childrenOf, descendantCount, hasQuery: query.length > 0, matches };
}

function clearTreeDropHighlights() {
  document.querySelectorAll(".tree-insert-zone.drag-target, .tree-row.drag-target, .tree-row.drag-before")
    .forEach(el => el.classList.remove("drag-target", "drag-before"));
}

function isSameTreePosition(noteId, parentId, beforeId) {
  if (noteId === beforeId) return true;

  const normalizedParentId = parentId ?? null;
  const moving = getNotes().find(n => n.id === noteId);
  if (!moving || moving.parent_id !== normalizedParentId) return false;

  const siblings = getChildren(normalizedParentId);
  const orderedSiblings = orderTreeChildren(normalizedParentId, siblings);
  const currentIndex = orderedSiblings.findIndex(n => n.id === noteId);
  if (currentIndex < 0) return false;

  if (!beforeId) return currentIndex === orderedSiblings.length - 1;
  return orderedSiblings[currentIndex + 1]?.id === beforeId;
}

function firstSiblingId(noteId, parentId) {
  return getChildren(parentId ?? null).find(note => note.id !== noteId)?.id ?? null;
}

function normalizeTreeDropTarget(noteId, parentId, beforeId, options = {}) {
  const normalizedParentId = parentId ?? null;
  return {
    parentId: normalizedParentId,
    beforeId: beforeId ?? null,
    stayedWithParent: Boolean(options.stayedWithParent),
  };
}

async function moveNoteToTreePosition(noteId, parentId, beforeId, options = {}) {
  if (!noteId) return;
  const target = normalizeTreeDropTarget(noteId, parentId, beforeId, options);
  if (isSameTreePosition(noteId, target.parentId, target.beforeId)) return;

  const moving = getNotes().find(n => n.id === noteId);
  const parentChanged = moving?.parent_id !== target.parentId;
  const wasSelected = state.selectedId === noteId;

  try {
    await reorderNote(noteId, target.beforeId, target.parentId);
    if (target.parentId) state.expanded.add(target.parentId);
    if (isMobileMenuLayout()) {
      renderTree();
      if (wasSelected) renderEditor();
    } else {
      selectNote(noteId);
    }
    showToast(target.stayedWithParent ? "同じ親メモ内で並び替えました。" :
              parentChanged ? "メモを移動しました。" : "並び替えました。");
  } catch (e) { showToast(e.message); }
}

async function moveNoteToSiblingEdge(noteId, edge) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;
  const parentId = note.parent_id ?? null;
  const beforeId = edge === "start" ? firstSiblingId(noteId, parentId) : null;
  await moveNoteToTreePosition(noteId, parentId, beforeId, { stayedWithParent: true });
}

function createTreeInsertZone(parentId, beforeId) {
  const zone = document.createElement("div");
  zone.className = "tree-insert-zone";
  zone.title = "ここに並び替え";

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    clearTreeDropHighlights();
    zone.classList.add("drag-target");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-target"));
  zone.addEventListener("drop", async e => {
    e.preventDefault();
    e.stopPropagation();
    suppressTreeClickAfterDrag();
    const id = e.dataTransfer.getData("text/plain");
    clearTreeDropHighlights();
    await moveNoteToTreePosition(id, parentId, beforeId);
  });

  return zone;
}

// ── ドラッグ中のサイドバー自動スクロール ──────────────────────────────────────

const TREE_AUTOSCROLL_EDGE      = 48;
const TREE_AUTOSCROLL_MAX_SPEED = 16;

let treeAutoScrollRAF   = null;
let treeAutoScrollDelta = 0;

function stopTreeAutoScroll() {
  treeAutoScrollDelta = 0;
  if (treeAutoScrollRAF !== null) {
    cancelAnimationFrame(treeAutoScrollRAF);
    treeAutoScrollRAF = null;
  }
}

function tickTreeAutoScroll() {
  if (treeAutoScrollDelta === 0) { treeAutoScrollRAF = null; return; }
  els.tree.scrollTop += treeAutoScrollDelta;
  treeAutoScrollRAF = requestAnimationFrame(tickTreeAutoScroll);
}

els.tree.addEventListener("dragover", e => {
  const rect   = els.tree.getBoundingClientRect();
  const top    = e.clientY - rect.top;
  const bottom = rect.bottom - e.clientY;

  if (top < TREE_AUTOSCROLL_EDGE) {
    const ratio = Math.max(0, Math.min(1, 1 - top / TREE_AUTOSCROLL_EDGE));
    treeAutoScrollDelta = -Math.ceil(TREE_AUTOSCROLL_MAX_SPEED * ratio);
  } else if (bottom < TREE_AUTOSCROLL_EDGE) {
    const ratio = Math.max(0, Math.min(1, 1 - bottom / TREE_AUTOSCROLL_EDGE));
    treeAutoScrollDelta = Math.ceil(TREE_AUTOSCROLL_MAX_SPEED * ratio);
  } else {
    treeAutoScrollDelta = 0;
  }

  if (treeAutoScrollDelta !== 0 && treeAutoScrollRAF === null) {
    treeAutoScrollRAF = requestAnimationFrame(tickTreeAutoScroll);
  }
}, { capture: true });

els.tree.addEventListener("dragleave", e => {
  if (!els.tree.contains(e.relatedTarget)) stopTreeAutoScroll();
}, { capture: true });

// ── コンテンツ変換 ─────────────────────────────────────────────────────────────

function contentToHtml(content) {
  if (!content) return "";
  if (/<(img|video|figure|div|p|br|span)\b/i.test(content)) return content;
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function getContentHtml() { return els.contentInput.innerHTML ?? ""; }

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotFromNote(note) {
  if (!note) return null;
  return {
    noteId: note.id,
    title: note.title ?? "",
    content: note.content ?? "",
  };
}

function snapshotFromEditor(noteId) {
  if (!noteId) return null;
  return {
    noteId,
    title: els.titleInput.value,
    content: getContentHtml(),
  };
}

function snapshotDeletedNotes(noteId) {
  const deleteIds = new Set([noteId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const note of getNotes()) {
      if (deleteIds.has(note.parent_id) && !deleteIds.has(note.id)) {
        deleteIds.add(note.id);
        changed = true;
      }
    }
  }

  return {
    kind: "delete",
    noteId,
    insertIndex: getNotes().findIndex(n => n.id === noteId),
    notes: cloneData(getNotes().filter(n => deleteIds.has(n.id))),
  };
}

function snapshotsEqual(a, b) {
  return !!a && !!b &&
    a.noteId === b.noteId &&
    a.title === b.title &&
    a.content === b.content;
}

function hasUnsavedEditorChange() {
  const note = getSelectedNote();
  if (!note) return false;
  return !snapshotsEqual(snapshotFromEditor(note.id), snapshotFromNote(note));
}

function updateUndoButton() {
  if (!els.undoBtn) return;
  els.undoBtn.disabled = state.undoStack.length === 0 && !hasUnsavedEditorChange();
}

function undoEntriesEqual(a, b) {
  if (!a || !b) return false;
  const ak = a.kind ?? "edit";
  const bk = b.kind ?? "edit";
  if (ak !== bk) return false;
  if (ak === "delete") return a.noteId === b.noteId && a.notes?.length === b.notes?.length;
  return snapshotsEqual(a, b);
}

function pushUndoSnapshot(entry) {
  if (!entry?.noteId) return;
  const last = state.undoStack[state.undoStack.length - 1];
  if (undoEntriesEqual(last, entry)) return;
  state.undoStack.push(entry);
  if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
  updateUndoButton();
}

function expandAncestors(note) {
  let parentId = note?.parent_id ?? null;
  while (parentId) {
    state.expanded.add(parentId);
    const parent = getNotes().find(n => n.id === parentId);
    parentId = parent?.parent_id ?? null;
  }
}

async function applyUndoSnapshot(snapshot) {
  const note = getNotes().find(n => n.id === snapshot.noteId);
  if (!note) {
    showToast("戻す対象のメモが見つかりません。");
    updateUndoButton();
    return;
  }

  clearTimeout(state.saveTimer);
  state.isApplyingUndo = true;
  try {
    state.selectedId = snapshot.noteId;
    expandAncestors(note);
    els.titleInput.value = snapshot.title;
    els.contentInput.innerHTML = snapshot.content;
    updateEmptyState();

    const upd = await updateNote(snapshot.noteId, {
      title:   snapshot.title,
      content: snapshot.content,
    }, false);
    const idx = state.data.notes.findIndex(n => n.id === upd.id);
    if (idx >= 0) state.data.notes[idx] = upd;
    renderTree();
    renderEditor();
    els.saveStatus.textContent = `戻しました ${upd.updated_at}`;
    showToast("一つ前に戻しました。");
  } catch (e) {
    showToast("戻せませんでした: " + e.message);
  } finally {
    state.isApplyingUndo = false;
    updateUndoButton();
  }
}

async function restoreDeletedNotes(snapshot) {
  state.isApplyingUndo = true;
  try {
    const batch = db.batch();
    const ref   = notesCollection();
    for (const note of snapshot.notes) {
      batch.set(ref.doc(note.id), note);
    }
    await batch.commit();
    state.data.notes.push(...cloneData(snapshot.notes));
    state.selectedId = snapshot.noteId;
    selectNote(snapshot.noteId);
    showToast("削除したメモを復元しました。");
  } catch (e) {
    showToast("復元できませんでした: " + e.message);
  } finally {
    state.isApplyingUndo = false;
    updateUndoButton();
  }
}

async function undoLastChange() {
  const note = getSelectedNote();
  if (note) {
    const saved = snapshotFromNote(note);
    const current = snapshotFromEditor(note.id);
    if (!snapshotsEqual(current, saved)) {
      await applyUndoSnapshot(saved);
      return;
    }
  }

  let snapshot = state.undoStack.pop();
  while (snapshot && (snapshot.kind ?? "edit") !== "delete" &&
         !getNotes().some(n => n.id === snapshot.noteId)) {
    snapshot = state.undoStack.pop();
  }

  if (!snapshot) {
    updateUndoButton();
    showToast("戻せる変更がありません。");
    return;
  }

  if ((snapshot.kind ?? "edit") === "delete") {
    await restoreDeletedNotes(snapshot);
  } else {
    await applyUndoSnapshot(snapshot);
  }
}

function updateEmptyState() {
  const text = els.contentInput.textContent.replace(/\u200b/g, "").trim();
  const empty = !text &&
                !els.contentInput.querySelector("img, video");
  els.contentInput.classList.toggle("is-empty", empty);
  els.contentInput.classList.toggle("is-focused", document.activeElement === els.contentInput);
}

// ── Tree render ───────────────────────────────────────────────────────────────

function renderTree() {
  const q = els.searchInput.value.trim();
  const treeCtx = createTreeRenderContext(q);
  els.tree.innerHTML = "";
  els.noteCount.textContent = `${getNotes().length}件`;

  treeCtx.childrenOf(null).forEach(note => {
    const node = renderNode(note, treeCtx);
    if (node) {
      els.tree.appendChild(createTreeInsertZone(null, note.id));
      els.tree.appendChild(node);
    }
  });
  els.tree.appendChild(createTreeInsertZone(null, null));
}

function renderNode(note, treeCtx) {
  if (!treeCtx.matches(note)) return null;

  const children  = treeCtx.childrenOf(note.id);
  const hasKids   = children.length > 0;
  const expanded  = state.expanded.has(note.id) || treeCtx.hasQuery;
  const descCount = treeCtx.descendantCount(note.id);

  const wrapper = document.createElement("div");
  wrapper.className = "tree-node";

  const row = document.createElement("button");
  row.className  = `tree-row${note.id === state.selectedId ? " active" : ""}${note.pinned ? " pinned" : ""}${note.checked ? " checked" : ""}`;
  row.draggable  = true;
  row.dataset.id = note.id;

  const toggle = document.createElement("span");
  toggle.className   = "toggle";
  toggle.textContent = hasKids ? (expanded ? "▼" : "▶") : "•";

  const titleWrap = document.createElement("span");
  titleWrap.className = "tree-title-wrap";

  if (note.pinned && note.parent_id === null) {
    const pinIcon = document.createElement("span");
    pinIcon.className = "tree-pin";
    pinIcon.textContent = "📌";
    pinIcon.title = "ピン留め中";
    titleWrap.appendChild(pinIcon);
  }

  if (note.checked) {
    const checkIcon = document.createElement("span");
    checkIcon.className = "tree-check";
    checkIcon.textContent = "✅";
    checkIcon.title = "チェック済み";
    titleWrap.appendChild(checkIcon);
  }

  const title = document.createElement("span");
  title.className   = "tree-title";
  title.textContent = note.title || "無題";
  titleWrap.appendChild(title);

  row.append(toggle, titleWrap);

  if (descCount > 0) {
    const badge = document.createElement("span");
    badge.className   = "tree-count-badge";
    badge.textContent = descCount;
    row.appendChild(badge);
  }

  const addBtn = document.createElement("span");
  addBtn.className   = "tree-add";
  addBtn.title       = "このメモに子メモを追加";
  setButtonContent(addBtn, "＋");
  row.appendChild(addBtn);

  row.addEventListener("click", e => {
    if (shouldSuppressTreeClick()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (addBtn.contains(e.target)) { e.stopPropagation(); createNote(note.id); return; }
    if (isTreeToggleClick(e, row, toggle, hasKids)) {
      e.stopPropagation();
      state.expanded.has(note.id) ? state.expanded.delete(note.id) : state.expanded.add(note.id);
      renderTree(); return;
    }
    selectNote(note.id);
  });

  row.addEventListener("contextmenu", e => {
    e.preventDefault(); e.stopPropagation();
    showCtxMenu(e.clientX, e.clientY, note.id);
  });

  row.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", note.id);
    document.body.classList.add("is-dragging");
    state.isDraggingNote = true;
  });
  row.addEventListener("dragend", () => {
    document.body.classList.remove("is-dragging");
    state.isDraggingNote = false;
    suppressTreeClickAfterDrag();
    row.classList.remove("drag-target", "drag-before");
    stopTreeAutoScroll();
  });
  row.addEventListener("dragover", e => {
    e.preventDefault();
    clearTreeDropHighlights();
    const rect  = row.getBoundingClientRect();
    const upper = e.clientY < rect.top + rect.height * 0.38;
    row.classList.toggle("drag-before", upper);
    row.classList.toggle("drag-target",  !upper);
  });
  row.addEventListener("dragleave", () => {
    row.classList.remove("drag-target", "drag-before");
  });
  row.addEventListener("drop", async e => {
    e.preventDefault();
    suppressTreeClickAfterDrag();
    const isBefore = row.classList.contains("drag-before");
    row.classList.remove("drag-target", "drag-before");
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === note.id) return;
    try {
      if (isBefore) {
        await moveNoteToTreePosition(id, note.parent_id, note.id);
      } else {
        await moveNoteToTreePosition(id, note.id, null);
      }
    } catch (err) { showToast(err.message); }
  });

  wrapper.appendChild(row);

  if (hasKids && expanded) {
    const area = document.createElement("div");
    area.className = "tree-children";
    children.forEach(c => {
      const n = renderNode(c, treeCtx);
      if (n) {
        area.appendChild(createTreeInsertZone(note.id, c.id));
        area.appendChild(n);
      }
    });
    area.appendChild(createTreeInsertZone(note.id, null));
    wrapper.appendChild(area);
  }

  return wrapper;
}

// ── Editor render ─────────────────────────────────────────────────────────────

function renderEditor() {
  const note = getSelectedNote();
  if (!note) {
    els.titleInput.value         = "";
    els.titleInput.placeholder   = NO_SELECTION_MESSAGE;
    els.titleInput.readOnly      = true;
    els.contentInput.innerHTML   = "";
    els.contentInput.contentEditable = "false";
    els.contentInput.dataset.placeholder = NO_SELECTION_MESSAGE;
    els.breadcrumb.textContent   = NO_SELECTION_MESSAGE;
    els.selectedInfo.textContent = "";
    els.checkBtn.disabled = true;
    els.checkBtn.classList.remove("active");
    els.checkBtn.title = "チェックを付ける";
    setButtonContent(els.checkBtn, "✓");
    updateEmptyState();
    updateUndoButton();
    return;
  }
  els.checkBtn.disabled = false;
  els.checkBtn.classList.toggle("active", Boolean(note.checked));
  els.checkBtn.title = note.checked ? "チェックを外す" : "チェックを付ける";
  setButtonContent(els.checkBtn, "✓");
  els.contentInput.dataset.placeholder = "ここにメモを書いてください";
  els.contentInput.contentEditable = "true";
  els.titleInput.placeholder = "タイトル";
  els.titleInput.readOnly = false;
  els.titleInput.value = note.title;

  let html = contentToHtml(note.content);

  // 旧 media 配列 → インライン figure に変換（一度 content に書き込まれるとスキップ）
  for (const item of (note.media ?? [])) {
    if (!item.downloadURL || html.includes(item.downloadURL)) continue;
    const url     = item.downloadURL;
    const isVideo = (item.mime_type || "").startsWith("video/") ||
                    /\.(mp4|mov|avi|webm|m4v|mkv)$/i.test(item.filename || "");
    const alt     = (item.original_name || "").replace(/"/g, "&quot;");
    html += isVideo
      ? `<figure class="inline-media-figure" contenteditable="false" draggable="false">` +
        `<video src="${url}" class="inline-media" controls preload="metadata" draggable="false"></video></figure>`
      : `<figure class="inline-media-figure" contenteditable="false" draggable="false">` +
        `<img src="${url}" alt="${alt}" class="inline-media" draggable="false"></figure>`;
  }

  els.contentInput.innerHTML = html;
  ensureMediaTextLines();
  els.breadcrumb.textContent = getParentChain(note).join(" / ");
  const src = note.source_file ? ` / 読み込み元: ${note.source_file}` : "";
  els.selectedInfo.textContent = `作成: ${note.created_at} / 更新: ${note.updated_at}${src}`;
  els.saveStatus.textContent   = "保存済み";
  updateEmptyState();
  updateUndoButton();
}

function selectNote(id) {
  state.selectedId = id;
  renderTree();
  renderEditor();
  closeMobileMenu();
}

async function saveCurrentEditorNow() {
  if (_isComposing || state.isApplyingUndo) return;
  const note = getSelectedNote();
  if (!note) return;

  clearTimeout(state.saveTimer);
  const before = snapshotFromNote(note);
  const next = snapshotFromEditor(note.id);
  if (snapshotsEqual(before, next)) return;

  pushUndoSnapshot(before);
  const upd = await updateNote(note.id, {
    title:   next.title,
    content: next.content,
  }, false);
  const idx = state.data.notes.findIndex(n => n.id === upd.id);
  if (idx >= 0) state.data.notes[idx] = upd;
  els.saveStatus.textContent = `保存済み ${upd.updated_at}`;
}

// ── Note CRUD ─────────────────────────────────────────────────────────────────

async function loadNotes() {
  const snap = await notesCollection().get();
  state.data = { notes: snap.docs.map(d => ({ ...d.data(), id: d.id })) };
  if (!state.selectedId || !getSelectedNote()) {
    const roots = getNotes().filter(n => n.parent_id === null);
    state.selectedId = roots.length > 0 ? roots[0].id : null;
  }
  renderTree();
  renderEditor();
}

async function createNote(parentId) {
  try {
    const pid = parentId ?? null;
    const ts  = nowIso();
    const note = {
      id:          makeId(),
      parent_id:   pid,
      title:       "新しいメモ",
      content:     "",
      created_at:  ts,
      updated_at:  ts,
      source_file: null,
      media:       [],
      pinned:      false,
      checked:     false,
      checked_at:  null,
      order:       nextOrderForNewNote(pid),
    };
    await notesCollection().doc(note.id).set(note);
    state.data.notes.push(note);
    if (parentId) state.expanded.add(parentId);
    selectNote(note.id);
    els.titleInput.focus(); els.titleInput.select();
    showToast("メモを追加しました。");
  } catch (e) { showToast(e.message); }
}

async function updateNote(id, payload, reload = true) {
  const note = state.data.notes.find(n => n.id === id);
  if (!note) throw new Error("メモが見つかりません。");

  const updates = {};

  if ("title" in payload) {
    const title = String(payload.title ?? "").slice(0, 120);
    updates.title = title || "無題";
  }

  if ("content" in payload) {
    const content = String(payload.content ?? "");
    updates.content = content;
    updates.media = pruneOrphanedMedia(note, content);
  }

  if ("parent_id" in payload) {
    const newParentId = payload.parent_id;
    if (newParentId !== null && !getNotes().find(n => n.id === newParentId)) {
      throw new Error("移動先のメモが見つかりません。");
    }
    if (wouldCreateCycle(getNotes(), id, newParentId)) {
      throw new Error("自分自身の下には移動できません。");
    }
    updates.parent_id = newParentId;
    if (newParentId !== null) updates.pinned = false;
  }

  if ("pinned" in payload) {
    const pinned = Boolean(payload.pinned);
    const parentId = "parent_id" in updates ? updates.parent_id : note.parent_id;
    if (pinned && parentId !== null) {
      throw new Error("ピン留めできるのは最上位メモだけです。");
    }
    updates.pinned = pinned;
  }

  if ("checked" in payload) {
    const checked = Boolean(payload.checked);
    updates.checked = checked;
    updates.checked_at = checked ? nowSortableIso() : null;
  }

  updates.updated_at = nowIso();

  await notesCollection().doc(id).set(updates, { merge: true });
  Object.assign(note, updates);

  if (reload) {
    renderTree(); renderEditor();
  }
  return note;
}

async function reorderNote(noteId, beforeId, parentId) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) throw new Error("メモが見つかりません。");
  if (beforeId === noteId) return note;

  if (parentId !== null && !getNotes().find(n => n.id === parentId)) {
    throw new Error("移動先のメモが見つかりません。");
  }
  if (beforeId) {
    const beforeNote = getNotes().find(n => n.id === beforeId);
    if (!beforeNote) throw new Error("挿入先のメモが見つかりません。");
    if (beforeNote.parent_id !== parentId) {
      throw new Error("同じ階層の間にのみ並び替えできます。");
    }
  }
  if (wouldCreateCycle(getNotes(), noteId, parentId)) {
    throw new Error("自分自身の下には移動できません。");
  }

  const order = await orderForReorder(noteId, beforeId, parentId);
  const updates = {
    parent_id:  parentId,
    order,
    updated_at: nowIso(),
  };
  if (parentId !== null) updates.pinned = false;

  await notesCollection().doc(noteId).set(updates, { merge: true });
  Object.assign(note, updates);
  return note;
}

async function togglePinnedNote(noteId) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;
  if (note.parent_id !== null) {
    showToast("ピン留めできるのは最上位メモだけです。");
    return;
  }

  const nextPinned = !Boolean(note.pinned);
  try {
    await updateNote(noteId, { pinned: nextPinned });
    selectNote(noteId);
    showToast(nextPinned ? "ピン留めしました。" : "ピン留めを解除しました。");
  } catch (e) { showToast(e.message); }
}

async function toggleCheckedNote(noteId) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;

  const nextChecked = !Boolean(note.checked);
  try {
    await updateNote(noteId, { checked: nextChecked });
    selectNote(noteId);
    showToast(nextChecked ? "チェックを付けました。" : "チェックを外しました。");
  } catch (e) { showToast(e.message); }
}

function scheduleSave() {
  if (_isComposing || state.isApplyingUndo) return;
  const note = getSelectedNote();
  if (!note) return;
  clearTimeout(state.saveTimer);
  els.saveStatus.textContent = "編集中...";
  updateUndoButton();
  state.saveTimer = setTimeout(async () => {
    if (_isComposing || state.isApplyingUndo) return;
    try {
      const before = snapshotFromNote(note);
      const next = snapshotFromEditor(note.id);
      if (snapshotsEqual(before, next)) {
        els.saveStatus.textContent = "保存済み";
        updateUndoButton();
        return;
      }
      pushUndoSnapshot(before);
      const upd = await updateNote(note.id, {
        title:   next.title,
        content: next.content,
      }, false);
      const idx = state.data.notes.findIndex(n => n.id === upd.id);
      if (idx >= 0) state.data.notes[idx] = upd;
      renderTree();
      els.saveStatus.textContent = `保存済み ${upd.updated_at}`;
      updateUndoButton();
    } catch (e) { els.saveStatus.textContent = "保存失敗"; showToast(e.message); }
  }, 600);
}

async function deleteSelectedNote() {
  const note = getSelectedNote();
  if (!note) return;
  const ok = await showConfirm(`「${note.title}」とその子メモを削除しますか？`);
  if (!ok) return;
  try {
    await saveCurrentEditorNow();
    const target = getSelectedNote();
    if (!target) return;
    const parentId = target.parent_id;
    const deleteSnapshot = snapshotDeletedNotes(target.id);
    const deleteIds = deleteSnapshot.notes.map(n => n.id);

    const ref = notesCollection();
    const CHUNK = 450;
    for (let i = 0; i < deleteIds.length; i += CHUNK) {
      const batch = db.batch();
      deleteIds.slice(i, i + CHUNK).forEach(id => batch.delete(ref.doc(id)));
      await batch.commit();
    }

    state.data.notes = state.data.notes.filter(n => !deleteIds.includes(n.id));
    pushUndoSnapshot(deleteSnapshot);
    state.selectedId = parentId;
    if (!state.selectedId || !getSelectedNote()) {
      const roots = getNotes().filter(n => n.parent_id === null);
      state.selectedId = roots.length > 0 ? roots[0].id : null;
    }
    selectNote(state.selectedId);
    showToast("削除しました。");
  } catch (e) { showToast(e.message); }
}

// ── テンプレート ──────────────────────────────────────────────────────────────

function renderTemplateItem(t) {
  const item = document.createElement("div");
  item.className = `template-item${t.official ? " is-official" : ""}${state.templatePreviewId === t.id ? " is-previewing" : ""}`;
  item.dataset.id = t.id;

  const info = document.createElement("div");
  info.className = "template-info";

  const titleLine = document.createElement("div");
  titleLine.className = "template-title-line";

  const name = document.createElement("span");
  name.className   = "template-name";
  name.textContent = t.name;
  titleLine.appendChild(name);

  if (t.official) {
    const badge = document.createElement("span");
    badge.className = "template-badge";
    badge.textContent = "公式";
    titleLine.appendChild(badge);
  }

  const meta = document.createElement("span");
  meta.className   = "template-meta";
  meta.textContent = `${countTemplateNodes(t.tree)}件のメモ`;

  info.append(titleLine, meta);

  const actions = document.createElement("div");
  actions.className = "template-actions";

  const previewActive = state.templatePreviewId === t.id;
  const previewBtn = document.createElement("button");
  previewBtn.className   = `template-action-btn${previewActive ? " is-active" : ""}`;
  previewBtn.title       = previewActive ? "プレビューを閉じる" : "テンプレートの内容を見る";
  previewBtn.setAttribute("aria-label", previewActive ? "プレビューを閉じる" : "テンプレートの内容を見る");
  previewBtn.dataset.action = "preview";
  setButtonContent(previewBtn, previewActive ? "×" : "🔍", previewActive ? "" : "内容を見る");

  const applyBtn = document.createElement("button");
  applyBtn.className   = "template-action-btn";
  applyBtn.title       = "このテンプレートを親メモとして追加";
  applyBtn.setAttribute("aria-label", "このテンプレートを親メモとして追加");
  applyBtn.dataset.action = "apply";
  setButtonContent(applyBtn, "＋", "追加する");

  const renameBtn = document.createElement("button");
  renameBtn.className   = "template-action-btn";
  renameBtn.title       = "名前を変更";
  renameBtn.setAttribute("aria-label", "名前を変更");
  renameBtn.dataset.action = "rename";
  setButtonContent(renameBtn, "✎", "名前変更");

  const deleteBtn = document.createElement("button");
  deleteBtn.className   = "template-action-btn ctx-danger";
  deleteBtn.title       = "削除";
  deleteBtn.setAttribute("aria-label", "削除");
  deleteBtn.dataset.action = "delete";
  setButtonContent(deleteBtn, "🗑", "削除");

  actions.append(previewBtn, applyBtn);
  if (!t.official) actions.append(renameBtn, deleteBtn);
  item.append(info, actions);
  if (state.templatePreviewId === t.id) item.appendChild(renderTemplatePreview(t));
  return item;
}

function templatePreviewText(content) {
  const raw = String(content ?? "");
  if (!raw) return "";
  const html = contentToHtml(raw).replace(/<br\s*\/?>/gi, "\n");
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.textContent.replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
}

function renderTemplatePreviewNode(node) {
  const item = document.createElement("li");
  item.className = "template-preview-node";

  const title = document.createElement("p");
  title.className = "template-preview-title";
  title.textContent = String(node.title || "無題");
  item.appendChild(title);

  const preview = templatePreviewText(node.content);
  const content = document.createElement("p");
  content.className = "template-preview-content";
  content.textContent = preview || "本文なし";
  item.appendChild(content);

  const children = node.children ?? [];
  if (children.length > 0) {
    const list = document.createElement("ol");
    list.className = "template-preview-children";
    children.forEach(child => list.appendChild(renderTemplatePreviewNode(child)));
    item.appendChild(list);
  }

  return item;
}

function renderTemplatePreview(template) {
  const preview = document.createElement("div");
  preview.className = "template-preview";

  const head = document.createElement("div");
  head.className = "template-preview-head";

  const title = document.createElement("p");
  title.className = "template-preview-label";
  title.textContent = "プレビュー";

  const count = document.createElement("span");
  count.className = "template-preview-count";
  count.textContent = `${countTemplateNodes(template.tree)}件`;

  head.append(title, count);
  preview.appendChild(head);

  const list = document.createElement("ol");
  list.className = "template-preview-tree";
  list.appendChild(renderTemplatePreviewNode(template.tree));
  preview.appendChild(list);

  return preview;
}

function renderTemplatesList() {
  const templates = [...state.templates].sort((a, b) => {
    const officialDiff = Number(Boolean(b.official)) - Number(Boolean(a.official));
    if (officialDiff !== 0) return officialDiff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  els.templatesList.innerHTML = "";
  if (templates.length === 0) {
    const empty = document.createElement("p");
    empty.className   = "templates-empty";
    empty.textContent = "保存されたテンプレートはありません。";
    els.templatesList.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  templates.forEach(t => fragment.appendChild(renderTemplateItem(t)));
  els.templatesList.appendChild(fragment);
}

function showTemplatesEmptyIfNeeded() {
  if (els.templatesList.querySelector(".template-item")) return;
  els.templatesList.innerHTML = "";
  const empty = document.createElement("p");
  empty.className   = "templates-empty";
  empty.textContent = "保存されたテンプレートはありません。";
  els.templatesList.appendChild(empty);
}

function appendTemplateItem(template) {
  els.templatesList.querySelector(".templates-empty")?.remove();
  els.templatesList.appendChild(renderTemplateItem(template));
}

function openTemplatesPanel() {
  closeMobileMenu();
  els.templatesOverlay.hidden = false;
  state.templatePreviewId = null;
  els.templateNameInput.value = "";
  renderTemplatesList();
}

function closeTemplatesPanel() {
  els.templatesOverlay.hidden = true;
  state.templatePreviewId = null;
}

async function saveSelectedNoteAsTemplate() {
  const note = getSelectedNote();
  if (!note) { showToast("先にメモを選択してください。"); return; }
  const name = els.templateNameInput.value.trim();
  if (!name) { showToast("テンプレート名を入力してください。"); return; }
  try {
    await saveCurrentEditorNow();
    const ts = nowIso();
    const template = {
      id:         makeId(),
      name:       name.slice(0, 120),
      official:   false,
      created_at: ts,
      updated_at: ts,
      tree:       buildTemplateTree(getNotes(), note.id),
    };
    await templatesCollection().doc(template.id).set(template);
    state.templates.push(template);
    els.templateNameInput.value = "";
    appendTemplateItem(template);
    showToast("テンプレートを保存しました。");
  } catch (e) { showToast(e.message); }
}

function startTemplateRename(item, templateId) {
  const nameEl = item.querySelector(".template-name");
  const orig   = nameEl.textContent;
  const input  = document.createElement("input");
  input.className = "template-rename-input";
  input.value = orig;
  nameEl.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  async function commit() {
    if (done) return; done = true;
    const val = input.value.trim() || orig;
    nameEl.textContent = val;
    input.replaceWith(nameEl);
    if (val !== orig) {
      try {
        await templatesCollection().doc(templateId).set({ name: val, updated_at: nowIso() }, { merge: true });
        const t = state.templates.find(t => t.id === templateId);
        if (t) t.name = val;
        showToast("名前を変更しました。");
      } catch (e) { showToast(e.message); renderTemplatesList(); }
    }
  }
  function cancel() { if (done) return; done = true; nameEl.textContent = orig; input.replaceWith(nameEl); }
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
  });
}

async function applyTemplate(templateId) {
  try {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) throw new Error("テンプレートが見つかりません。");

    const created = createNotesFromTemplate(template.tree, null, nextOrderForNewNote(null));
    created[0].title = String(template.name || "新しいメモ").slice(0, 120);

    const batch = db.batch();
    const ref   = notesCollection();
    created.forEach(n => batch.set(ref.doc(n.id), n));
    await batch.commit();

    closeTemplatesPanel();
    state.data.notes.push(...created);
    selectNote(created[0].id);
    showToast("テンプレートを親メモとして追加しました。");
  } catch (e) { showToast(e.message); }
}

async function deleteTemplate(item, templateId, name) {
  const ok = await showConfirm(`テンプレート「${name}」を削除しますか？`);
  if (!ok) return;
  try {
    await templatesCollection().doc(templateId).delete();
    state.templates = state.templates.filter(t => t.id !== templateId);
    if (state.templatePreviewId === templateId) state.templatePreviewId = null;
    item.remove();
    showTemplatesEmptyIfNeeded();
    showToast("テンプレートを削除しました。");
  } catch (e) { showToast(e.message); }
}

function toggleTemplatePreview(templateId) {
  state.templatePreviewId = state.templatePreviewId === templateId ? null : templateId;
  renderTemplatesList();
}

els.templatesBtn  .addEventListener("click", openTemplatesPanel);
els.templatesClose.addEventListener("click", closeTemplatesPanel);
els.templatesOverlay.addEventListener("click", e => {
  if (e.target === els.templatesOverlay) closeTemplatesPanel();
});
els.templateSaveBtn.addEventListener("click", saveSelectedNoteAsTemplate);
els.templateNameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); saveSelectedNoteAsTemplate(); }
});
els.templatesList.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const item = btn.closest(".template-item");
  const id   = item?.dataset.id;
  if (!id) return;
  switch (btn.dataset.action) {
    case "preview": toggleTemplatePreview(id); break;
    case "apply":  applyTemplate(id); break;
    case "rename": startTemplateRename(item, id); break;
    case "delete": deleteTemplate(item, id, item.querySelector(".template-name")?.textContent ?? ""); break;
  }
});

// ── Mind map ──────────────────────────────────────────────────────────────────

const MINDMAP_SCENE_WIDTH  = 2600;
const MINDMAP_SCENE_HEIGHT = 1800;
const MINDMAP_CENTER_X     = MINDMAP_SCENE_WIDTH / 2;
const MINDMAP_CENTER_Y     = MINDMAP_SCENE_HEIGHT / 2;
const MINDMAP_X_GAP        = 240;
const MINDMAP_Y_GAP        = 92;
const MINDMAP_NODE_HALF_W  = 86;
const MINDMAP_ADD_CHILD_OFFSET = 0;
const MINDMAP_ALIGN_SUBTREE_GAP = 32;
const MINDMAP_ALIGN_COLLISION_MARGIN_X = 26;
const MINDMAP_ALIGN_COLLISION_MARGIN_Y = 20;
const MINDMAP_DEFAULT_NODE_FILL = "#ffffff";
const MINDMAP_DEFAULT_NODE_BORDER = "#3b82f6";
const MINDMAP_ROOT_NODE_FILL = "#2563eb";
const MINDMAP_ROOT_NODE_BORDER = "#3b82f6";
const MINDMAP_DEFAULT_LINK_COLOR = "#93c5fd";
const MINDMAP_HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const MINDMAP_COLOR_PALETTE = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#111827" },
  { label: "赤", value: "#ef4444" },
  { label: "青", value: "#3b82f6" },
  { label: "黄色", value: "#facc15" },
  { label: "緑", value: "#22c55e" },
  { label: "紫", value: "#a855f7" },
  { label: "ピンク", value: "#ec4899" },
];

function createDefaultMindMap(id = makeId()) {
  const rootId = makeId();
  const ts = nowIso();
  return {
    id,
    title: "新しいマインドマップ",
    created_at: ts,
    updated_at: ts,
    selected_node_id: rootId,
    nodes: [{
      id: rootId,
      parent_id: null,
      title: "中心テーマ",
      order: 1000,
      x: null,
      y: null,
      collapsed: false,
      fill_color: null,
      border_color: null,
      link_color: null,
    }],
  };
}

function normalizeMindMap(raw, id) {
  const fallback = createDefaultMindMap(id);
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : fallback.nodes;
  const cleaned = nodes
    .filter(node => node && node.id)
    .map((node, index) => ({
      id: String(node.id),
      parent_id: node.parent_id ?? null,
      title: String(node.title || "トピック").slice(0, 80),
      order: Number.isFinite(Number(node.order)) ? Number(node.order) : (index + 1) * 1000,
      x: Number.isFinite(node.x) ? node.x : null,
      y: Number.isFinite(node.y) ? node.y : null,
      collapsed: Boolean(node.collapsed),
      fill_color: normalizeMindMapColor(node.fill_color),
      border_color: normalizeMindMapColor(node.border_color),
      link_color: normalizeMindMapColor(node.link_color),
    }));

  if (cleaned.length === 0) cleaned.push(...fallback.nodes);
  if (!cleaned.some(node => node.parent_id === null)) cleaned[0].parent_id = null;

  const selected = cleaned.find(node => node.id === raw?.selected_node_id)?.id
    ?? cleaned.find(node => node.parent_id === null)?.id
    ?? cleaned[0].id;

  return {
    id,
    title: String(raw?.title || fallback.title).slice(0, 80),
    created_at: raw?.created_at || fallback.created_at,
    updated_at: raw?.updated_at || fallback.updated_at,
    selected_node_id: selected,
    nodes: cleaned,
  };
}

function getMindMapNodes() {
  return state.mindMap?.nodes ?? [];
}

function getMindMapNode(id) {
  return getMindMapNodes().find(node => node.id === id) ?? null;
}

function getMindMapChildren(parentId) {
  return getMindMapNodes()
    .filter(node => (node.parent_id ?? null) === (parentId ?? null))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
}

function normalizeMindMapColor(value) {
  const color = String(value ?? "").trim();
  return MINDMAP_HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

function getMindMapDefaultNodeFill(node) {
  return node?.parent_id === null ? MINDMAP_ROOT_NODE_FILL : MINDMAP_DEFAULT_NODE_FILL;
}

function getMindMapDefaultNodeBorder(node) {
  return node?.parent_id === null ? MINDMAP_ROOT_NODE_BORDER : MINDMAP_DEFAULT_NODE_BORDER;
}

function getMindMapNodeFillColor(node) {
  return normalizeMindMapColor(node?.fill_color) ?? getMindMapDefaultNodeFill(node);
}

function getMindMapNodeBorderColor(node) {
  return normalizeMindMapColor(node?.border_color) ?? getMindMapDefaultNodeBorder(node);
}

function hexToRgb(hex) {
  const color = normalizeMindMapColor(hex) ?? "#000000";
  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const normalize = value => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

function contrastRatio(hexA, hexB) {
  const a = getRelativeLuminance(hexA);
  const b = getRelativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function getReadableTextColor(fillColor) {
  const fill = normalizeMindMapColor(fillColor) ?? MINDMAP_DEFAULT_NODE_FILL;
  return contrastRatio(fill, "#ffffff") >= contrastRatio(fill, "#111827")
    ? "#ffffff"
    : "#111827";
}

function getMindMapNodeTextColor(node) {
  const customFill = normalizeMindMapColor(node?.fill_color);
  if (customFill) return getReadableTextColor(customFill);
  return node?.parent_id === null ? "#ffffff" : null;
}

function getMindMapLinkColor(parent, child) {
  return normalizeMindMapColor(child?.link_color)
    ?? normalizeMindMapColor(parent?.link_color)
    ?? MINDMAP_DEFAULT_LINK_COLOR;
}

function applyMindMapNodeStyles(nodeEl, node) {
  const fill = getMindMapNodeFillColor(node);
  const border = getMindMapNodeBorderColor(node);
  const text = getMindMapNodeTextColor(node);

  nodeEl.style.setProperty("--mindmap-node-fill", fill);
  nodeEl.style.setProperty("--mindmap-node-border", border);

  if (text) nodeEl.style.setProperty("--mindmap-node-text", text);
  else nodeEl.style.removeProperty("--mindmap-node-text");
}

function getMindMapColorControls() {
  return [
    {
      prop: "fill_color",
      input: els.mindMapNodeFillColorInput,
      button: els.mindMapNodeFillColorButton,
      palette: els.mindMapNodeFillPalette,
      getColor: selected => getMindMapNodeFillColor(selected),
    },
    {
      prop: "border_color",
      input: els.mindMapNodeBorderColorInput,
      button: els.mindMapNodeBorderColorButton,
      palette: els.mindMapNodeBorderPalette,
      getColor: selected => getMindMapNodeBorderColor(selected),
    },
    {
      prop: "link_color",
      input: els.mindMapLinkColorInput,
      button: els.mindMapLinkColorButton,
      palette: els.mindMapLinkPalette,
      getColor: selected => {
        const parent = selected?.parent_id ? getMindMapNode(selected.parent_id) : null;
        return getMindMapLinkColor(parent, selected);
      },
    },
  ];
}

function setMindMapColorControlState(control, selected) {
  const color = selected ? control.getColor(selected) : MINDMAP_DEFAULT_NODE_FILL;
  if (control.input) {
    control.input.disabled = !selected;
    control.input.value = color;
  }
  if (control.button) {
    const trigger = control.button.querySelector(".mindmap-color-current-trigger");
    if ("disabled" in control.button) control.button.disabled = !selected;
    if (trigger) trigger.disabled = !selected;
    control.button.classList.toggle("is-disabled", !selected);
    control.button.setAttribute("aria-disabled", String(!selected));
    control.button.style.setProperty("--mindmap-current-color", color);
    if (!selected) setMindMapColorControlOpen(control, false);
  }
  if (control.palette) {
    control.palette.querySelectorAll(".mindmap-color-swatch").forEach(button => {
      const isActive = button.dataset.color === color;
      button.disabled = !selected;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
}

function updateMindMapColorInputs(selected) {
  getMindMapColorControls().forEach(control => setMindMapColorControlState(control, selected));
}

function getMindMapContextColor(node, prop) {
  if (prop === "fill_color") return getMindMapNodeFillColor(node);
  if (prop === "border_color") return getMindMapNodeBorderColor(node);
  const parent = node?.parent_id ? getMindMapNode(node.parent_id) : null;
  return getMindMapLinkColor(parent, node);
}

function updateMindMapContextColorPaletteState(node) {
  els.mindMapContextMenu.querySelectorAll("[data-mindmap-context-color-palette]").forEach(palette => {
    const prop = palette.dataset.mindmapContextColorPalette;
    const color = node ? getMindMapContextColor(node, prop) : null;
    palette.querySelectorAll(".mindmap-color-swatch").forEach(button => {
      const isActive = Boolean(color) && button.dataset.color === color;
      button.disabled = !node;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  });
}

function updateMindMapLinkContextPaletteState(child) {
  const parent = child?.parent_id ? getMindMapNode(child.parent_id) : null;
  const color = parent && child ? getMindMapLinkColor(parent, child) : null;
  els.mindMapLinkContextPalette?.querySelectorAll(".mindmap-color-swatch").forEach(button => {
    const isActive = Boolean(color) && button.dataset.color === color;
    button.disabled = !child || !parent;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function countMindMapDescendants(nodeId) {
  return getMindMapChildren(nodeId).reduce(
    (sum, child) => sum + 1 + countMindMapDescendants(child.id),
    0,
  );
}

function isMindMapNodeVisible(node) {
  let parentId = node?.parent_id ?? null;
  while (parentId) {
    const parent = getMindMapNode(parentId);
    if (!parent) return false;
    if (parent.collapsed) return false;
    parentId = parent.parent_id ?? null;
  }
  return true;
}

function getVisibleMindMapNodes() {
  return getMindMapNodes().filter(isMindMapNodeVisible);
}

function getMindMapAlignTarget(node = getMindMapNode(state.mindMapSelectedId)) {
  if (!node) return { parent: null, nodes: [] };
  const children = node.collapsed ? [] : getMindMapChildren(node.id).filter(isMindMapNodeVisible);
  if (children.length >= 2) return { parent: node, nodes: children };
  if (node.parent_id === null) return { parent: node, nodes: children };

  const parent = getMindMapNode(node.parent_id);
  return { parent, nodes: getMindMapChildren(node.parent_id).filter(isMindMapNodeVisible) };
}

function nextMindMapOrder(parentId) {
  const children = getMindMapChildren(parentId);
  return children.length ? Math.max(...children.map(node => node.order ?? 0)) + 1000 : 1000;
}

function serializeMindMap() {
  const map = state.mindMap;
  if (!map) return null;
  return {
    id: map.id,
    title: map.title || "新しいマインドマップ",
    created_at: map.created_at,
    updated_at: map.updated_at,
    selected_node_id: state.mindMapSelectedId,
    nodes: getMindMapNodes().map(node => ({
      id: node.id,
      parent_id: node.parent_id ?? null,
      title: node.title || "トピック",
      order: node.order ?? 0,
      x: Number.isFinite(node.x) ? node.x : null,
      y: Number.isFinite(node.y) ? node.y : null,
      collapsed: Boolean(node.collapsed),
      fill_color: normalizeMindMapColor(node.fill_color),
      border_color: normalizeMindMapColor(node.border_color),
      link_color: normalizeMindMapColor(node.link_color),
    })),
  };
}

function snapshotMindMap() {
  const map = serializeMindMap();
  if (!map?.id) return null;
  return {
    mapId: map.id,
    selected_node_id: state.mindMapSelectedId,
    map: cloneData(map),
  };
}

function mindMapSnapshotsEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a.map) === JSON.stringify(b.map) &&
    a.selected_node_id === b.selected_node_id;
}

function updateMindMapUndoButton() {
  if (!els.mindMapUndoBtn) return;
  els.mindMapUndoBtn.disabled = state.mindMapUndoStack.length === 0;
}

function clearMindMapUndoStack() {
  state.mindMapUndoStack = [];
  state.mindMapEditSnapshot = null;
  updateMindMapUndoButton();
}

function pushMindMapUndoSnapshot(snapshot = snapshotMindMap()) {
  if (state.isApplyingMindMapUndo || !snapshot?.mapId) return;
  const last = state.mindMapUndoStack[state.mindMapUndoStack.length - 1];
  if (mindMapSnapshotsEqual(last, snapshot)) return;
  state.mindMapUndoStack.push(snapshot);
  if (state.mindMapUndoStack.length > MAX_UNDO) state.mindMapUndoStack.shift();
  updateMindMapUndoButton();
}

function beginMindMapEditUndo() {
  if (state.mindMapEditSnapshot) return;
  const snapshot = snapshotMindMap();
  pushMindMapUndoSnapshot(snapshot);
  state.mindMapEditSnapshot = snapshot;
}

function endMindMapEditUndo() {
  state.mindMapEditSnapshot = null;
}

async function applyMindMapUndoSnapshot(snapshot) {
  if (!snapshot?.map) return;
  clearTimeout(state.mindMapSaveTimer);
  state.isApplyingMindMapUndo = true;
  try {
    state.mindMap = normalizeMindMap(snapshot.map, snapshot.map.id);
    state.mindMapSelectedId = getMindMapNode(snapshot.selected_node_id)
      ? snapshot.selected_node_id
      : state.mindMap.selected_node_id;
    state.mindMap.selected_node_id = state.mindMapSelectedId;
    state.mindMapCentered = false;
    hideMindMapCtxMenu();
    closeMindMapListPanel();
    renderMindMap();
    await saveMindMapNow();
    showToast("マインドマップを一つ前に戻しました。");
  } catch (e) {
    showToast("戻せませんでした: " + e.message);
  } finally {
    state.isApplyingMindMapUndo = false;
    state.mindMapEditSnapshot = null;
    updateMindMapUndoButton();
  }
}

async function undoMindMapLastChange() {
  const currentMapId = state.mindMap?.id;
  let snapshot = state.mindMapUndoStack.pop();
  while (snapshot && snapshot.mapId !== currentMapId) {
    snapshot = state.mindMapUndoStack.pop();
  }

  if (!snapshot) {
    updateMindMapUndoButton();
    showToast("戻せる変更がありません。");
    return;
  }

  updateMindMapUndoButton();
  await applyMindMapUndoSnapshot(snapshot);
}

async function loadMindMap() {
  if (state.mindMapLoaded) return;
  els.mindMapStatus.textContent = "読み込み中...";
  const snap = await mindMapsCollection().get();
  if (snap.empty) {
    state.mindMap = createDefaultMindMap();
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    await mindMapsCollection().doc(state.mindMap.id).set(serializeMindMap());
    state.mindMapList = [{ id: state.mindMap.id, title: state.mindMap.title, updated_at: state.mindMap.updated_at }];
  } else {
    const docs = snap.docs
      .map(doc => ({ id: doc.id, data: doc.data() }))
      .sort((a, b) => String(b.data.updated_at ?? "").localeCompare(String(a.data.updated_at ?? "")));
    state.mindMap = normalizeMindMap(docs[0].data, docs[0].id);
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapList = docs.map(({ id, data }) => ({
      id,
      title: String(data.title || "新しいマインドマップ").slice(0, 80),
      updated_at: data.updated_at || "",
    }));
  }
  state.mindMapLoaded = true;
  clearMindMapUndoStack();
  els.mindMapStatus.textContent = `保存済み ${state.mindMap.updated_at}`;
}

function scheduleMindMapSave() {
  if (!state.mindMap || !state.uid) return;
  clearTimeout(state.mindMapSaveTimer);
  els.mindMapStatus.textContent = "保存中...";
  state.mindMapSaveTimer = setTimeout(saveMindMapNow, 500);
}

async function saveMindMapNow() {
  if (!state.mindMap || !state.uid) return;
  clearTimeout(state.mindMapSaveTimer);
  state.mindMap.updated_at = nowIso();
  state.mindMap.selected_node_id = state.mindMapSelectedId;
  const listEntry = state.mindMapList.find(m => m.id === state.mindMap.id);
  if (listEntry) {
    listEntry.title = state.mindMap.title;
    listEntry.updated_at = state.mindMap.updated_at;
  }
  try {
    await mindMapsCollection().doc(state.mindMap.id).set(serializeMindMap(), { merge: true });
    els.mindMapStatus.textContent = `保存済み ${state.mindMap.updated_at}`;
  } catch (e) {
    els.mindMapStatus.textContent = "保存できませんでした";
    showToast(e.message);
  }
}

function calculateMindMapLayout() {
  const nodes = getVisibleMindMapNodes();
  const layout = new Map();
  const root = nodes.find(node => node.parent_id === null) ?? nodes[0];
  if (!root) return layout;

  let cursor = 0;
  function place(node, depth) {
    const children = node.collapsed ? [] : getMindMapChildren(node.id).filter(isMindMapNodeVisible);
    if (children.length === 0) {
      layout.set(node.id, { x: depth * MINDMAP_X_GAP, y: cursor * MINDMAP_Y_GAP });
      cursor += 1;
      return;
    }

    children.forEach(child => place(child, depth + 1));
    const childYs = children.map(child => layout.get(child.id)?.y ?? 0);
    const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    layout.set(node.id, { x: depth * MINDMAP_X_GAP, y });
  }

  place(root, 0);
  const rootPos = layout.get(root.id) ?? { x: 0, y: 0 };
  const offsetX = MINDMAP_CENTER_X - rootPos.x;
  const offsetY = MINDMAP_CENTER_Y - rootPos.y;

  for (const [id, pos] of layout.entries()) {
    layout.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
  }

  function applySavedPositionShift(node, parentShift = { dx: 0, dy: 0 }) {
    const pos = layout.get(node.id);
    if (!pos) return;

    let shift = parentShift;
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      shift = {
        dx: node.x - pos.x,
        dy: node.y - pos.y,
      };
    }

    layout.set(node.id, {
      x: pos.x + shift.dx,
      y: pos.y + shift.dy,
    });

    if (node.collapsed) return;
    getMindMapChildren(node.id)
      .filter(child => layout.has(child.id))
      .forEach(child => applySavedPositionShift(child, shift));
  }

  applySavedPositionShift(root);

  return layout;
}

function applyMindMapTransform() {
  els.mindMapScene.style.transform =
    `translate(${state.mindMapPanX}px, ${state.mindMapPanY}px) scale(${state.mindMapZoom})`;
  els.mindMapZoomLabel.textContent = `${Math.round(state.mindMapZoom * 100)}%`;
}

function centerMindMap() {
  const rect = els.mindMapCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  state.mindMapPanX = rect.width / 2 - MINDMAP_CENTER_X * state.mindMapZoom;
  state.mindMapPanY = rect.height / 2 - MINDMAP_CENTER_Y * state.mindMapZoom;
  state.mindMapCentered = true;
  applyMindMapTransform();
}

function setMindMapZoom(nextZoom, origin = null) {
  const oldZoom = state.mindMapZoom;
  const next = Math.max(0.45, Math.min(1.7, nextZoom));
  if (next === oldZoom) return;

  const rect = els.mindMapCanvas.getBoundingClientRect();
  const ox = origin?.x ?? rect.width / 2;
  const oy = origin?.y ?? rect.height / 2;
  const sceneX = (ox - state.mindMapPanX) / oldZoom;
  const sceneY = (oy - state.mindMapPanY) / oldZoom;
  state.mindMapZoom = next;
  state.mindMapPanX = ox - sceneX * next;
  state.mindMapPanY = oy - sceneY * next;
  applyMindMapTransform();
}

function setMindMapLinkPath(path, fromPos, toPos) {
  const startX = fromPos.x + MINDMAP_NODE_HALF_W;
  const startY = fromPos.y;
  const endX = toPos.x - MINDMAP_NODE_HALF_W;
  const endY = toPos.y;
  const gap = endX - startX;
  const verticalGap = Math.abs(endY - startY);

  if (verticalGap < 1) {
    path.setAttribute("d", `M ${startX} ${startY} L ${endX} ${endY}`);
    return;
  }

  if (gap >= 20) {
    const curve = Math.max(8, Math.min(72, gap * 0.38));
    path.setAttribute("d", `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`);
    return;
  }

  const routeX = Math.max(startX, endX) + 42;
  path.setAttribute("d", `M ${startX} ${startY} C ${routeX} ${startY}, ${routeX} ${endY}, ${endX} ${endY}`);
}

function updateMindMapLinksFor(nodeId, layout) {
  const pos = layout.get(nodeId);
  if (!pos) return;
  const node = getMindMapNode(nodeId);
  if (!node) return;

  if (node.parent_id) {
    const parentPos = layout.get(node.parent_id);
    const path = els.mindMapLinks.querySelector(`.mindmap-link[data-child="${nodeId}"]`);
    const hitPath = els.mindMapLinks.querySelector(`.mindmap-link-hit[data-child="${nodeId}"]`);
    const parent = getMindMapNode(node.parent_id);
    if (parentPos && path) {
      path.style.setProperty("--mindmap-link-color", getMindMapLinkColor(parent, node));
      setMindMapLinkPath(path, parentPos, pos);
      if (hitPath) setMindMapLinkPath(hitPath, parentPos, pos);
    }
  }

  if (node.collapsed) return;

  for (const child of getMindMapChildren(nodeId).filter(isMindMapNodeVisible)) {
    const childPos = layout.get(child.id);
    const path = els.mindMapLinks.querySelector(`.mindmap-link[data-child="${child.id}"]`);
    const hitPath = els.mindMapLinks.querySelector(`.mindmap-link-hit[data-child="${child.id}"]`);
    if (childPos && path) {
      path.style.setProperty("--mindmap-link-color", getMindMapLinkColor(node, child));
      setMindMapLinkPath(path, pos, childPos);
      if (hitPath) setMindMapLinkPath(hitPath, pos, childPos);
    }
  }
}

function setMindMapNodeButtonContent(button, node) {
  button.innerHTML = "";

  const title = document.createElement("span");
  title.className = "mindmap-node-title";
  title.textContent = node.title || "トピック";
  button.appendChild(title);

  const hiddenCount = node.collapsed ? countMindMapDescendants(node.id) : 0;
  if (hiddenCount > 0) {
    const badge = document.createElement("span");
    badge.className = "mindmap-node-count";
    badge.title = `非表示の子ノード ${hiddenCount}件`;
    badge.textContent = hiddenCount > 99 ? "99+" : String(hiddenCount);
    button.appendChild(badge);
  }
}

function renderMindMap() {
  if (!state.mindMap) return;
  const layout = calculateMindMapLayout();
  const visibleNodes = getVisibleMindMapNodes();
  const selected = visibleNodes.find(node => node.id === state.mindMapSelectedId)
    ?? visibleNodes.find(node => node.parent_id === null)
    ?? visibleNodes[0]
    ?? null;
  const alignTarget = getMindMapAlignTarget(selected);
  state.mindMapSelectedId = selected?.id ?? null;
  state.mindMap.selected_node_id = state.mindMapSelectedId;

  els.mindMapTitleInput.value = state.mindMap.title || "";
  els.mindMapNodeTitleInput.value = selected?.title ?? "";
  els.mindMapNodeTitleInput.disabled = !selected;
  updateMindMapColorInputs(selected);
  if (els.mindMapAddChildBtn) els.mindMapAddChildBtn.disabled = !selected;
  if (els.mindMapAlignChildrenBtn) els.mindMapAlignChildrenBtn.disabled = !alignTarget.parent || alignTarget.nodes.length < 2;
  if (els.mindMapDeleteNodeBtn) els.mindMapDeleteNodeBtn.disabled = !selected || selected.parent_id === null;
  updateMindMapUndoButton();

  els.mindMapLinks.innerHTML = "";
  els.mindMapNodes.innerHTML = "";

  for (const node of visibleNodes) {
    const pos = layout.get(node.id);
    if (!pos) continue;
    const parent = node.parent_id ? getMindMapNode(node.parent_id) : null;
    const parentPos = parent ? layout.get(parent.id) : null;
    if (parent && parentPos) {
      const linkColor = getMindMapLinkColor(parent, node);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "mindmap-link");
      path.dataset.child = node.id;
      path.style.setProperty("--mindmap-link-color", linkColor);
      setMindMapLinkPath(path, parentPos, pos);
      els.mindMapLinks.appendChild(path);

      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.setAttribute("class", "mindmap-link-hit");
      hitPath.dataset.child = node.id;
      setMindMapLinkPath(hitPath, parentPos, pos);
      hitPath.addEventListener("contextmenu", e => {
        e.preventDefault();
        e.stopPropagation();
        showMindMapLinkCtxMenu(e.clientX, e.clientY, node.id);
      });
      els.mindMapLinks.appendChild(hitPath);
    }

    const nodeBtn = document.createElement("button");
    nodeBtn.type = "button";
    nodeBtn.className = `mindmap-node${node.parent_id === null ? " is-root" : ""}${node.id === state.mindMapSelectedId ? " is-selected" : ""}${node.collapsed ? " is-collapsed" : ""}`;
    nodeBtn.dataset.id = node.id;
    nodeBtn.style.left = `${pos.x}px`;
    nodeBtn.style.top = `${pos.y}px`;
    applyMindMapNodeStyles(nodeBtn, node);
    setMindMapNodeButtonContent(nodeBtn, node);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "mindmap-add-child-btn";
    addBtn.dataset.id = node.id;
    addBtn.title = "子ノードを追加";
    addBtn.setAttribute("aria-label", `「${node.title || "トピック"}」に子ノードを追加`);
    addBtn.textContent = "+";
    addBtn.style.left = `${pos.x + MINDMAP_NODE_HALF_W + MINDMAP_ADD_CHILD_OFFSET}px`;
    addBtn.style.top = `${pos.y}px`;
    addBtn.addEventListener("pointerdown", e => e.stopPropagation());
    addBtn.addEventListener("click", e => {
      e.stopPropagation();
      addMindMapNode(node.id);
    });

    nodeBtn.addEventListener("click", e => {
      e.stopPropagation();
      selectMindMapNode(node.id);
    });
    nodeBtn.addEventListener("dblclick", e => {
      e.stopPropagation();
      startMindMapNodeEdit(node.id);
    });
    nodeBtn.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      showMindMapCtxMenu(e.clientX, e.clientY, node.id);
    });
    nodeBtn.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        startMindMapNodeEdit(node.id);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedMindMapNode();
      }
    });
    nodeBtn.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      nodeBtn.setPointerCapture(e.pointerId);
      const start = layout.get(node.id) ?? { x: 0, y: 0 };
      state.mindMapNodeDrag = {
        id: node.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: start.x,
        startY: start.y,
        moved: false,
      };
    });
    nodeBtn.addEventListener("pointermove", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id || drag.pointerId !== e.pointerId) return;
      const dx = (e.clientX - drag.startClientX) / state.mindMapZoom;
      const dy = (e.clientY - drag.startClientY) / state.mindMapZoom;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY) < 3) return;
        drag.moved = true;
        nodeBtn.classList.add("is-dragging");
      }
      const x = drag.startX + dx;
      const y = drag.startY + dy;
      layout.set(node.id, { x, y });
      nodeBtn.style.left = `${x}px`;
      nodeBtn.style.top = `${y}px`;
      addBtn.style.left = `${x + MINDMAP_NODE_HALF_W + MINDMAP_ADD_CHILD_OFFSET}px`;
      addBtn.style.top = `${y}px`;
      updateMindMapLinksFor(node.id, layout);
    });
    nodeBtn.addEventListener("pointerup", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id || drag.pointerId !== e.pointerId) return;
      nodeBtn.releasePointerCapture(e.pointerId);
      state.mindMapNodeDrag = null;
      nodeBtn.classList.remove("is-dragging");
      if (drag.moved) {
        const finalPos = layout.get(node.id);
        pushMindMapUndoSnapshot();
        node.x = finalPos.x;
        node.y = finalPos.y;
        scheduleMindMapSave();
      }
    });
    nodeBtn.addEventListener("pointercancel", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id) return;
      nodeBtn.releasePointerCapture(e.pointerId);
      state.mindMapNodeDrag = null;
      nodeBtn.classList.remove("is-dragging");
      if (drag.moved) renderMindMap();
    });
    els.mindMapNodes.appendChild(nodeBtn);
    els.mindMapNodes.appendChild(addBtn);
  }

  applyMindMapTransform();
}

function selectMindMapNode(id) {
  if (!getMindMapNode(id)) return;
  state.mindMapSelectedId = id;
  renderMindMap();
  scheduleMindMapSave();
}

function startMindMapNodeEdit(nodeId) {
  const node = getMindMapNode(nodeId);
  if (!node) return;
  if (state.mindMapSelectedId !== nodeId) {
    state.mindMapSelectedId = nodeId;
    renderMindMap();
  }
  const nodeBtn = els.mindMapNodes.querySelector(`.mindmap-node[data-id="${nodeId}"]`);
  if (!nodeBtn || nodeBtn.classList.contains("is-editing")) return;

  const input = document.createElement("input");
  input.type = "text";
  input.className = `mindmap-node-edit${node.parent_id === null ? " is-root" : ""}`;
  input.maxLength = 80;
  input.value = node.title || "";
  input.style.left = nodeBtn.style.left;
  input.style.top = nodeBtn.style.top;

  let finished = false;
  let isComposing = false;
  const finish = commit => {
    if (finished) return;
    finished = true;
    if (commit) {
      const nextTitle = (input.value.trim() || "トピック").slice(0, 80);
      if (nextTitle !== (node.title || "トピック")) {
        pushMindMapUndoSnapshot();
      }
      node.title = nextTitle;
      setMindMapNodeButtonContent(nodeBtn, node);
      if (state.mindMapSelectedId === nodeId) {
        els.mindMapNodeTitleInput.value = node.title;
      }
      scheduleMindMapSave();
    }
    nodeBtn.classList.remove("is-editing");
    input.remove();
  };
  input.addEventListener("compositionstart", () => { isComposing = true; });
  input.addEventListener("compositionend", () => { isComposing = false; });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter" && !isImeComposing(e, isComposing)) {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape" && !isImeComposing(e, isComposing)) {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("pointerdown", e => e.stopPropagation());

  nodeBtn.classList.add("is-editing");
  els.mindMapNodes.appendChild(input);
  input.focus();
  input.select();
}

function addMindMapNode(parentId) {
  const parent = getMindMapNode(parentId);
  if (!parent) return;
  pushMindMapUndoSnapshot();
  parent.collapsed = false;
  const node = {
    id: makeId(),
    parent_id: parent.id,
    title: "新しいトピック",
    order: nextMindMapOrder(parent.id),
    x: null,
    y: null,
    fill_color: null,
    border_color: null,
    link_color: null,
  };
  state.mindMap.nodes.push(node);
  state.mindMapSelectedId = node.id;
  renderMindMap();
  scheduleMindMapSave();
  requestAnimationFrame(() => startMindMapNodeEdit(node.id));
}

function toggleMindMapChildren(nodeId) {
  const node = getMindMapNode(nodeId);
  if (!node) return;
  const hiddenCount = countMindMapDescendants(node.id);
  if (hiddenCount === 0) {
    showToast("表示を切り替える子ノードがありません。");
    return;
  }

  pushMindMapUndoSnapshot();
  node.collapsed = !node.collapsed;
  state.mindMapSelectedId = node.id;
  renderMindMap();
  scheduleMindMapSave();
  showToast(node.collapsed ? `子ノード ${hiddenCount}件を隠しました。` : "子ノードを表示しました。");
}

function estimateMindMapNodeHeight(node) {
  const text = String(node?.title || "トピック");
  const weightedLength = Array.from(text).reduce((sum, ch) => (
    sum + (/[\x00-\x7F]/.test(ch) ? 0.55 : 1)
  ), 0);
  const lines = Math.max(1, Math.ceil(weightedLength / 10));
  const minHeight = node?.parent_id === null ? 66 : 54;
  return Math.max(minHeight, 20 + lines * 19);
}

function getMindMapSubtreeBounds(nodeId, layout) {
  const ids = collectMindMapSubtreeIds(nodeId);
  let minY = Infinity;
  let maxY = -Infinity;

  for (const id of ids) {
    const node = getMindMapNode(id);
    const pos = layout.get(id);
    if (!node || !pos) continue;
    const halfH = estimateMindMapNodeHeight(node) / 2;
    minY = Math.min(minY, pos.y - halfH);
    maxY = Math.max(maxY, pos.y + halfH);
  }

  const targetPos = layout.get(nodeId) ?? { x: MINDMAP_CENTER_X, y: MINDMAP_CENTER_Y };
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    const node = getMindMapNode(nodeId);
    const halfH = estimateMindMapNodeHeight(node) / 2;
    minY = targetPos.y - halfH;
    maxY = targetPos.y + halfH;
  }

  return {
    ids,
    minY,
    maxY,
    height: maxY - minY,
    targetOffsetY: targetPos.y - minY,
    targetPos,
  };
}

function getMindMapCollisionRect(node, pos) {
  const halfW = MINDMAP_NODE_HALF_W + MINDMAP_ALIGN_COLLISION_MARGIN_X;
  const halfH = estimateMindMapNodeHeight(node) / 2 + MINDMAP_ALIGN_COLLISION_MARGIN_Y;
  return {
    left: pos.x - halfW,
    right: pos.x + halfW,
    top: pos.y - halfH,
    bottom: pos.y + halfH,
  };
}

function offsetMindMapRect(rect, dy) {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top + dy,
    bottom: rect.bottom + dy,
  };
}

function mindMapRectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function createMindMapAlignPlans(groups, parentPos, x) {
  const totalHeight = groups.reduce((sum, group) => sum + group.height, 0)
    + MINDMAP_ALIGN_SUBTREE_GAP * (groups.length - 1);
  let cursorY = parentPos.y - totalHeight / 2;

  return groups.map((group, index) => {
    const targetY = cursorY + group.targetOffsetY;
    const plan = {
      ...group,
      index,
      targetX: x,
      targetY,
      dx: x - group.targetPos.x,
      dy: targetY - group.targetPos.y,
    };
    cursorY += group.height + MINDMAP_ALIGN_SUBTREE_GAP;
    return plan;
  });
}

function getMindMapPlanCollisionRects(plans, layout) {
  const rects = [];
  for (const plan of plans) {
    for (const id of plan.ids) {
      const node = getMindMapNode(id);
      const pos = layout.get(id);
      if (!node || !pos) continue;
      rects.push(getMindMapCollisionRect(node, {
        x: pos.x + plan.dx,
        y: pos.y + plan.dy,
      }));
    }
  }
  return rects;
}

function getMindMapStationaryCollisionRects(layout, movingIds) {
  return getVisibleMindMapNodes()
    .filter(node => !movingIds.has(node.id))
    .map(node => {
      const pos = layout.get(node.id);
      return pos ? getMindMapCollisionRect(node, pos) : null;
    })
    .filter(Boolean);
}

function findMindMapClearVerticalShift(movingRects, stationaryRects, direction) {
  let shift = 0;
  for (let i = 0; i < 80; i += 1) {
    let nextShift = shift;
    for (const movingRect of movingRects) {
      const shifted = offsetMindMapRect(movingRect, shift);
      for (const stationaryRect of stationaryRects) {
        if (!mindMapRectsOverlap(shifted, stationaryRect)) continue;
        if (direction > 0) {
          nextShift = Math.max(nextShift, shift + stationaryRect.bottom - shifted.top + 1);
        } else {
          nextShift = Math.min(nextShift, shift + stationaryRect.top - shifted.bottom - 1);
        }
      }
    }
    if (nextShift === shift) return shift;
    shift = nextShift;
    if (Math.abs(shift) > MINDMAP_SCENE_HEIGHT) return null;
  }
  return null;
}

function resolveMindMapAlignCollisionShift(plans, layout) {
  const movingIds = new Set();
  plans.forEach(plan => {
    for (const id of plan.ids) movingIds.add(id);
  });

  const movingRects = getMindMapPlanCollisionRects(plans, layout);
  const stationaryRects = getMindMapStationaryCollisionRects(layout, movingIds);
  if (movingRects.length === 0 || stationaryRects.length === 0) return 0;

  const downShift = findMindMapClearVerticalShift(movingRects, stationaryRects, 1);
  const upShift = findMindMapClearVerticalShift(movingRects, stationaryRects, -1);
  if (downShift === 0 || upShift === 0) return 0;
  if (downShift === null && upShift === null) return 0;
  if (downShift === null) return upShift;
  if (upShift === null) return downShift;
  return Math.abs(downShift) <= Math.abs(upShift) ? downShift : upShift;
}

function alignMindMapSiblingNodes() {
  const selected = getMindMapNode(state.mindMapSelectedId);
  const { parent, nodes } = getMindMapAlignTarget(selected);
  if (!parent || nodes.length < 2) {
    showToast("整列できる同階層ノードがありません。");
    return;
  }

  pushMindMapUndoSnapshot();
  const layout = calculateMindMapLayout();
  const parentPos = layout.get(parent.id) ?? {
    x: Number.isFinite(parent.x) ? parent.x : MINDMAP_CENTER_X,
    y: Number.isFinite(parent.y) ? parent.y : MINDMAP_CENTER_Y,
  };
  const x = parentPos.x + MINDMAP_X_GAP;
  const groups = nodes.map(node => ({
    node,
    ...getMindMapSubtreeBounds(node.id, layout),
  }));
  const plans = createMindMapAlignPlans(groups, parentPos, x);
  const collisionShift = resolveMindMapAlignCollisionShift(plans, layout);

  plans.forEach(plan => {
    const dy = plan.dy + collisionShift;

    for (const id of plan.ids) {
      const node = getMindMapNode(id);
      const pos = layout.get(id);
      if (!node || !pos) continue;
      node.x = pos.x + plan.dx;
      node.y = pos.y + dy;
    }

    const node = plan.node;
    node.order = (plan.index + 1) * 1000;
    node.x = plan.targetX;
    node.y = plan.targetY + collisionShift;
  });

  renderMindMap();
  scheduleMindMapSave();
  showToast(collisionShift === 0 ? "同階層ノードを整列しました。" : "重なりを避けて同階層ノードを整列しました。");
}

function collectMindMapSubtreeIds(nodeId) {
  const ids = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of getMindMapNodes()) {
      if (ids.has(node.parent_id) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

async function deleteSelectedMindMapNode() {
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) return;
  if (selected.parent_id === null) {
    showToast("中心テーマは削除できません。");
    return;
  }
  const ok = await showConfirm(`「${selected.title}」と子ノードを削除しますか？`);
  if (!ok) return;
  pushMindMapUndoSnapshot();
  const ids = collectMindMapSubtreeIds(selected.id);
  state.mindMap.nodes = getMindMapNodes().filter(node => !ids.has(node.id));
  state.mindMapSelectedId = selected.parent_id;
  renderMindMap();
  scheduleMindMapSave();
  showToast("ノードを削除しました。");
}

function formatMindMapListDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}` : "";
}

async function createNewMindMap() {
  if (state.mindMap) await saveMindMapNow();
  const map = createDefaultMindMap();
  const previous = state.mindMap;
  state.mindMap = map;
  state.mindMapSelectedId = map.selected_node_id;
  try {
    await mindMapsCollection().doc(map.id).set(serializeMindMap());
  } catch (e) {
    state.mindMap = previous;
    state.mindMapSelectedId = previous?.selected_node_id ?? null;
    showToast(e.message);
    return;
  }
  state.mindMapCentered = false;
  state.mindMapList.unshift({ id: map.id, title: map.title, updated_at: map.updated_at });
  clearMindMapUndoStack();
  closeMindMapListPanel();
  renderMindMap();
  centerMindMap();
  els.mindMapStatus.textContent = `保存済み ${map.updated_at}`;
  els.mindMapTitleInput.focus();
  els.mindMapTitleInput.select();
  showToast("新しいマインドマップを作成しました。");
}

async function switchMindMap(id) {
  if (!state.mindMap || state.mindMap.id === id) {
    closeMindMapListPanel();
    return;
  }
  await saveMindMapNow();
  els.mindMapStatus.textContent = "読み込み中...";
  try {
    const doc = await mindMapsCollection().doc(id).get();
    if (!doc.exists) {
      state.mindMapList = state.mindMapList.filter(m => m.id !== id);
      renderMindMapList();
      showToast("マインドマップが見つかりませんでした。");
      return;
    }
    state.mindMap = normalizeMindMap(doc.data(), doc.id);
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapCentered = false;
    clearMindMapUndoStack();
    renderMindMap();
    centerMindMap();
    els.mindMapStatus.textContent = `保存済み ${state.mindMap.updated_at}`;
  } catch (e) {
    showToast(e.message);
  }
  closeMindMapListPanel();
}

async function deleteMindMap(id) {
  if (state.mindMapList.length <= 1) return;
  const target = state.mindMapList.find(m => m.id === id);
  const ok = await showConfirm(`「${target?.title || "新しいマインドマップ"}」を削除しますか？`, "削除");
  if (!ok) return;
  try {
    await mindMapsCollection().doc(id).delete();
  } catch (e) {
    showToast(e.message);
    return;
  }
  state.mindMapList = state.mindMapList.filter(m => m.id !== id);
  if (state.mindMap?.id === id) {
    clearTimeout(state.mindMapSaveTimer);
    const next = state.mindMapList[0];
    try {
      const doc = await mindMapsCollection().doc(next.id).get();
      state.mindMap = normalizeMindMap(doc.data(), doc.id);
    } catch {
      state.mindMap = createDefaultMindMap(next.id);
    }
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapCentered = false;
    clearMindMapUndoStack();
    renderMindMap();
    centerMindMap();
    els.mindMapStatus.textContent = `保存済み ${state.mindMap.updated_at}`;
  }
  renderMindMapList();
  showToast("マインドマップを削除しました。");
}

function startMindMapListRename(id) {
  const item = els.mindMapListItems.querySelector(`[data-id="${id}"]`);
  const entry = state.mindMapList.find(m => m.id === id);
  if (!item || !entry || item.classList.contains("is-editing")) return;
  const openBtn = item.querySelector(".mindmap-list-open");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "mindmap-list-rename";
  input.maxLength = 80;
  input.value = entry.title;

  let finished = false;
  const finish = commit => {
    if (finished) return;
    finished = true;
    if (commit) {
      const title = (input.value.trim() || "新しいマインドマップ").slice(0, 80);
      entry.title = title;
      entry.updated_at = nowIso();
      const titleEl = openBtn.querySelector(".mindmap-list-title");
      if (titleEl) titleEl.textContent = title;
      const dateEl = openBtn.querySelector(".mindmap-list-date");
      if (dateEl) dateEl.textContent = formatMindMapListDate(entry.updated_at);
      if (state.mindMap?.id === id) {
        state.mindMap.title = title;
        els.mindMapTitleInput.value = title;
      }
      mindMapsCollection().doc(id).update({ title, updated_at: entry.updated_at }).catch(e => showToast(e.message));
    }
    item.classList.remove("is-editing");
    input.remove();
    openBtn.hidden = false;
  };
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });

  item.classList.add("is-editing");
  openBtn.hidden = true;
  openBtn.insertAdjacentElement("afterend", input);
  input.focus();
  input.select();
}

function renderMindMapList() {
  els.mindMapListItems.innerHTML = "";
  state.mindMapList.forEach(entry => {
    const item = document.createElement("li");
    item.className = `mindmap-list-item${entry.id === state.mindMap?.id ? " is-active" : ""}`;
    item.dataset.id = entry.id;

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "mindmap-list-open";
    openBtn.dataset.action = "switch";

    const title = document.createElement("span");
    title.className = "mindmap-list-title";
    title.textContent = entry.title || "新しいマインドマップ";
    openBtn.appendChild(title);

    const date = document.createElement("span");
    date.className = "mindmap-list-date";
    date.textContent = formatMindMapListDate(entry.updated_at);
    openBtn.appendChild(date);

    item.appendChild(openBtn);

    const actions = document.createElement("div");
    actions.className = "mindmap-list-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "mindmap-list-icon-btn";
    renameBtn.dataset.action = "rename";
    renameBtn.title = "名前を変更";
    renameBtn.setAttribute("aria-label", "名前を変更");
    renameBtn.textContent = "✏️";
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "mindmap-list-icon-btn danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.title = "削除";
    deleteBtn.setAttribute("aria-label", "削除");
    deleteBtn.textContent = "🗑";
    deleteBtn.disabled = state.mindMapList.length <= 1;
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    els.mindMapListItems.appendChild(item);
  });
}

function openMindMapListPanel() {
  renderMindMapList();
  const rect = els.mindMapListBtn.getBoundingClientRect();
  els.mindMapListPanel.style.top = `${rect.bottom + 6}px`;
  els.mindMapListPanel.style.left = `${rect.left}px`;
  els.mindMapListPanel.style.right = "auto";
  els.mindMapListPanel.hidden = false;
  els.mindMapListBtn.setAttribute("aria-expanded", "true");
}

function closeMindMapListPanel() {
  els.mindMapListPanel.hidden = true;
  els.mindMapListBtn.setAttribute("aria-expanded", "false");
}

async function openMindMapPanel() {
  closeMobileMenu();
  closeTemplatesPanel();
  hideCtxMenu();
  hideMediaCtxMenu();
  els.accountMenu.hidden = true;
  els.appShell.hidden = true;
  els.mindMapOverlay.hidden = false;
  try {
    await loadMindMap();
    renderMindMap();
    requestAnimationFrame(() => {
      if (!state.mindMapCentered) centerMindMap();
      else applyMindMapTransform();
    });
  } catch (e) {
    showToast(e.message);
  }
}

function closeMindMapPanel() {
  if (els.mindMapOverlay.hidden) return;
  els.mindMapOverlay.hidden = true;
  els.appShell.hidden = false;
  closeMindMapListPanel();
  hideMindMapCtxMenu();
  if (state.mindMap) saveMindMapNow();
}

function updateSelectedMindMapTitle(value) {
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) return;
  selected.title = String(value ?? "").slice(0, 80);
  const nodeEl = els.mindMapNodes.querySelector(`.mindmap-node[data-id="${selected.id}"]`);
  if (nodeEl) setMindMapNodeButtonContent(nodeEl, selected);
  scheduleMindMapSave();
}

function updateSelectedMindMapColor(prop, value) {
  const selected = getMindMapNode(state.mindMapSelectedId);
  const color = normalizeMindMapColor(value);
  if (!selected || !color) return;
  selected[prop] = color;
  renderMindMap();
  scheduleMindMapSave();
}

function openMindMapNativeColorPicker(input) {
  if (!input || input.disabled) return;
  try {
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  } catch (_) {
    input.click();
  }
}

function createMindMapColorSwatch(option, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mindmap-color-swatch";
  button.dataset.color = option.value;
  button.style.setProperty("--mindmap-swatch-color", option.value);
  button.setAttribute("aria-label", `${option.label}を選択`);
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", e => onClick(e, option.value, option));
  return button;
}

function renderMindMapColorPalettes() {
  getMindMapColorControls().forEach(control => {
    if (!control.palette) return;
    control.palette.innerHTML = "";
    MINDMAP_COLOR_PALETTE.forEach(option => {
      const button = createMindMapColorSwatch(option, (e, color) => {
        e.stopPropagation();
        beginMindMapEditUndo();
        updateSelectedMindMapColor(control.prop, color);
        endMindMapEditUndo();
      });
      control.palette.appendChild(button);
    });
  });
}

function renderMindMapContextColorPalettes() {
  els.mindMapContextMenu.querySelectorAll("[data-mindmap-context-color-palette]").forEach(palette => {
    palette.innerHTML = "";
    const prop = palette.dataset.mindmapContextColorPalette;
    MINDMAP_COLOR_PALETTE.forEach(option => {
      const button = createMindMapColorSwatch(option, (e, color) => {
        e.stopPropagation();
        const node = getMindMapNode(state.mindMapContextNodeId);
        if (!node) return;
        state.mindMapSelectedId = node.id;
        beginMindMapEditUndo();
        updateSelectedMindMapColor(prop, color);
        endMindMapEditUndo();
        updateMindMapContextColorPaletteState(getMindMapNode(node.id));
      });
      palette.appendChild(button);
    });
  });

  if (!els.mindMapLinkContextPalette) return;
  els.mindMapLinkContextPalette.innerHTML = "";
  MINDMAP_COLOR_PALETTE.forEach(option => {
    const button = createMindMapColorSwatch(option, (e, color) => {
      e.stopPropagation();
      const child = getMindMapNode(state.mindMapContextLinkNodeId);
      if (!child || !child.parent_id) return;
      state.mindMapSelectedId = child.id;
      pushMindMapUndoSnapshot();
      child.link_color = color;
      renderMindMap();
      scheduleMindMapSave();
      updateMindMapLinkContextPaletteState(getMindMapNode(child.id));
    });
    els.mindMapLinkContextPalette.appendChild(button);
  });
}

function bindMindMapColorControl(control) {
  const trigger = control.button?.querySelector(".mindmap-color-current-trigger");
  trigger?.addEventListener("click", e => {
    e.stopPropagation();
    if (control.button.getAttribute("aria-disabled") === "true") return;
    const shouldOpen = Boolean(control.palette?.hidden);
    closeMindMapColorControls(control.button);
    setMindMapColorControlOpen(control, shouldOpen);
  });
}

function setMindMapColorControlOpen(control, open) {
  if (!control?.button || !control.palette) return;
  const canOpen = open && control.button.getAttribute("aria-disabled") !== "true";
  const trigger = control.button.querySelector(".mindmap-color-current-trigger");
  control.palette.hidden = !canOpen;
  control.button.classList.toggle("is-open", canOpen);
  if (trigger) trigger.setAttribute("aria-expanded", String(canOpen));
}

function closeMindMapColorControls(exceptButton = null) {
  getMindMapColorControls().forEach(control => {
    if (control.button !== exceptButton) setMindMapColorControlOpen(control, false);
  });
}

function positionMindMapMenu(menu, x, y) {
  if (!menu) return;
  menu.hidden = false;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  if (x + mw > window.innerWidth) menu.style.left = `${window.innerWidth - mw - 6}px`;
  if (y + mh > window.innerHeight) menu.style.top = `${window.innerHeight - mh - 6}px`;
}

function positionMindMapCtxMenu(x, y) {
  positionMindMapMenu(els.mindMapContextMenu, x, y);
}

function positionMindMapLinkCtxMenu(x, y) {
  positionMindMapMenu(els.mindMapLinkContextMenu, x, y);
}

function showMindMapCtxMenu(x, y, nodeId) {
  const node = getMindMapNode(nodeId);
  if (!node) return;

  hideCtxMenu();
  hideMediaCtxMenu();
  closeMindMapListPanel();
  if (els.accountMenu) els.accountMenu.hidden = true;
  if (els.mindMapLinkContextMenu) els.mindMapLinkContextMenu.hidden = true;
  state.mindMapContextLinkNodeId = null;

  state.mindMapContextNodeId = nodeId;
  state.mindMapSelectedId = nodeId;
  renderMindMap();

  const menu = els.mindMapContextMenu;
  const alignTarget = getMindMapAlignTarget(node);
  const hiddenCount = countMindMapDescendants(node.id);
  const toggleBtn = menu.querySelector('[data-mindmap-action="toggle-children"]');
  const alignBtn = menu.querySelector('[data-mindmap-action="align"]');
  const undoBtn = menu.querySelector('[data-mindmap-action="undo"]');
  const deleteBtn = menu.querySelector('[data-mindmap-action="delete"]');
  if (toggleBtn) {
    toggleBtn.disabled = hiddenCount === 0;
    toggleBtn.textContent = node.collapsed ? "▸　子を表示" : "▾　子を隠す";
  }
  if (alignBtn) alignBtn.disabled = !alignTarget.parent || alignTarget.nodes.length < 2;
  if (undoBtn) undoBtn.disabled = state.mindMapUndoStack.length === 0;
  if (deleteBtn) deleteBtn.disabled = node.parent_id === null;
  updateMindMapContextColorPaletteState(node);

  positionMindMapCtxMenu(x, y);
}

function showMindMapLinkCtxMenu(x, y, childId) {
  const child = getMindMapNode(childId);
  const parent = child?.parent_id ? getMindMapNode(child.parent_id) : null;
  if (!child || !parent) return;

  hideCtxMenu();
  hideMediaCtxMenu();
  closeMindMapListPanel();
  if (els.accountMenu) els.accountMenu.hidden = true;
  els.mindMapContextMenu.hidden = true;
  state.mindMapContextNodeId = null;

  state.mindMapContextLinkNodeId = childId;
  state.mindMapSelectedId = childId;
  renderMindMap();
  updateMindMapLinkContextPaletteState(getMindMapNode(childId));
  positionMindMapLinkCtxMenu(x, y);
}

function hideMindMapCtxMenu() {
  els.mindMapContextMenu.hidden = true;
  if (els.mindMapLinkContextMenu) els.mindMapLinkContextMenu.hidden = true;
  state.mindMapContextNodeId = null;
  state.mindMapContextLinkNodeId = null;
}

els.mindMapBtn.addEventListener("click", openMindMapPanel);
els.mindMapClose.addEventListener("click", closeMindMapPanel);
els.mindMapTitleInput.addEventListener("input", () => {
  if (!state.mindMap) return;
  beginMindMapEditUndo();
  state.mindMap.title = (els.mindMapTitleInput.value || "新しいマインドマップ").slice(0, 80);
  scheduleMindMapSave();
});
els.mindMapTitleInput.addEventListener("blur", () => {
  if (!state.mindMap) return;
  state.mindMap.title = (els.mindMapTitleInput.value.trim() || "新しいマインドマップ").slice(0, 80);
  els.mindMapTitleInput.value = state.mindMap.title;
  endMindMapEditUndo();
  scheduleMindMapSave();
});
els.mindMapNodeTitleInput.addEventListener("compositionstart", () => {
  _isMindMapNodeTitleComposing = true;
});
els.mindMapNodeTitleInput.addEventListener("compositionend", e => {
  _isMindMapNodeTitleComposing = false;
  beginMindMapEditUndo();
  updateSelectedMindMapTitle(e.currentTarget.value);
});
els.mindMapNodeTitleInput.addEventListener("input", e => {
  if (isImeComposing(e, _isMindMapNodeTitleComposing)) return;
  beginMindMapEditUndo();
  updateSelectedMindMapTitle(e.currentTarget.value);
});
els.mindMapNodeTitleInput.addEventListener("blur", () => {
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) {
    endMindMapEditUndo();
    return;
  }
  selected.title = (els.mindMapNodeTitleInput.value.trim() || "トピック").slice(0, 80);
  els.mindMapNodeTitleInput.value = selected.title;
  endMindMapEditUndo();
  renderMindMap();
  scheduleMindMapSave();
});
els.mindMapNodeTitleInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !isImeComposing(e, _isMindMapNodeTitleComposing)) {
    e.preventDefault();
    els.mindMapNodeTitleInput.blur();
  }
});
renderMindMapColorPalettes();
renderMindMapContextColorPalettes();
getMindMapColorControls().forEach(bindMindMapColorControl);
els.mindMapAddChildBtn?.addEventListener("click", () => addMindMapNode(state.mindMapSelectedId));
els.mindMapAlignChildrenBtn?.addEventListener("click", alignMindMapSiblingNodes);
els.mindMapDeleteNodeBtn?.addEventListener("click", deleteSelectedMindMapNode);
els.mindMapUndoBtn.addEventListener("click", undoMindMapLastChange);
els.mindMapContextMenu.addEventListener("click", async e => {
  const btn = e.target.closest("[data-mindmap-action]");
  if (!btn || btn.disabled) return;

  const action = btn.dataset.mindmapAction;
  const nodeId = state.mindMapContextNodeId;
  hideMindMapCtxMenu();
  if (!getMindMapNode(nodeId)) return;

  state.mindMapSelectedId = nodeId;
  switch (action) {
    case "rename":
      startMindMapNodeEdit(nodeId);
      break;
    case "add-child":
      addMindMapNode(nodeId);
      break;
    case "toggle-children":
      toggleMindMapChildren(nodeId);
      break;
    case "align":
      alignMindMapSiblingNodes();
      break;
    case "undo":
      await undoMindMapLastChange();
      break;
    case "center":
      centerMindMap();
      break;
    case "delete":
      renderMindMap();
      await deleteSelectedMindMapNode();
      break;
  }
});
els.mindMapNewBtn.addEventListener("click", createNewMindMap);
els.mindMapSideNewBtn?.addEventListener("click", createNewMindMap);
els.mindMapListBtn.addEventListener("click", () => {
  if (els.mindMapListPanel.hidden) openMindMapListPanel();
  else closeMindMapListPanel();
});
els.mindMapListItems.addEventListener("click", e => {
  const item = e.target.closest(".mindmap-list-item");
  if (!item || item.classList.contains("is-editing")) return;
  const id = item.dataset.id;
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "rename") {
    e.stopPropagation();
    startMindMapListRename(id);
  } else if (action === "delete") {
    e.stopPropagation();
    deleteMindMap(id);
  } else {
    switchMindMap(id);
  }
});
els.mindMapCenterBtn?.addEventListener("click", centerMindMap);
els.mindMapZoomOutBtn.addEventListener("click", () => setMindMapZoom(state.mindMapZoom - 0.12));
els.mindMapZoomInBtn.addEventListener("click", () => setMindMapZoom(state.mindMapZoom + 0.12));
els.mindMapCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = els.mindMapCanvas.getBoundingClientRect();
  setMindMapZoom(
    state.mindMapZoom + (e.deltaY < 0 ? 0.08 : -0.08),
    { x: e.clientX - rect.left, y: e.clientY - rect.top },
  );
}, { passive: false });
els.mindMapCanvas.addEventListener("pointerdown", e => {
  if (e.button !== 0 || e.target.closest(".mindmap-node, .mindmap-node-edit, .mindmap-link-hit")) return;
  els.mindMapCanvas.setPointerCapture(e.pointerId);
  state.mindMapPanning = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    panX: state.mindMapPanX,
    panY: state.mindMapPanY,
  };
  els.mindMapCanvas.classList.add("is-panning");
});
els.mindMapCanvas.addEventListener("contextmenu", e => {
  if (e.target.closest(".mindmap-node, .mindmap-link-hit")) return;
  e.preventDefault();
  hideMindMapCtxMenu();
});
els.mindMapCanvas.addEventListener("pointermove", e => {
  const pan = state.mindMapPanning;
  if (!pan || pan.pointerId !== e.pointerId) return;
  state.mindMapPanX = pan.panX + e.clientX - pan.startX;
  state.mindMapPanY = pan.panY + e.clientY - pan.startY;
  applyMindMapTransform();
});
function finishMindMapPan(e) {
  if (!state.mindMapPanning || state.mindMapPanning.pointerId !== e.pointerId) return;
  state.mindMapPanning = null;
  els.mindMapCanvas.classList.remove("is-panning");
}
els.mindMapCanvas.addEventListener("pointerup", finishMindMapPan);
els.mindMapCanvas.addEventListener("pointercancel", finishMindMapPan);
window.addEventListener("resize", () => {
  if (!els.mindMapOverlay.hidden && !state.mindMapCentered) centerMindMap();
});

function resetMindMapState() {
  clearTimeout(state.mindMapSaveTimer);
  state.mindMap = null;
  state.mindMapList = [];
  state.mindMapLoaded = false;
  state.mindMapSelectedId = null;
  state.mindMapContextNodeId = null;
  state.mindMapContextLinkNodeId = null;
  state.mindMapUndoStack = [];
  state.mindMapEditSnapshot = null;
  state.isApplyingMindMapUndo = false;
  state.mindMapSaveTimer = null;
  state.mindMapZoom = 1;
  state.mindMapPanX = 0;
  state.mindMapPanY = 0;
  state.mindMapCentered = false;
  state.mindMapPanning = null;
  state.mindMapNodeDrag = null;
  els.mindMapOverlay.hidden = true;
  els.mindMapListPanel.hidden = true;
  els.mindMapContextMenu.hidden = true;
  if (els.mindMapLinkContextMenu) els.mindMapLinkContextMenu.hidden = true;
  els.mindMapLinks.innerHTML = "";
  els.mindMapNodes.innerHTML = "";
  updateMindMapUndoButton();
}

// ── Media ─────────────────────────────────────────────────────────────────────

async function uploadMedia(noteId, files) {
  if (!STORAGE_ENABLED) {
    showToast("画像・動画の添付は現在利用できません（Firebase Storage未対応）。");
    return;
  }
  const note = state.data.notes.find(n => n.id === noteId);
  if (!note) return;

  for (const file of files) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showToast(`${file.name}: 画像・動画ファイルのみ添付できます。`);
      continue;
    }
    try {
      const ext         = (file.name.match(/\.([^.\/]+)$/)?.[1] || "bin").toLowerCase();
      const mediaId     = makeId();
      const storagePath = `users/${state.uid}/media/${mediaId}.${ext}`;
      const fileRef     = storage.ref(storagePath);
      await fileRef.put(file, { contentType: file.type });
      const downloadURL = await fileRef.getDownloadURL();
      const item = {
        id:            mediaId,
        filename:      storagePath,
        original_name: file.name,
        mime_type:     file.type,
        created_at:    nowIso(),
        storagePath,
        downloadURL,
      };
      const updates = { media: [...(note.media ?? []), item], updated_at: nowIso() };
      await notesCollection().doc(noteId).set(updates, { merge: true });
      Object.assign(note, updates);
      insertMediaElement(item);
    } catch (e) { showToast(`${file.name}: ${e.message}`); }
  }
}

function createMediaCaretAnchor() {
  const anchor = document.createElement("span");
  anchor.className = "media-caret-anchor";
  anchor.appendChild(document.createTextNode("\u200b"));
  return anchor;
}

function createMediaTextLine() {
  return createMediaCaretAnchor();
}

// 画像の実際の高さが変わるたび（読み込み完了・サイズ変更・トリミング・ウィンドウ幅変更など）に
// 隣接するキャレットの高さを追従させる。rAF や load イベント頼みの一回限りの同期だけでは
// 画像サイズ確定前に高さ 0 で同期されてしまい、キャレットが画像とずれたままになることがあるため。
const mediaFigureResizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const figure = entry.target;
    if (!isMediaFigureReady(figure)) continue;
    const height = figure.getBoundingClientRect().height;
    if (height <= 0) continue;
    const px = `${Math.round(height)}px`;
    for (const dir of ["previousSibling", "nextSibling"]) {
      const sibling = getMediaBoundarySibling(figure, dir);
      if (isMediaCaretAnchor(sibling)) sibling.style.setProperty("--media-caret-height", px);
    }
  }
});

function lockInlineMediaDrag(root = els.contentInput) {
  root.querySelectorAll(".inline-media-figure").forEach(figure => {
    figure.contentEditable = "false";
    figure.draggable = false;
    figure.setAttribute("draggable", "false");
    mediaFigureResizeObserver.observe(figure);
  });
  root.querySelectorAll(".inline-media").forEach(media => {
    media.draggable = false;
    media.setAttribute("draggable", "false");
    media.addEventListener("load", () => scheduleMediaCaretSync(root), { once: true });
    media.addEventListener("loadedmetadata", () => scheduleMediaCaretSync(root), { once: true });
    if ((media.tagName === "IMG" && media.complete) ||
        (media.tagName === "VIDEO" && media.readyState > 0)) {
      scheduleMediaCaretSync(root);
    }
  });
}

function isEmptyMediaTextLine(node) {
  return node?.classList?.contains("media-text-line") &&
    !node.textContent.replace(/\u200b/g, "").trim() &&
    !node.querySelector("img, video");
}

function isMediaCaretAnchor(node) {
  return node?.classList?.contains("media-caret-anchor");
}

function isInlineMediaFigure(node) {
  return node?.nodeType === Node.ELEMENT_NODE &&
    node.classList.contains("inline-media-figure");
}

function isIgnorableMediaBoundaryNode(node) {
  return node?.nodeType === Node.TEXT_NODE &&
    !node.nodeValue.replace(/\u200b/g, "").trim();
}

function getMediaBoundarySibling(node, direction) {
  let cur = node[direction];
  while (cur && isIgnorableMediaBoundaryNode(cur)) cur = cur[direction];
  return cur;
}

function isEmptyMediaCaretAnchor(node) {
  return isMediaCaretAnchor(node) &&
    !node.textContent.replace(/\u200b/g, "").trim() &&
    !node.querySelector("img, video");
}

function getAdjacentMediaFigure(anchor) {
  const prev = getMediaBoundarySibling(anchor, "previousSibling");
  if (isInlineMediaFigure(prev)) {
    return prev;
  }
  const next = getMediaBoundarySibling(anchor, "nextSibling");
  if (isInlineMediaFigure(next)) {
    return next;
  }
  return null;
}

// 画像/動画が読み込み済みで実寸が確定しているかどうか。読み込み前は figure の高さが
// 0 や 1px などの仮の値になることがあり、ここで弾かないとその仮の値が
// --media-caret-height に焼き付いて二度と正しい高さに直らなくなる。
function isMediaFigureReady(figure) {
  const media = figure.querySelector("img, video");
  if (!media) return false;
  return media.tagName === "IMG"
    ? media.complete && media.naturalWidth > 0
    : media.readyState > 0 && media.videoWidth > 0;
}

function syncMediaCaretAnchor(anchor) {
  const figure = getAdjacentMediaFigure(anchor);
  if (!figure) return false;
  if (isMediaFigureReady(figure)) {
    const height = figure.getBoundingClientRect().height;
    if (height > 0) {
      anchor.style.setProperty("--media-caret-height", `${Math.round(height)}px`);
    }
  }
  anchor.classList.add("is-empty-media-caret");
  return true;
}

function clearActiveMediaCaret(root = els.contentInput) {
  root.querySelectorAll(".media-caret-anchor.is-active-media-caret")
    .forEach(anchor => anchor.classList.remove("is-active-media-caret"));
}

function setActiveMediaCaret(anchor) {
  clearActiveMediaCaret();
  if (anchor && isEmptyMediaCaretAnchor(anchor) && syncMediaCaretAnchor(anchor)) {
    anchor.classList.add("is-active-media-caret");
  }
}

function updateActiveMediaCaretFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    clearActiveMediaCaret();
    return;
  }
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  const anchor = container.nodeType === Node.ELEMENT_NODE
    ? container.closest?.(".media-caret-anchor")
    : container.parentElement?.closest?.(".media-caret-anchor");
  if (anchor && els.contentInput.contains(anchor)) {
    setActiveMediaCaret(anchor);
  } else {
    clearActiveMediaCaret();
  }
}

function syncMediaCaretAnchors(root = els.contentInput) {
  root.querySelectorAll(".media-caret-anchor").forEach(anchor => {
    if (isEmptyMediaCaretAnchor(anchor)) syncMediaCaretAnchor(anchor);
  });
}

function scheduleMediaCaretSync(root = els.contentInput) {
  requestAnimationFrame(() => {
    syncMediaCaretAnchors(root);
    updateActiveMediaCaretFromSelection();
    requestAnimationFrame(() => {
      syncMediaCaretAnchors(root);
      updateActiveMediaCaretFromSelection();
    });
  });
}

function normalizeMediaCaretAnchors(root = els.contentInput) {
  root.querySelectorAll(".media-text-line").forEach(line => {
    if (isEmptyMediaTextLine(line)) {
      line.replaceWith(createMediaCaretAnchor());
    } else {
      line.classList.remove("media-text-line", "is-empty-media-line");
    }
  });

  root.querySelectorAll(".media-caret-anchor").forEach(anchor => {
    // \u7a7a\u72b6\u614b\u306e contenteditable \u8981\u7d20\u306b Chrome \u304c <br> \u3092\u633f\u5165\u3059\u308b\u3053\u3068\u304c\u3042\u308a\u3001
    // (br, 0) \u306f\u30ad\u30e3\u30ec\u30c3\u30c8\u4f4d\u7f6e\u3068\u3057\u3066\u4e0d\u5b89\u5b9a\u306a\u305f\u3081 \u200b \u306b\u7f6e\u304d\u63db\u3048\u3066\u304a\u304f\u3002
    anchor.querySelectorAll("br").forEach(br => br.remove());
    if (!anchor.firstChild) anchor.appendChild(document.createTextNode("\u200b"));
    if (!isEmptyMediaCaretAnchor(anchor)) {
      anchor.classList.remove("media-caret-anchor", "is-empty-media-caret", "is-active-media-caret");
      anchor.style.removeProperty("--media-caret-height");
      return;
    }
    if (!syncMediaCaretAnchor(anchor)) anchor.remove();
  });
}

function placeCaretInMediaCaretAnchor(anchor) {
  if (!anchor) return;
  els.contentInput.focus();
  anchor.querySelectorAll("br").forEach(br => br.remove());
  if (!anchor.firstChild) anchor.appendChild(document.createTextNode("\u200b"));
  setActiveMediaCaret(anchor);
  try {
    const range = document.createRange();
    range.setStart(anchor.firstChild, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (_) {
    // Some embedded browser layers can fail range placement; keep the visible caret.
  }
  requestAnimationFrame(() => setActiveMediaCaret(anchor));
}

function placeCaretInMediaTextLine(line) {
  placeCaretInMediaCaretAnchor(line);
}

function getMediaBoundaryChild(parent, offset, direction) {
  let index = direction === "before" ? offset - 1 : offset;
  while (index >= 0 && index < parent.childNodes.length) {
    const node = parent.childNodes[index];
    if (!isIgnorableMediaBoundaryNode(node)) return node;
    index += direction === "before" ? -1 : 1;
  }
  return null;
}

function nodeHasVisibleEditorContent(node) {
  if (!node) return false;
  if (node.nodeType === Node.TEXT_NODE) {
    return !!node.nodeValue.replace(/\u200b/g, "").trim();
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  if (isMediaCaretAnchor(node)) return false;
  if (isInlineMediaFigure(node) || node.matches?.("img, video")) return true;
  return !!node.textContent.replace(/\u200b/g, "").trim() ||
    !!node.querySelector?.("img, video, .inline-media-figure");
}

function isCaretAtStartOfEditorBlock(range) {
  let node = range.startContainer;
  let offset = range.startOffset;

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.nodeValue.slice(0, offset).replace(/\u200b/g, "").trim()) return false;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    for (let i = 0; i < offset; i++) {
      if (nodeHasVisibleEditorContent(node.childNodes[i])) return false;
    }
  }

  while (node && node !== els.contentInput) {
    let prev = node.previousSibling;
    while (prev) {
      if (nodeHasVisibleEditorContent(prev)) return false;
      prev = prev.previousSibling;
    }
    node = node.parentNode;
  }

  return true;
}

function getTopLevelEditorNode(node) {
  while (node && node.parentNode && node.parentNode !== els.contentInput) {
    node = node.parentNode;
  }
  return node && node.parentNode === els.contentInput ? node : null;
}

function getPreviousMediaFigureForRange(range) {
  const topNode = range.startContainer === els.contentInput
    ? getMediaBoundaryChild(els.contentInput, range.startOffset, "before")
    : getTopLevelEditorNode(range.startContainer);
  if (!topNode) return null;

  let prev = getMediaBoundarySibling(topNode, "previousSibling");
  if (isMediaCaretAnchor(prev)) prev = getMediaBoundarySibling(prev, "previousSibling");
  return isInlineMediaFigure(prev) ? prev : null;
}

function rememberMediaCaretRepair(e) {
  state.pendingMediaCaretFigure = null;
  if (e.key !== "Backspace" && e.key !== "Delete") return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!els.contentInput.contains(range.startContainer) && range.startContainer !== els.contentInput) return;
  if (!isCaretAtStartOfEditorBlock(range)) return;
  state.pendingMediaCaretFigure = getPreviousMediaFigureForRange(range);
}

function ensureAnchorAfterFigure(figure) {
  if (!figure) return null;
  let next = getMediaBoundarySibling(figure, "nextSibling");
  if (!isMediaCaretAnchor(next)) {
    figure.insertAdjacentElement("afterend", createMediaCaretAnchor());
    next = figure.nextElementSibling;
  }
  syncMediaCaretAnchor(next);
  return next;
}

function ensureAnchorBeforeFigure(figure) {
  if (!figure) return null;
  let prev = getMediaBoundarySibling(figure, "previousSibling");
  if (!isMediaCaretAnchor(prev)) {
    figure.insertAdjacentElement("beforebegin", createMediaCaretAnchor());
    prev = figure.previousElementSibling;
  }
  syncMediaCaretAnchor(prev);
  return prev;
}

function placeCaretBesideFigure(figure, side) {
  const anchor = side === "before"
    ? ensureAnchorBeforeFigure(figure)
    : ensureAnchorAfterFigure(figure);
  placeCaretInMediaCaretAnchor(anchor);
}

function getMediaSideFromPoint(figure, clientX) {
  if (!figure) return null;
  const rect = figure.getBoundingClientRect();
  const edge = Math.min(28, Math.max(14, rect.width * 0.08));
  if (clientX <= rect.left + edge) return "before";
  if (clientX >= rect.right - edge) return "after";
  return null;
}

function getMediaFigureNearPoint(clientX, clientY) {
  const maxDistance = 18;
  for (const figure of els.contentInput.querySelectorAll(".inline-media-figure")) {
    const rect = figure.getBoundingClientRect();
    if (clientY < rect.top || clientY > rect.bottom) continue;
    if (Math.abs(clientX - rect.left) <= maxDistance) return { figure, side: "before" };
    if (Math.abs(clientX - rect.right) <= maxDistance) return { figure, side: "after" };
  }
  return null;
}

function restorePendingMediaCaret() {
  const figure = state.pendingMediaCaretFigure;
  state.pendingMediaCaretFigure = null;
  if (!figure?.isConnected) return false;
  const anchor = ensureAnchorAfterFigure(figure);
  placeCaretInMediaCaretAnchor(anchor);
  return true;
}

function repairMediaCaretAfterEdit() {
  ensureMediaTextLines();
  if (restorePendingMediaCaret()) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (range.startContainer !== els.contentInput) return;

  const before = getMediaBoundaryChild(els.contentInput, range.startOffset, "before");
  if (!isInlineMediaFigure(before)) return;

  const anchor = ensureAnchorAfterFigure(before);
  placeCaretInMediaCaretAnchor(anchor);
}

function ensureMediaTextLines() {
  lockInlineMediaDrag();
  normalizeMediaCaretAnchors();
  els.contentInput.querySelectorAll(".inline-media-figure").forEach(figure => {
    const prev = getMediaBoundarySibling(figure, "previousSibling");
    if (!isMediaCaretAnchor(prev) && (!prev || isInlineMediaFigure(prev))) {
      figure.insertAdjacentElement("beforebegin", createMediaCaretAnchor());
    }

    const next = getMediaBoundarySibling(figure, "nextSibling");
    if (!isMediaCaretAnchor(next) && (!next || isInlineMediaFigure(next))) {
      figure.insertAdjacentElement("afterend", createMediaCaretAnchor());
    }
  });
  scheduleMediaCaretSync();
}

// 画像の左右のキャレットアンカーは幅8pxしかなく、画像の隣に文字を詰め込む
// 場所ではない。ここに文字を打ち始めたら、画像から見て外側＝前のアンカー
// なら上の行末、後ろのアンカーなら下の行頭へキャレットを移動してから
// 入力させる。
function placeCaretAtDivEdge(div, edge) {
  const range = document.createRange();
  if (edge === "start") {
    const first = div.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) range.setStart(first, 0);
    else range.setStart(div, 0);
  } else {
    const last = div.lastChild;
    if (last && last.nodeType === Node.TEXT_NODE) range.setStart(last, last.length);
    else range.setStart(div, div.childNodes.length);
  }
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function redirectMediaCaretTyping() {
  const anchor = els.contentInput.querySelector(".media-caret-anchor.is-active-media-caret");
  if (!anchor) return false;

  const prev = getMediaBoundarySibling(anchor, "previousSibling");
  const next = getMediaBoundarySibling(anchor, "nextSibling");

  let outerSibling, insertSide, edge;
  if (isInlineMediaFigure(next)) {
    outerSibling = prev;
    insertSide = "beforebegin";
    edge = "end";
  } else if (isInlineMediaFigure(prev)) {
    outerSibling = next;
    insertSide = "afterend";
    edge = "start";
  } else {
    return false;
  }

  let target = outerSibling;
  if (!target || target.tagName !== "DIV") {
    target = document.createElement("div");
    anchor.insertAdjacentElement(insertSide, target);
  }

  clearActiveMediaCaret();
  placeCaretAtDivEdge(target, edge);
  return true;
}

function insertMediaElement(item) {
  const url     = item.downloadURL;
  const isVideo = item.mime_type.startsWith("video/") ||
                  /\.(mp4|mov|avi|webm|m4v|mkv)$/i.test(item.filename);

  const figure = document.createElement("figure");
  figure.className       = "inline-media-figure";
  figure.contentEditable = "false";
  figure.draggable       = false;

  const mediaEl = document.createElement(isVideo ? "video" : "img");
  mediaEl.src       = url;
  mediaEl.className = "inline-media";
  mediaEl.draggable = false;
  mediaEl.addEventListener(isVideo ? "loadedmetadata" : "load", () => scheduleMediaCaretSync(), { once: true });
  if (isVideo) { mediaEl.controls = true; mediaEl.preload = "metadata"; }
  else         { mediaEl.alt = item.original_name; }

  figure.appendChild(mediaEl);

  const sel = window.getSelection();
  const hasCursor = sel && sel.rangeCount > 0 &&
    els.contentInput.contains(sel.getRangeAt(0).commonAncestorContainer);
  if (hasCursor) {
    const range = sel.getRangeAt(0);
    const insertionPoint = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer.closest?.(".media-text-line, .media-caret-anchor")
      : range.commonAncestorContainer.parentElement?.closest?.(".media-text-line, .media-caret-anchor");
    if (isEmptyMediaTextLine(insertionPoint) || isEmptyMediaCaretAnchor(insertionPoint)) {
      insertionPoint.replaceWith(figure);
    } else {
      range.deleteContents();
      range.collapse(false);
      range.insertNode(figure);
    }
  } else {
    els.contentInput.appendChild(figure);
  }

  ensureMediaTextLines();
  const line = isMediaCaretAnchor(figure.nextElementSibling)
    ? figure.nextElementSibling
    : createMediaCaretAnchor();
  if (!line.isConnected) figure.insertAdjacentElement("afterend", line);
  try {
    placeCaretInMediaCaretAnchor(line);
  } catch (_) { els.contentInput.focus(); }

  figure.scrollIntoView({ behavior: "smooth", block: "nearest" });
  updateEmptyState();
  scheduleSave();
}

// ── ライトボックス ─────────────────────────────────────────────────────────────

function openLightbox(imgEl) {
  els.lightboxImg.src = imgEl.src;
  els.lightboxImg.alt = imgEl.alt ?? "";
  els.lightboxOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  els.lightboxOverlay.hidden = true;
  els.lightboxImg.src        = "";
  document.body.style.overflow = "";
}

els.lightboxOverlay.addEventListener("click", e => {
  if (e.target === els.lightboxOverlay || e.target === els.lightboxImg) closeLightbox();
});
els.lightboxClose.addEventListener("click", closeLightbox);

// ── トリミングモーダル ─────────────────────────────────────────────────────────

const HANDLE_HIT  = 16;
const HANDLE_SIZE = 10;

const _crop = {
  figure:    null,
  imgEl:     null,   // DOM <img>（src 更新用）
  canvasImg: null,   // キャンバス描画用の Image オブジェクト
  scale:     1,
  rect:      { x: 0, y: 0, w: 100, h: 100 },
  drag:      null,   // { type, startX, startY, initRect }
};

function _cropClientToCanvas(e) {
  const c = els.cropCanvas;
  const r = c.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - r.left) * (c.width  / r.width),
    y: (src.clientY - r.top)  * (c.height / r.height),
  };
}

function _cropHitType(px, py) {
  const { x, y, w, h } = _crop.rect;
  const H = HANDLE_HIT;
  if (Math.abs(px - x)     < H && Math.abs(py - y)     < H) return "nw";
  if (Math.abs(px - x - w) < H && Math.abs(py - y)     < H) return "ne";
  if (Math.abs(px - x)     < H && Math.abs(py - y - h) < H) return "sw";
  if (Math.abs(px - x - w) < H && Math.abs(py - y - h) < H) return "se";
  if (px > x && px < x + w && py > y && py < y + h) return "move";
  return "new";
}

function _cropClamp({ x, y, w, h }) {
  const W = els.cropCanvas.width, H = els.cropCanvas.height;
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.max(4, w); h = Math.max(4, h);
  if (x + w > W) w = W - x;
  if (y + h > H) h = H - y;
  return { x, y, w, h };
}

function drawCropCanvas() {
  const canvas = els.cropCanvas;
  const ctx    = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const img = _crop.canvasImg;   // 専用 Image オブジェクトを使用
  if (!img) return;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const { x, y, w, h } = _crop.rect;

  // 外側を暗く
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(x, y, w, h);
  ctx.fill("evenodd");
  ctx.restore();

  // 選択範囲の画像を再描画（明るく見せる）
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();

  // 枠線
  ctx.strokeStyle = "#fff";
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // 三分割線
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth   = 0.75;
  ctx.beginPath();
  for (const t of [1/3, 2/3]) {
    ctx.moveTo(x + w * t, y);     ctx.lineTo(x + w * t, y + h);
    ctx.moveTo(x,         y + h * t); ctx.lineTo(x + w, y + h * t);
  }
  ctx.stroke();

  // コーナーハンドル
  ctx.fillStyle  = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur  = 4;
  const hs = HANDLE_SIZE;
  [[x, y], [x + w - hs, y], [x, y + h - hs], [x + w - hs, y + h - hs]].forEach(([hx, hy]) => {
    ctx.fillRect(hx, hy, hs, hs);
  });
  ctx.shadowBlur = 0;
}

function openCropModal(figure) {
  const imgEl = figure.querySelector("img.inline-media");
  if (!imgEl) return;

  _crop.figure    = figure;
  _crop.imgEl     = imgEl;
  _crop.canvasImg = null;

  // ① モーダルを先に開く（hidden な要素内のキャンバスへの描画は
  //    ブラウザによって無視されることがあるため、先に表示してから描画する）
  els.cropCanvas.width  = 10;
  els.cropCanvas.height = 10;
  els.cropOverlay.hidden = false;

  // ② cache:'no-store' で 304 を完全に回避し、常にフルボディを取得する。
  //    fetch が 304 を返すとボディが空になり blob が空 → canvas が黒くなる。
  //    Blob → ObjectURL → Image.onload 経路は CORS タント・デコード未完了も回避できる。
  fetch(imgEl.src, { cache: 'no-store' })
    .then(r => r.blob())
    .then(blob => {
      if (blob.size === 0) throw new Error("画像データが空です");
      return new Promise((resolve, reject) => {
        const objUrl = URL.createObjectURL(blob);
        const img    = new Image();
        img.onload  = () => { URL.revokeObjectURL(objUrl); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("デコード失敗")); };
        img.src = objUrl;
      });
    })
    .then(img => {
      _crop.canvasImg = img;

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw === 0 || nh === 0) throw new Error("画像サイズが0です");

      const maxW = Math.min(window.innerWidth  * 0.9  - 56, 900);
      const maxH = Math.min(window.innerHeight * 0.72 - 80, 700);
      _crop.scale = Math.min(maxW / nw, maxH / nh, 1);

      const cw = Math.round(nw * _crop.scale);
      const ch = Math.round(nh * _crop.scale);
      els.cropCanvas.width  = cw;
      els.cropCanvas.height = ch;

      _crop.rect = { x: 0, y: 0, w: cw, h: ch };
      _crop.drag = null;
      drawCropCanvas();
    })
    .catch(err => {
      closeCropModal();
      showToast("画像の読み込みに失敗しました: " + err.message);
    });
}

function closeCropModal() {
  els.cropOverlay.hidden = true;
  if (_crop.canvasImg instanceof ImageBitmap) _crop.canvasImg.close();
  _crop.figure    = null;
  _crop.canvasImg = null;
  _crop.drag      = null;
}

// ポインターイベント（マウス + タッチ共通）
els.cropCanvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  els.cropCanvas.setPointerCapture(e.pointerId);
  const { x, y } = _cropClientToCanvas(e);
  const type = _cropHitType(x, y);
  _crop.drag = { type, startX: x, startY: y, initRect: { ..._crop.rect } };
});

els.cropCanvas.addEventListener("pointermove", e => {
  if (!_crop.drag) {
    // カーソル形状を変える
    const { x, y } = _cropClientToCanvas(e);
    const cursors = { nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize", move: "move", new: "crosshair" };
    els.cropCanvas.style.cursor = cursors[_cropHitType(x, y)] ?? "crosshair";
    return;
  }
  e.preventDefault();
  const { x, y } = _cropClientToCanvas(e);
  const dx = x - _crop.drag.startX;
  const dy = y - _crop.drag.startY;
  const r  = _crop.drag.initRect;
  const W  = els.cropCanvas.width, H = els.cropCanvas.height;

  let nr;
  switch (_crop.drag.type) {
    case "new": {
      const lx = Math.min(_crop.drag.startX, x);
      const ly = Math.min(_crop.drag.startY, y);
      nr = _cropClamp({ x: lx, y: ly, w: Math.abs(dx) || 4, h: Math.abs(dy) || 4 });
      break;
    }
    case "move": {
      const nx = Math.max(0, Math.min(r.x + dx, W - r.w));
      const ny = Math.max(0, Math.min(r.y + dy, H - r.h));
      nr = { x: nx, y: ny, w: r.w, h: r.h };
      break;
    }
    case "nw": nr = _cropClamp({ x: r.x + dx, y: r.y + dy, w: r.w - dx, h: r.h - dy }); break;
    case "ne": nr = _cropClamp({ x: r.x,      y: r.y + dy, w: r.w + dx, h: r.h - dy }); break;
    case "sw": nr = _cropClamp({ x: r.x + dx, y: r.y,      w: r.w - dx, h: r.h + dy }); break;
    case "se": nr = _cropClamp({ x: r.x,      y: r.y,      w: r.w + dx, h: r.h + dy }); break;
    default:   nr = _crop.rect;
  }
  _crop.rect = nr;
  drawCropCanvas();
});

els.cropCanvas.addEventListener("pointerup",     () => { _crop.drag = null; });
els.cropCanvas.addEventListener("pointercancel", () => { _crop.drag = null; });

async function confirmCrop() {
  if (!STORAGE_ENABLED) {
    closeCropModal();
    showToast("トリミング機能は現在利用できません（Firebase Storage未対応）。");
    return;
  }
  const { figure, imgEl, scale, rect } = _crop;
  if (!figure || !imgEl) return;

  const nx = Math.round(rect.x / scale);
  const ny = Math.round(rect.y / scale);
  const nw = Math.round(rect.w / scale);
  const nh = Math.round(rect.h / scale);
  if (nw < 2 || nh < 2) { showToast("範囲が小さすぎます。"); return; }
  pushUndoSnapshot(snapshotFromNote(getSelectedNote()));

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width  = nw;
  tmpCanvas.height = nh;
  // canvasImg（proxyImg）でトリミング描画。DOM <img> は CORS タイントの懸念があるため使わない
  const drawSrc = _crop.canvasImg || imgEl;
  tmpCanvas.getContext("2d").drawImage(drawSrc, nx, ny, nw, nh, 0, 0, nw, nh);

  closeCropModal();

  try {
    const blob = await new Promise((res, rej) =>
      tmpCanvas.toBlob(b => b ? res(b) : rej(new Error("変換失敗")), "image/png")
    );
    const note        = getSelectedNote();
    const mediaId     = makeId();
    const storagePath = `users/${state.uid}/media/${mediaId}.png`;
    const fileRef     = storage.ref(storagePath);
    await fileRef.put(blob, { contentType: "image/png" });
    const downloadURL = await fileRef.getDownloadURL();
    const item = {
      id:            mediaId,
      filename:      storagePath,
      original_name: "cropped.png",
      mime_type:     "image/png",
      created_at:    nowIso(),
      storagePath,
      downloadURL,
    };
    note.media = [...(note.media ?? []), item];

    // DOM の img src を新しいファイルに差し替え
    imgEl.addEventListener("load", () => scheduleMediaCaretSync(), { once: true });
    imgEl.src = downloadURL;
    imgEl.alt = item.original_name;
    scheduleMediaCaretSync();

    scheduleSave();
    showToast("トリミングしました。");
  } catch (err) {
    showToast("トリミングに失敗しました: " + err.message);
  }
}

els.cropOk    .addEventListener("click", confirmCrop);
els.cropCancel.addEventListener("click", closeCropModal);
els.cropOverlay.addEventListener("click", e => {
  if (e.target === els.cropOverlay) closeCropModal();
});

// ── メディアコンテキストメニュー ──────────────────────────────────────────────

function showMediaCtxMenu(x, y, figure) {
  state.mediaCmFigure = figure;
  const isImage = !!figure.querySelector("img.inline-media");
  if (els.mediaSizeSection) els.mediaSizeSection.hidden = !isImage;

  const menu = els.mediaContextMenu;
  menu.hidden = false;
  menu.style.left = `${x}px`;
  menu.style.top  = `${y}px`;
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  if (x + mw > window.innerWidth)  menu.style.left = `${window.innerWidth  - mw - 6}px`;
  if (y + mh > window.innerHeight) menu.style.top  = `${window.innerHeight - mh - 6}px`;
}

function hideMediaCtxMenu() {
  els.mediaContextMenu.hidden = true;
  state.mediaCmFigure = null;
}

// クリップボードへ書き込めるのは image/png のみのブラウザが多いため、
// 元画像が PNG でなければ canvas 経由で PNG に変換する。
async function fetchImageAsPngBlob(src) {
  const res = await fetch(src);
  const blob = await res.blob();
  if (blob.type === "image/png") return blob;

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("PNG変換に失敗しました。")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function copyFigureImageToClipboard(figure) {
  const img = figure.querySelector("img.inline-media");
  if (!img) {
    showToast("コピーできる画像がありません。");
    return;
  }
  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast("このブラウザは画像のコピーに対応していません。");
    return;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": fetchImageAsPngBlob(img.src) })
    ]);
    showToast("画像をコピーしました。");
  } catch (err) {
    showToast("画像のコピーに失敗しました: " + err.message);
  }
}

els.mediaContextMenu.addEventListener("click", e => {
  const btn = e.target.closest("[data-media-action], [data-size]");
  if (!btn || !state.mediaCmFigure) return;

  const action = btn.dataset.mediaAction;

  if (action === "copy") {
    const figure = state.mediaCmFigure;
    hideMediaCtxMenu();
    copyFigureImageToClipboard(figure);
    return;
  }

  if (action === "size" || btn.dataset.size) {
    const figure = state.mediaCmFigure;
    pushUndoSnapshot(snapshotFromNote(getSelectedNote()));
    figure.dataset.size = btn.dataset.size;
    ensureAnchorAfterFigure(figure);
    scheduleMediaCaretSync();
    hideMediaCtxMenu();
    scheduleSave();
    return;
  }

  if (action === "trim") {
    const figure = state.mediaCmFigure;
    hideMediaCtxMenu();
    openCropModal(figure);
    return;
  }

  if (action === "delete") {
    const figure = state.mediaCmFigure;
    pushUndoSnapshot(snapshotFromNote(getSelectedNote()));
    hideMediaCtxMenu();
    figure.remove();
    normalizeMediaCaretAnchors();
    updateEmptyState();
    scheduleSave();
    return;
  }
});

// ── contenteditable イベント委任 ──────────────────────────────────────────────

els.contentInput.addEventListener("click", e => {
  const caretAnchor = e.target.closest(".media-caret-anchor");
  if (caretAnchor) {
    placeCaretInMediaCaretAnchor(caretAnchor);
    return;
  }

  const figure = e.target.closest(".inline-media-figure");
  if (figure) {
    const side = getMediaSideFromPoint(figure, e.clientX);
    if (side) {
      e.preventDefault();
      placeCaretBesideFigure(figure, side);
      return;
    }
  }

  const nearby = getMediaFigureNearPoint(e.clientX, e.clientY);
  if (nearby) {
    placeCaretBesideFigure(nearby.figure, nearby.side);
    return;
  }

  clearActiveMediaCaret();

  // 画像クリック → ライトボックスで表示
  if (e.target.classList.contains("inline-media") && e.target.tagName === "IMG") {
    e.preventDefault();
    openLightbox(e.target);
  }
});

// 右クリック → メディアコンテキストメニュー
els.contentInput.addEventListener("contextmenu", e => {
  const figure = e.target.closest(".inline-media-figure");
  if (!figure) return;
  e.preventDefault(); e.stopPropagation();
  hideCtxMenu();
  showMediaCtxMenu(e.clientX, e.clientY, figure);
});

els.contentInput.addEventListener("dragstart", e => {
  if (!e.target.closest(".inline-media-figure")) return;
  e.preventDefault();
  e.stopPropagation();
});

els.contentInput.addEventListener("dragover", e => {
  if (e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
});

els.contentInput.addEventListener("drop", e => {
  if (e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  e.stopPropagation();
});

// ── ツリーコンテキストメニュー ────────────────────────────────────────────────

function showCtxMenu(x, y, noteId) {
  state.contextNoteId = noteId;
  const note  = getNotes().find(n => n.id === noteId);
  const pinBtn = els.contextMenu.querySelector('[data-action="toggle-pin"]');
  if (pinBtn) {
    const canPin = note?.parent_id === null;
    pinBtn.hidden = !canPin;
    pinBtn.textContent = note?.pinned ? "📌　ピン留めを解除" : "📌　ピン留め";
  }
  const checkItem = els.contextMenu.querySelector('[data-action="toggle-check"]');
  if (checkItem) {
    checkItem.textContent = note?.checked ? "✓　チェックを外す" : "✓　チェックする";
  }
  const siblingTopBtn = els.contextMenu.querySelector('[data-action="move-sibling-top"]');
  if (siblingTopBtn) {
    siblingTopBtn.hidden = false;
  }
  const siblingBottomBtn = els.contextMenu.querySelector('[data-action="move-sibling-bottom"]');
  if (siblingBottomBtn) {
    siblingBottomBtn.hidden = false;
  }
  els.contextMenu.hidden = false;
  els.contextMenu.style.left = `${x}px`;
  els.contextMenu.style.top  = `${y}px`;
  const mw = els.contextMenu.offsetWidth, mh = els.contextMenu.offsetHeight;
  if (x + mw > window.innerWidth)  els.contextMenu.style.left = `${window.innerWidth  - mw - 6}px`;
  if (y + mh > window.innerHeight) els.contextMenu.style.top  = `${window.innerHeight - mh - 6}px`;
}

function hideCtxMenu() { els.contextMenu.hidden = true; state.contextNoteId = null; }

function startInlineRename(noteId) {
  selectNote(noteId);
  const row = els.tree.querySelector(`[data-id="${noteId}"]`);
  if (!row) { els.titleInput.focus(); els.titleInput.select(); return; }
  const span = row.querySelector(".tree-title");
  if (!span) return;
  const orig  = span.textContent;
  const input = document.createElement("input");
  input.className = "tree-rename-input";
  input.value = orig;
  span.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  async function commit() {
    if (done) return; done = true;
    const val = input.value.trim() || orig;
    span.textContent = val; input.replaceWith(span);
    if (val !== orig) {
      try {
        pushUndoSnapshot(snapshotFromNote(getNotes().find(n => n.id === noteId)));
        await updateNote(noteId, { title: val });
        showToast("名前を変更しました。");
      }
      catch (e) { showToast(e.message); await loadNotes(); }
    }
  }
  function cancel() { if (done) return; done = true; span.textContent = orig; input.replaceWith(span); }
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
  });
}

els.contextMenu.addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  const action = btn.dataset.action;
  const id     = state.contextNoteId;
  hideCtxMenu();
  if (!id) return;
  switch (action) {
    case "rename":    startInlineRename(id); break;
    case "add-child": await createNote(id); break;
    case "toggle-check": await toggleCheckedNote(id); break;
    case "toggle-pin": await togglePinnedNote(id); break;
    case "move-sibling-top": await moveNoteToSiblingEdge(id, "start"); break;
    case "move-sibling-bottom": await moveNoteToSiblingEdge(id, "end"); break;
    case "delete":
      state.selectedId = id;
      await deleteSelectedNote();
      break;
  }
});

// ── Global events ─────────────────────────────────────────────────────────────

document.addEventListener("click", e => {
  if (!els.contextMenu.hidden      && !els.contextMenu.contains(e.target))      hideCtxMenu();
  if (!els.mediaContextMenu.hidden && !els.mediaContextMenu.contains(e.target)) hideMediaCtxMenu();
  if (!e.target.closest(".mindmap-color-current")) closeMindMapColorControls();
  const mindMapMenuOpen = !els.mindMapContextMenu.hidden ||
    Boolean(els.mindMapLinkContextMenu && !els.mindMapLinkContextMenu.hidden);
  const clickedMindMapMenu = els.mindMapContextMenu.contains(e.target) ||
    Boolean(els.mindMapLinkContextMenu?.contains(e.target));
  if (mindMapMenuOpen && !clickedMindMapMenu) hideMindMapCtxMenu();
  const accountButtonClicked = [els.accountBtn, els.mindMapAccountBtn]
    .filter(Boolean)
    .some(button => button.contains(e.target));
  if (!els.accountMenu.hidden && !els.accountMenu.contains(e.target) && !accountButtonClicked) {
    els.accountMenu.hidden = true;
  }
  if (!els.mindMapListPanel.hidden && !els.mindMapListPanel.contains(e.target) && !els.mindMapListBtn.contains(e.target)) {
    closeMindMapListPanel();
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeLightbox();
    closeCropModal();
    closeTemplatesPanel();
    closeMindMapPanel();
    hideCtxMenu();
    hideMediaCtxMenu();
    hideMindMapCtxMenu();
    closeMindMapColorControls();
    els.accountMenu.hidden = true;
    closeMobileMenu();
    resolveConfirm(false);
  }
  const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
  if (isUndo) {
    e.preventDefault();
    if (!els.mindMapOverlay.hidden) undoMindMapLastChange();
    else undoLastChange();
    return;
  }
  const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
  if (isSave) {
    e.preventDefault();
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => scheduleSave(), 0);
  }
});

document.addEventListener("dragend", () => {
  if (state.isDraggingNote) suppressTreeClickAfterDrag();
  document.body.classList.remove("is-dragging");
  state.isDraggingNote = false;
  clearTreeDropHighlights();
  stopTreeAutoScroll();
});

document.addEventListener("selectionchange", updateActiveMediaCaretFromSelection);

// ── ボタン / 入力バインド ─────────────────────────────────────────────────────

els.mobileMenuBtn.addEventListener("click", e => {
  e.stopPropagation();
  toggleMobileMenu();
});
els.mobileMenuBackdrop.addEventListener("click", closeMobileMenu);
if (mobileMenuMql.addEventListener) {
  mobileMenuMql.addEventListener("change", e => {
    if (!e.matches) closeMobileMenu();
  });
} else {
  mobileMenuMql.addListener(e => {
    if (!e.matches) closeMobileMenu();
  });
}

els.titleInput.addEventListener("input", scheduleSave);
els.checkBtn.addEventListener("click", () => {
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  toggleCheckedNote(state.selectedId);
});

els.contentInput.addEventListener("focus", () => {
  els.contentInput.classList.add("is-focused");
});
els.contentInput.addEventListener("click", () => {
  els.contentInput.classList.add("is-focused");
});
els.contentInput.addEventListener("blur", () => {
  els.contentInput.classList.remove("is-focused");
  clearActiveMediaCaret();
});
els.contentInput.addEventListener("compositionstart", () => { _isComposing = true; redirectMediaCaretTyping(); });
els.contentInput.addEventListener("compositionend",   () => { _isComposing = false; repairMediaCaretAfterEdit(); scheduleSave(); });
els.contentInput.addEventListener("keydown", rememberMediaCaretRepair);
els.contentInput.addEventListener("keydown", e => {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return;
  redirectMediaCaretTyping();
});
els.contentInput.addEventListener("input", () => {
  repairMediaCaretAfterEdit();
  updateEmptyState();
  if (!_isComposing) scheduleSave();
});
els.contentInput.addEventListener("keyup", e => {
  if (e.key === "Backspace" || e.key === "Delete") repairMediaCaretAfterEdit();
});

els.searchInput.addEventListener("input", renderTree);

els.newRootBtn .addEventListener("click", () => createNote(null));
els.undoBtn.addEventListener("click", undoLastChange);
els.addChildBtn.addEventListener("click", () => {
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  createNote(state.selectedId);
});
els.deleteBtn.addEventListener("click", deleteSelectedNote);

// ── メディア添付 ──────────────────────────────────────────────────────────────

els.mediaBtn.addEventListener("click", () => {
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  els.mediaInput.click();
});
els.mediaInput.addEventListener("change", e => {
  if (!state.selectedId) return;
  uploadMedia(state.selectedId, e.target.files);
  e.target.value = "";
});

els.editorArea.addEventListener("dragover", e => {
  if (!e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  els.editorArea.classList.add("media-drag-over");
});
els.editorArea.addEventListener("dragleave", e => {
  if (!els.editorArea.contains(e.relatedTarget))
    els.editorArea.classList.remove("media-drag-over");
});
els.editorArea.addEventListener("drop", e => {
  if (state.isDraggingNote) { e.preventDefault(); return; }
  if (!e.dataTransfer.files.length) return;
  e.preventDefault();
  els.editorArea.classList.remove("media-drag-over");
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  uploadMedia(state.selectedId, e.dataTransfer.files);
});

els.contentInput.addEventListener("paste", e => {
  const items      = [...(e.clipboardData?.items ?? [])];
  const mediaItems = items.filter(i => i.type.startsWith("image/") || i.type.startsWith("video/"));
  if (mediaItems.length > 0) {
    e.preventDefault();
    if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
    uploadMedia(state.selectedId, mediaItems.map(i => i.getAsFile()).filter(Boolean));
    return;
  }
  const text = e.clipboardData.getData("text/plain");
  if (text) { e.preventDefault(); document.execCommand("insertText", false, text); }
});

// ── Auth UI ───────────────────────────────────────────────────────────────────

let authMode = "login";
let authFlowInProgress = false;

const EMAIL_VERIFICATION_REQUIRED =
  "メールアドレスの確認が必要です。送信したメール内のリンクを開いて認証を完了してからログインしてください。メールが届かない場合は迷惑メールフォルダを確認してください。";
const EMAIL_VERIFICATION_SENT =
  "確認メールを送信しました。メール内のリンクで認証を完了してからログインしてください。メールが届かない場合は迷惑メールフォルダを確認してください。";
const EMAIL_DELIVERY_HELP =
  "メールが届かない場合は迷惑メールフォルダを確認してください。";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use":   "このメールアドレスは既に登録されています。",
  "auth/invalid-email":          "メールアドレスの形式が正しくありません。",
  "auth/user-disabled":          "このアカウントは無効化されています。",
  "auth/user-not-found":         "メールアドレスまたはパスワードが正しくありません。",
  "auth/wrong-password":         "メールアドレスまたはパスワードが正しくありません。",
  "auth/invalid-credential":     "メールアドレスまたはパスワードが正しくありません。",
  "auth/missing-password":       "パスワードを入力してください。",
  "auth/weak-password":          "パスワードは6文字以上で入力してください。",
  "auth/too-many-requests":      "試行回数が多すぎます。しばらくしてからお試しください。",
  "auth/network-request-failed": "通信に失敗しました。ネットワークをご確認ください。",
  "auth/requires-recent-login":  "セキュリティのため、再度ログインしてからお試しください。",
};

function translateAuthError(err) {
  return AUTH_ERROR_MESSAGES[err?.code] || err?.message || "エラーが発生しました。";
}

function showAuthError(message) {
  els.authInfo.hidden       = true;
  els.authError.textContent = message;
  els.authError.hidden      = false;
}

function showAuthInfo(message) {
  els.authError.hidden     = true;
  els.authInfo.textContent = message;
  els.authInfo.hidden      = false;
}

function showVerificationStatus(message) {
  els.authVerifyStatus.textContent = message;
  els.authVerifyStatus.hidden = false;
}

function updatePasswordVisibility() {
  els.authPassword.type = els.authShowPassword.checked ? "text" : "password";
}

function showAuthScreen() {
  els.appShell.hidden    = true;
  els.authOverlay.hidden = false;
  els.authDialog.classList.remove("is-verifying");
  els.authVerifyPanel.hidden = true;
  els.authNotConfigured.hidden = true;
  setAuthMode("login");
  if (!window.FIREBASE_READY) {
    els.authNotConfigured.hidden = false;
    els.authFormWrap.hidden      = true;
  }
}

function showApp() {
  els.authOverlay.hidden = true;
  els.appShell.hidden    = false;
}

function showVerificationScreen(user, message = EMAIL_VERIFICATION_REQUIRED) {
  els.appShell.hidden = true;
  els.authOverlay.hidden = false;
  els.authDialog.classList.add("is-verifying");
  els.authNotConfigured.hidden = true;
  els.authFormWrap.hidden = true;
  els.authVerifyPanel.hidden = false;
  els.authTitle.textContent = "アカウント";
  els.authVerifyEmail.textContent = user?.email || "";
  els.authVerifyStatus.hidden = true;
  if (message) showVerificationStatus(message);
}

function setAuthMode(mode) {
  authMode = mode;
  els.authDialog.classList.remove("is-verifying");
  els.authVerifyPanel.hidden = true;
  els.authFormWrap.hidden = false;
  els.authError.hidden = true;
  els.authInfo.hidden  = true;
  els.authTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === mode));

  if (mode === "forgot") {
    els.authTitle.textContent      = "パスワード再設定";
    els.authPasswordField.hidden   = true;
    els.authPassword.required      = false;
    els.authShowPasswordField.hidden = true;
    els.authShowPassword.checked   = false;
    updatePasswordVisibility();
    els.authRememberField.hidden   = true;
    els.authSubmitBtn.textContent  = "再設定メールを送信";
    els.authForgotLink.hidden      = true;
    els.authBackToLoginLink.hidden = false;
  } else {
    els.authTitle.textContent      = mode === "register" ? "新規登録" : "ログイン";
    els.authPasswordField.hidden   = false;
    els.authPassword.required      = true;
    els.authShowPasswordField.hidden = false;
    els.authRememberField.hidden   = false;
    els.authSubmitBtn.textContent  = mode === "register" ? "登録" : "ログイン";
    els.authForgotLink.hidden      = mode !== "login";
    els.authBackToLoginLink.hidden = true;
  }
}

function applyAuthPersistence() {
  const persistence = els.authRemember.checked
    ? firebase.auth.Auth.Persistence.LOCAL
    : firebase.auth.Auth.Persistence.SESSION;
  return auth.setPersistence(persistence);
}

function emailActionSettings() {
  return {
    url: `${window.location.origin}/`,
    handleCodeInApp: false,
  };
}

function sendVerificationEmail(user) {
  return user.sendEmailVerification(emailActionSettings());
}

async function resendVerificationSilently(user) {
  if (!user || user.emailVerified) return true;
  try {
    await sendVerificationEmail(user);
    return true;
  } catch (e) {
    if (e?.code === "auth/too-many-requests") return false;
    throw e;
  }
}

function updateAccountUI(user) {
  if (!user) return;
  const needsVerification = !user.emailVerified;
  els.accountMenuName.textContent   = user.displayName || "（表示名未設定）";
  els.accountMenuEmail.textContent  = user.email || "";
  els.accountMenuStatus.textContent = needsVerification ? "⚠️ メール未確認" : "✅ メール確認済み";
  els.resendVerificationBtn.hidden  = !needsVerification;
  els.refreshStatusBtn.hidden       = !needsVerification;
}

function showDisplayNameEditor() {
  const user = auth.currentUser;
  els.displayNameInput.value    = user?.displayName || "";
  els.accountMenuName.hidden    = true;
  els.editDisplayNameBtn.hidden = true;
  els.displayNameEditRow.hidden = false;
  els.displayNameInput.focus();
}

function hideDisplayNameEditor() {
  els.displayNameEditRow.hidden = true;
  els.accountMenuName.hidden    = false;
  els.editDisplayNameBtn.hidden = false;
}

async function handleSaveDisplayName() {
  const user = auth.currentUser;
  if (!user) return;
  const name = els.displayNameInput.value.trim();
  els.displayNameSaveBtn.disabled   = true;
  els.displayNameCancelBtn.disabled = true;
  try {
    await user.updateProfile({ displayName: name || null });
    els.accountMenuName.textContent = name || "（表示名未設定）";
    hideDisplayNameEditor();
    showToast("表示名を変更しました。");
  } catch (err) {
    showToast(translateAuthError(err));
  } finally {
    els.displayNameSaveBtn.disabled   = false;
    els.displayNameCancelBtn.disabled = false;
  }
}

async function handleResendVerification() {
  els.accountMenu.hidden = true;
  try {
    const user = auth.currentUser;
    if (!user) return;
    await user.reload();
    if (user.emailVerified) {
      updateAccountUI(user);
      if (state.uid !== user.uid) resetMindMapState();
      state.uid = user.uid;
      showApp();
      try {
        state.templates = await ensureOfficialTemplates(user.uid);
        await loadNotes();
      } catch (e) { showToast(e.message); }
      showToast("メール確認済みです。");
      return;
    }
    await sendVerificationEmail(user);
    if (!els.authVerifyPanel.hidden) showVerificationStatus(`確認メールを送信しました。${EMAIL_DELIVERY_HELP}`);
    showToast("確認メールを送信しました。");
  } catch (e) { showToast(translateAuthError(e)); }
}

async function handleRefreshStatus() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await user.reload();
    updateAccountUI(user);
    if (user.emailVerified) {
      state.uid = user.uid;
      showApp();
      try {
        state.templates = await ensureOfficialTemplates(user.uid);
        await loadNotes();
      } catch (e) { showToast(e.message); }
      showToast("メール確認済みです。");
    } else {
      showVerificationScreen(user, "まだメール確認が完了していません。メールのリンクを開いてから更新してください。");
      showToast("まだメール確認が完了していません。");
    }
  } catch (e) { showToast(translateAuthError(e)); }
}

async function handleLogout() {
  els.accountMenu.hidden = true;
  try {
    await auth.signOut();
  } catch (e) { showToast(translateAuthError(e)); }
}

async function handleDeleteAccount(e) {
  e?.preventDefault();
  console.log("[deleteAccount] clicked");
  els.accountMenu.hidden = true;

  const ok = await showConfirm(
    "アカウントを削除します。すべてのメモ・メディアが完全に削除され、元に戻せません。本当に削除しますか？",
    "削除する"
  );
  if (!ok) {
    console.log("[deleteAccount] cancelled by user");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.error("[deleteAccount] auth.currentUser is null");
    showToast("ログイン情報が確認できません。再度ログインしてください。");
    return;
  }

  els.deleteAccountBtn.disabled = true;
  console.log("[deleteAccount] starting deletion for uid:", user.uid);

  try {
    const userRef = db.collection("users").doc(user.uid);

    console.log("[deleteAccount] deleting users/{uid}/notes ...");
    await deleteCollectionInBatches(userRef.collection("notes"));
    console.log("[deleteAccount] notes deleted");

    console.log("[deleteAccount] deleting users/{uid}/templates ...");
    await deleteCollectionInBatches(userRef.collection("templates"));
    console.log("[deleteAccount] templates deleted");

    console.log("[deleteAccount] deleting users/{uid}/mindmaps ...");
    await deleteCollectionInBatches(userRef.collection("mindmaps"));
    console.log("[deleteAccount] mindmaps deleted");

    console.log("[deleteAccount] deleting users/{uid} document ...");
    await userRef.delete().catch(err => console.warn("[deleteAccount] users/{uid} doc delete error:", err));
    console.log("[deleteAccount] user document deleted");

    console.log("[deleteAccount] deleting auth user ...");
    await user.delete();
    console.log("[deleteAccount] auth user deleted");

    state.uid = null;
    resetMindMapState();
    showAuthScreen();
    showToast("アカウントを削除しました。");
  } catch (err) {
    console.error("[deleteAccount] failed:", err);
    if (err && err.code === "auth/requires-recent-login") {
      showToast("安全のため、もう一度ログインしてからアカウント削除を実行してください。");
    } else {
      showToast(translateAuthError(err));
    }
  } finally {
    els.deleteAccountBtn.disabled = false;
    console.log("[deleteAccount] finished");
  }
}

async function handleDeleteUnverifiedAccount() {
  const ok = await showConfirm(
    "アカウントを削除します。元に戻せません。本当に削除しますか？",
    "削除する"
  );
  if (!ok) return;
  try {
    const user = auth.currentUser;
    if (!user) return;
    await user.delete();
    showToast("アカウントを削除しました。");
  } catch (e) { showToast(translateAuthError(e)); }
}

function toggleAccountMenu(anchor) {
  if (!anchor) return;
  if (els.accountMenu.hidden) {
    const rect = anchor.getBoundingClientRect();
    els.accountMenu.style.top   = `${rect.bottom + 6}px`;
    els.accountMenu.style.left  = "auto";
    els.accountMenu.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    hideDisplayNameEditor();
    els.accountMenu.hidden = false;
  } else {
    els.accountMenu.hidden = true;
  }
}

if (auth) {
  els.authTabs.forEach(tab => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
  });
  els.authShowPassword.addEventListener("change", updatePasswordVisibility);
  els.authForgotLink.addEventListener("click", () => setAuthMode("forgot"));
  els.authBackToLoginLink.addEventListener("click", () => setAuthMode("login"));

  els.authForm.addEventListener("submit", async e => {
    e.preventDefault();
    els.authError.hidden = true;
    els.authInfo.hidden  = true;

    const email    = els.authEmail.value.trim();
    const password = els.authPassword.value;

    els.authSubmitBtn.disabled = true;
    authFlowInProgress = true;
    try {
      if (authMode === "forgot") {
        await auth.sendPasswordResetEmail(email, emailActionSettings());
        showAuthInfo(`再設定メールを送信しました。${EMAIL_DELIVERY_HELP}`);
      } else {
        await applyAuthPersistence();
        if (authMode === "register") {
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          await sendVerificationEmail(cred.user);
          showVerificationScreen(cred.user, EMAIL_VERIFICATION_SENT);
        } else {
          const cred = await auth.signInWithEmailAndPassword(email, password);
          await cred.user.reload();
          if (!cred.user.emailVerified) {
            const resent = await resendVerificationSilently(cred.user);
            showVerificationScreen(
              cred.user,
              resent
                ? `${EMAIL_VERIFICATION_REQUIRED} 確認メールを再送しました。`
                : `${EMAIL_VERIFICATION_REQUIRED} 確認メールは送信済みです。時間を置いてからもう一度お試しください。`
            );
            return;
          }
        }
      }
    } catch (err) {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        showVerificationScreen(auth.currentUser, translateAuthError(err));
      } else {
        showAuthError(translateAuthError(err));
      }
    } finally {
      authFlowInProgress = false;
      els.authSubmitBtn.disabled = false;
    }
  });

  els.accountBtn.addEventListener("click", () => toggleAccountMenu(els.accountBtn));
  els.mindMapAccountBtn?.addEventListener("click", () => toggleAccountMenu(els.mindMapAccountBtn));
  els.editDisplayNameBtn.addEventListener("click", showDisplayNameEditor);
  els.displayNameCancelBtn.addEventListener("click", hideDisplayNameEditor);
  els.displayNameSaveBtn.addEventListener("click", handleSaveDisplayName);
  els.displayNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveDisplayName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideDisplayNameEditor();
    }
  });
  els.resendVerificationBtn.addEventListener("click", handleResendVerification);
  els.refreshStatusBtn.addEventListener("click", handleRefreshStatus);
  els.logoutBtn.addEventListener("click", handleLogout);
  els.deleteAccountBtn.addEventListener("click", handleDeleteAccount);
  els.authVerifyResendBtn.addEventListener("click", handleResendVerification);
  els.authVerifyRefreshBtn.addEventListener("click", handleRefreshStatus);
  els.authVerifyLogoutBtn.addEventListener("click", handleLogout);
  els.authVerifyDeleteBtn.addEventListener("click", handleDeleteUnverifiedAccount);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

if (!auth) {
  showAuthScreen();
} else {
  auth.onAuthStateChanged(async user => {
    if (user) {
      try {
        await user.reload();
      } catch (e) {
        showAuthScreen();
        showAuthError(translateAuthError(e));
        return;
      }

      if (!user.emailVerified) {
        showVerificationScreen(user);
        updateAccountUI(user);
        return;
      }

      state.uid = user.uid;
      showApp();
      updateAccountUI(user);
      try {
        state.templates = await ensureOfficialTemplates(user.uid);
        await loadNotes();
      } catch (e) { showToast(e.message); }
    } else {
      state.uid = null;
      resetMindMapState();
      showAuthScreen();
    }
  });
}
