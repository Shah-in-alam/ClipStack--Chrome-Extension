/**
 * ClipStack v1.0 — Background Service Worker
 * ────────────────────────────────────────────
 * Manages clipboard history, smart categorization,
 * collections, pinning, and search.
 */

let clips = [];
let collections = [];
let settings = { maxClips: 200, enabled: true };

// Load on startup
chrome.storage.local.get({ clips: [], collections: [], settings }, (data) => {
  clips = data.clips || [];
  collections = data.collections || [];
  settings = { ...settings, ...data.settings };
});

function save() {
  chrome.storage.local.set({ clips, collections, settings });
}

// ═══ Smart Category Detection ═══

const CATEGORY_RULES = [
  { type: "color",   icon: "🎨", pattern: /^#([0-9a-f]{3,8})$/i },
  { type: "color",   icon: "🎨", pattern: /^rgba?\(\s*\d+/i },
  { type: "color",   icon: "🎨", pattern: /^hsla?\(\s*\d+/i },
  { type: "email",   icon: "📧", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { type: "url",     icon: "🔗", pattern: /^https?:\/\/.+/i },
  { type: "phone",   icon: "📞", pattern: /^[\+]?[\d\s\-\(\)]{7,20}$/ },
  { type: "code",    icon: "💻", pattern: /(?:function\s|const\s|let\s|var\s|import\s|class\s|def\s|=>|console\.|print\(|System\.|public\s|private\s|\{[\s\S]*\}|<\/?\w+>)/s },
  { type: "number",  icon: "🔢", pattern: /^[\d\s,.\-\+\$€£¥%]+$/ },
  { type: "json",    icon: "📋", pattern: /^\s*[\{\[]/s },
  { type: "path",    icon: "📁", pattern: /^(\/|[A-Z]:\\|~\/).+/i },
  { type: "address", icon: "📍", pattern: /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/i },
];

function detectCategory(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { type: "empty", icon: "⬜" };

  // Check JSON validity
  if (/^\s*[\{\[]/.test(trimmed)) {
    try { JSON.parse(trimmed); return { type: "json", icon: "📋" }; }
    catch (e) {}
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(trimmed)) {
      return { type: rule.type, icon: rule.icon };
    }
  }

  // Text length heuristics
  if (trimmed.length > 500) return { type: "long-text", icon: "📄" };
  if (trimmed.split("\n").length > 3) return { type: "multiline", icon: "📝" };

  return { type: "text", icon: "📋" };
}

// ═══ Add Clip ═══

function addClip(text, source) {
  if (!settings.enabled) return;
  if (!text || text.trim().length === 0) return;

  const trimmed = text.trim();

  // Deduplicate: if same text exists, move it to top
  const existingIndex = clips.findIndex((c) => c.text === trimmed);
  if (existingIndex !== -1) {
    const existing = clips.splice(existingIndex, 1)[0];
    existing.count = (existing.count || 1) + 1;
    existing.updatedAt = Date.now();
    existing.source = source || existing.source;
    clips.unshift(existing);
    save();
    return;
  }

  const category = detectCategory(trimmed);
  const clip = {
    id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    preview: trimmed.slice(0, 120),
    category: category.type,
    icon: category.icon,
    pinned: false,
    collectionId: null,
    source: source || "",
    count: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  clips.unshift(clip);

  // Enforce max (but never remove pinned clips)
  while (clips.filter((c) => !c.pinned).length > settings.maxClips) {
    const unpinnedIndex = clips.findLastIndex((c) => !c.pinned);
    if (unpinnedIndex !== -1) clips.splice(unpinnedIndex, 1);
    else break;
  }

  save();
}

// ═══ Context Menu ═══

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clipstack-save",
    title: "Save to ClipStack",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "clipstack-save" && info.selectionText) {
    addClip(info.selectionText, tab?.url || "context-menu");
  }
});

// ═══ Message Handler ═══

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ADD_CLIP") {
    addClip(msg.text, msg.source || "");
    sendResponse({ success: true });
  }

  else if (msg.type === "GET_CLIPS") {
    const filter = msg.filter || "all";
    const query = (msg.query || "").toLowerCase();
    let result = [...clips];

    // Filter by category
    if (filter === "pinned") result = result.filter((c) => c.pinned);
    else if (filter !== "all") result = result.filter((c) => c.category === filter);

    // Filter by collection
    if (msg.collectionId) result = result.filter((c) => c.collectionId === msg.collectionId);

    // Search
    if (query) {
      result = result.filter((c) =>
        c.text.toLowerCase().includes(query) ||
        c.category.includes(query) ||
        c.source.toLowerCase().includes(query)
      );
    }

    // Sort: pinned first, then by date
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
    });

    sendResponse({ clips: result.slice(0, 50) });
  }

  else if (msg.type === "DELETE_CLIP") {
    clips = clips.filter((c) => c.id !== msg.id);
    save();
    sendResponse({ success: true });
  }

  else if (msg.type === "PIN_CLIP") {
    const clip = clips.find((c) => c.id === msg.id);
    if (clip) { clip.pinned = !clip.pinned; clip.updatedAt = Date.now(); save(); }
    sendResponse({ success: true, pinned: clip?.pinned });
  }

  else if (msg.type === "MOVE_TO_COLLECTION") {
    const clip = clips.find((c) => c.id === msg.clipId);
    if (clip) { clip.collectionId = msg.collectionId; clip.updatedAt = Date.now(); save(); }
    sendResponse({ success: true });
  }

  // Collections
  else if (msg.type === "GET_COLLECTIONS") {
    sendResponse({ collections });
  }

  else if (msg.type === "CREATE_COLLECTION") {
    const col = {
      id: `col_${Date.now()}`,
      name: msg.name,
      color: msg.color || "#58a6ff",
      createdAt: Date.now(),
    };
    collections.push(col);
    save();
    sendResponse({ collection: col });
  }

  else if (msg.type === "DELETE_COLLECTION") {
    collections = collections.filter((c) => c.id !== msg.id);
    clips.forEach((c) => { if (c.collectionId === msg.id) c.collectionId = null; });
    save();
    sendResponse({ success: true });
  }

  // Stats
  else if (msg.type === "GET_STATS") {
    const cats = {};
    clips.forEach((c) => { cats[c.category] = (cats[c.category] || 0) + 1; });
    sendResponse({
      total: clips.length,
      pinned: clips.filter((c) => c.pinned).length,
      categories: cats,
      collections: collections.length,
    });
  }

  // Settings
  else if (msg.type === "UPDATE_SETTINGS") {
    Object.assign(settings, msg.settings);
    save();
    sendResponse({ settings });
  }

  else if (msg.type === "CLEAR_ALL") {
    clips = clips.filter((c) => c.pinned); // Keep pinned
    save();
    sendResponse({ success: true });
  }

  else if (msg.type === "EXPORT_CLIPS") {
    const data = JSON.stringify({ clips, collections, exportedAt: new Date().toISOString() }, null, 2);
    sendResponse({ data });
  }

  return true;
});
