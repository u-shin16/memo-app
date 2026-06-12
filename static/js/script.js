// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  uid:             null,
  data:            null,
  templates:       [],
  templatePreviewId: null,
  selectedId:      null,
  expanded:        new Set(),
  saveTimer:       null,
  contextNoteId:   null,
  isDraggingNote:  false,
  mediaCmFigure:   null,
  pendingMediaCaretFigure: null,
  undoStack:       [],
  isApplyingUndo:  false,
};

const MAX_UNDO = 50;
const NO_SELECTION_MESSAGE = "メモを選択するか作成してください";

let _isComposing = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const els = {
  tree:             document.getElementById("tree"),
  noteCount:        document.getElementById("noteCount"),
  titleInput:       document.getElementById("titleInput"),
  contentInput:     document.getElementById("contentInput"),
  breadcrumb:       document.getElementById("breadcrumb"),
  selectedInfo:     document.getElementById("selectedInfo"),
  saveStatus:       document.getElementById("saveStatus"),
  searchInput:      document.getElementById("searchInput"),
  newRootBtn:       document.getElementById("newRootBtn"),
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

function setButtonContent(button, icon, label = "") {
  if (!button) return;
  button.innerHTML = `<span class="btn-icon" aria-hidden="true">${icon}</span>` +
                     (label ? `<span class="btn-label">${label}</span>` : "");
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

  try {
    await reorderNote(noteId, target.beforeId, target.parentId);
    if (target.parentId) state.expanded.add(target.parentId);
    selectNote(noteId);
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
    if (addBtn.contains(e.target)) { e.stopPropagation(); createNote(note.id); return; }
    if (e.target === toggle && hasKids) {
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
  if (!els.accountMenu.hidden && !els.accountMenu.contains(e.target) && !els.accountBtn.contains(e.target)) {
    els.accountMenu.hidden = true;
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeLightbox();
    closeCropModal();
    closeTemplatesPanel();
    hideCtxMenu();
    hideMediaCtxMenu();
    els.accountMenu.hidden = true;
    resolveConfirm(false);
  }
  const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
  if (isUndo) {
    e.preventDefault();
    undoLastChange();
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
  document.body.classList.remove("is-dragging");
  state.isDraggingNote = false;
  clearTreeDropHighlights();
  stopTreeAutoScroll();
});

document.addEventListener("selectionchange", updateActiveMediaCaretFromSelection);

// ── ボタン / 入力バインド ─────────────────────────────────────────────────────

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

    console.log("[deleteAccount] deleting users/{uid} document ...");
    await userRef.delete().catch(err => console.warn("[deleteAccount] users/{uid} doc delete error:", err));
    console.log("[deleteAccount] user document deleted");

    console.log("[deleteAccount] deleting auth user ...");
    await user.delete();
    console.log("[deleteAccount] auth user deleted");

    state.uid = null;
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

  els.accountBtn.addEventListener("click", () => {
    if (els.accountMenu.hidden) {
      const rect = els.accountBtn.getBoundingClientRect();
      els.accountMenu.style.top   = `${rect.bottom + 6}px`;
      els.accountMenu.style.left  = "auto";
      els.accountMenu.style.right = `${window.innerWidth - rect.right}px`;
      hideDisplayNameEditor();
      els.accountMenu.hidden = false;
    } else {
      els.accountMenu.hidden = true;
    }
  });
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
      showAuthScreen();
    }
  });
}
