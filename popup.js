document.addEventListener("DOMContentLoaded", () => {
  let currentFilter = "all";
  let currentQuery = "";
  let currentCollection = null;
  let showCollections = false;

  // ── Initial Load ──
  loadClips();
  loadStats();
  loadCollections();

  // ── Search ──
  let searchTimeout;
  document.getElementById("search").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    currentQuery = e.target.value.trim();
    searchTimeout = setTimeout(loadClips, 150);
  });

  // ── Filters ──
  document.getElementById("filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    currentCollection = null;
    showCollections = false;
    document.getElementById("collections-panel").classList.remove("show");
    document.getElementById("clip-list").style.display = "";
    loadClips();
  });

  // ── Collections Toggle ──
  document.getElementById("btn-collections").addEventListener("click", () => {
    showCollections = !showCollections;
    document.getElementById("collections-panel").classList.toggle("show", showCollections);
    document.getElementById("clip-list").style.display = showCollections ? "none" : "";
    document.getElementById("btn-collections").classList.toggle("active", showCollections);
    if (showCollections) loadCollections();
  });

  // ── Create Collection ──
  document.getElementById("col-add-btn").addEventListener("click", () => {
    const name = document.getElementById("col-name-input").value.trim();
    if (!name) return;
    const colors = ["#6c5ce7", "#00cec9", "#fdcb6e", "#ff6b6b", "#74b9ff", "#fd79a8", "#55efc4", "#ffeaa7"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    chrome.runtime.sendMessage({ type: "CREATE_COLLECTION", name, color }, () => {
      document.getElementById("col-name-input").value = "";
      loadCollections();
      toast("Collection created");
    });
  });

  // ── Pause/Resume ──
  document.getElementById("btn-toggle").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS", settings: {} }, (res) => {
      const btn = document.getElementById("btn-toggle");
      const enabled = res?.settings?.enabled;
      chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS", settings: { enabled: !enabled } }, () => {
        btn.textContent = !enabled ? "⏸" : "▶";
        toast(!enabled ? "ClipStack resumed" : "ClipStack paused");
      });
    });
  });

  // ── Export ──
  document.getElementById("btn-export").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "EXPORT_CLIPS" }, (res) => {
      if (!res?.data) return;
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clipstack-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Exported!");
    });
  });

  // ── Clear ──
  document.getElementById("btn-clear").addEventListener("click", () => {
    if (confirm("Clear all clips? (Pinned clips will be kept)")) {
      chrome.runtime.sendMessage({ type: "CLEAR_ALL" }, () => {
        loadClips();
        loadStats();
        toast("Cleared (pinned kept)");
      });
    }
  });

  // ═══ Load Clips ═══
  function loadClips() {
    chrome.runtime.sendMessage({
      type: "GET_CLIPS",
      filter: currentFilter,
      query: currentQuery,
      collectionId: currentCollection,
    }, (res) => {
      renderClips(res?.clips || []);
    });
  }

  // ═══ Render Clips ═══
  function renderClips(clips) {
    const container = document.getElementById("clip-list");

    if (!clips.length) {
      container.innerHTML = `<div class="empty">
        <div class="empty-icon">${currentQuery ? "🔍" : "📋"}</div>
        <div class="empty-text">${currentQuery ? "No clips match your search" : "Nothing copied yet.<br>Start copying text to build your history!"}</div>
      </div>`;
      return;
    }

    container.innerHTML = clips.map((c) => {
      const isCode = c.category === "code" || c.category === "json";
      const isColor = c.category === "color";
      const pinClass = c.pinned ? "pinned" : "";

      let textHtml;
      if (isColor) {
        textHtml = `<div class="clip-text color-preview"><div class="color-swatch" style="background:${esc(c.text)}"></div><span style="font-family:var(--mono);font-size:12px;">${esc(c.preview)}</span></div>`;
      } else if (isCode) {
        textHtml = `<div class="clip-text code">${esc(c.preview)}</div>`;
      } else {
        textHtml = `<div class="clip-text">${esc(c.preview)}</div>`;
      }

      return `<div class="clip-card ${pinClass}" data-id="${c.id}" data-text="${escAttr(c.text)}">
        <div class="clip-top">
          <span class="clip-icon">${c.icon}</span>
          <span class="clip-type">${c.category}</span>
          ${c.count > 1 ? `<span class="clip-type" style="color:var(--orange);">×${c.count}</span>` : ""}
          <span class="clip-time">${timeAgo(c.updatedAt || c.createdAt)}</span>
        </div>
        ${textHtml}
        ${c.source ? `<div class="clip-source">${esc(c.source)}</div>` : ""}
        <div class="clip-actions">
          <button class="clip-btn btn-copy" data-id="${c.id}">Copy</button>
          <button class="clip-btn btn-pin" data-id="${c.id}">${c.pinned ? "Unpin" : "Pin"}</button>
          <button class="clip-btn del btn-del" data-id="${c.id}">Delete</button>
        </div>
      </div>`;
    }).join("");

    // Event delegation
    container.querySelectorAll(".btn-copy").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = btn.closest(".clip-card");
        const text = card.dataset.text;
        navigator.clipboard.writeText(text).then(() => toast("Copied!"));
      });
    });

    container.querySelectorAll(".btn-pin").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: "PIN_CLIP", id: btn.dataset.id }, () => {
          loadClips();
          toast(btn.textContent === "Pin" ? "Pinned!" : "Unpinned");
        });
      });
    });

    container.querySelectorAll(".btn-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: "DELETE_CLIP", id: btn.dataset.id }, () => {
          loadClips();
          loadStats();
        });
      });
    });

    // Click card to copy
    container.querySelectorAll(".clip-card").forEach((card) => {
      card.addEventListener("click", () => {
        navigator.clipboard.writeText(card.dataset.text).then(() => toast("Copied to clipboard!"));
      });
    });
  }

  // ═══ Load Stats ═══
  function loadStats() {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (res) => {
      if (!res) return;
      document.getElementById("clip-count").textContent = `${res.total} clips · ${res.pinned} pinned`;
    });
  }

  // ═══ Load Collections ═══
  function loadCollections() {
    chrome.runtime.sendMessage({ type: "GET_COLLECTIONS" }, (res) => {
      const list = document.getElementById("collections-list");
      const cols = res?.collections || [];

      if (!cols.length) {
        list.innerHTML = '<div class="empty" style="padding:14px;"><div class="empty-text">No collections yet. Create one below.</div></div>';
        return;
      }

      // Count clips per collection
      chrome.runtime.sendMessage({ type: "GET_CLIPS", filter: "all" }, (clipRes) => {
        const allClips = clipRes?.clips || [];
        list.innerHTML = cols.map((col) => {
          const count = allClips.filter((c) => c.collectionId === col.id).length;
          return `<div class="col-item" data-id="${col.id}">
            <div class="col-dot" style="background:${col.color}"></div>
            <span class="col-name">${esc(col.name)}</span>
            <span class="col-count">${count}</span>
          </div>`;
        }).join("");

        list.querySelectorAll(".col-item").forEach((item) => {
          item.addEventListener("click", () => {
            currentCollection = item.dataset.id;
            showCollections = false;
            document.getElementById("collections-panel").classList.remove("show");
            document.getElementById("clip-list").style.display = "";
            document.getElementById("btn-collections").classList.remove("active");
            document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
            currentFilter = "all";
            loadClips();
          });
        });
      });
    });
  }

  // ═══ Helpers ═══
  function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
  function escAttr(s) { return (s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function timeAgo(ts) {
    if (!ts) return "";
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1800);
  }
});
