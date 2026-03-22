<div align="center">

# 📋 ClipStack

**Smart Clipboard History Manager for Chrome**

Never lose a copied item again. ClipStack saves everything you copy and auto-categorizes it.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/clipstack/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=for-the-badge)]()

</div>

---

## The Problem

You copy something. Then you copy something else. The first thing? **Gone forever.**

This happens 50+ times a day to everyone — students, developers, designers, writers. Your clipboard holds exactly ONE item. That's a design from the 1980s that never got fixed.

I researched 100+ Chrome extensions. The existing clipboard tools were either abandoned, ugly flat text lists, or charged money for basic features like pinning and export.

So I built ClipStack.

## What Makes It Different

ClipStack doesn't just save your clips — it **understands** them.

| You copy... | ClipStack detects... |
|---|---|
| `https://github.com/repo` | 🔗 URL |
| `const app = express()` | 💻 Code |
| `hello@example.com` | 📧 Email |
| `#6c5ce7` | 🎨 Color (with visual swatch) |
| `+32 456 789 123` | 📞 Phone number |
| `{"key": "value"}` | 📋 JSON |
| `/home/user/documents` | 📁 File path |
| `123 Main Street` | 📍 Address |
| Everything else | 📋 Text |

## Features

- **Clipboard History** — Everything you copy is saved and searchable
- **Smart Categories** — Auto-detects 9 content types with pattern matching
- **Instant Search** — Find any clip by text, URL, category, or source
- **Filter Tabs** — Filter by All, Pinned, Links, Code, Email, Colors, Numbers, Text
- **Pin Clips** — Pin important clips so they survive "Clear All" and always float to top
- **Collections** — Organize clips into named groups (Job Applications, Project Links, etc.)
- **Right-Click Save** — Select text → right-click → "Save to ClipStack"
- **One-Click Copy** — Click any clip to copy it back to your clipboard
- **Source Tracking** — Shows which website each clip came from
- **Copy Counter** — Tracks how many times you've copied the same text
- **Export** — Download your entire history as JSON
- **Keyboard Shortcut** — `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)
- **Pause/Resume** — Temporarily disable tracking with one click

## Privacy

**100% local. No cloud. No accounts. No data collection. No analytics. No ads.**

All clips are stored using `chrome.storage.local` on your device only. Nothing ever leaves your browser. The extension requires no internet connection to function.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save clipboard history locally on your device |
| `activeTab` | Identify which website a copy event came from |
| `contextMenus` | Right-click "Save to ClipStack" menu option |
| Content script (`<all_urls>`) | Listen for copy events on any webpage |

## Installation

### Chrome Web Store (recommended)
[Install from Chrome Web Store](https://chromewebstore.google.com/detail/clipstack/)

### Manual (developer)
1. Clone this repo: `git clone https://github.com/Shah-in-alam/ClipStack--Chrome-Extension.git`
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" → select the cloned folder
5. Pin ClipStack in your toolbar

## Tech Stack

- **JavaScript** (ES6+) — no frameworks, no build step
- **Chrome Manifest V3** — latest extension standard
- **Pattern Matching** — regex-based content categorization
- **chrome.storage.local** — on-device persistence

## Project Structure

```
clipstack/
├── manifest.json      # Extension configuration
├── background.js      # Service worker — clip storage, categorization, search
├── content.js         # Copy event listener on all pages
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic — rendering, search, collections
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Contributing

Contributions are welcome! Here are some features on the roadmap:

- [ ] Text transforms (uppercase, lowercase, trim, slugify, camelCase)
- [ ] Paste templates with `{variables}`
- [ ] Auto-exclude password fields
- [ ] Per-site blocklist (disable on banking sites)
- [ ] Auto-delete clips older than X days
- [ ] Cloud sync (optional, opt-in)
- [ ] Dark/light theme toggle
- [ ] Firefox and Edge store listings
- [ ] Keyboard navigation in popup

To contribute:
1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Author

Built by Shahin Alam (https://github.com/Shah-in-alam) — Data Science student at Thomas More, Belgium.

Built during a week of gap research across 100+ Chrome extensions. The best product ideas solve problems so common that everyone stopped noticing them.

---

<div align="center">

**If ClipStack saves you time, consider giving it a ⭐ on GitHub and a review on the Chrome Web Store!**

</div>
