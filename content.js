/**
 * ClipStack v1.1 — Content Script
 * Captures copy/cut events reliably using selection API.
 */
(function () {
  "use strict";

  function captureClip() {
    // Method 1: Get the active selection (most reliable, works everywhere)
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      chrome.runtime.sendMessage({
        type: "ADD_CLIP",
        text: sel.toString(),
        source: window.location.hostname,
      });
      return;
    }

    // Method 2: Check for input/textarea elements (selection inside form fields)
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start !== end && active.value) {
        const text = active.value.substring(start, end);
        if (text.trim()) {
          chrome.runtime.sendMessage({
            type: "ADD_CLIP",
            text: text,
            source: window.location.hostname,
          });
          return;
        }
      }
    }

    // Method 3: Fallback to clipboard API (may work on some pages)
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then((text) => {
        if (text && text.trim()) {
          chrome.runtime.sendMessage({
            type: "ADD_CLIP",
            text: text,
            source: window.location.hostname,
          });
        }
      }).catch(() => {});
    }
  }

  // Capture both copy and cut events
  document.addEventListener("copy", () => setTimeout(captureClip, 10));
  document.addEventListener("cut", () => setTimeout(captureClip, 10));

  // Also capture Ctrl+C / Cmd+C keydown as a backup trigger
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      setTimeout(captureClip, 50);
    }
  });

  // Listen for paste-from-clipstack messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PASTE_TEXT" && msg.text) {
      navigator.clipboard.writeText(msg.text).catch(() => {});
    }
  });
})();
