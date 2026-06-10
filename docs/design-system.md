# PocketShelf — Design System

**Version 1.0 · 2026-06-10**
**Aesthetic: "Retro Handheld Cozy"** — evokes the warmth of early-2000s handheld gaming (indigo plastic, silver clamshells, chunky friendly UI) without copying any Nintendo trade dress. Dark-mode-first, macOS-native feel.

> **Legal guardrails (hard rules, repeated here on purpose):**
> - Never use Nintendo red `#E60012` as a brand color.
> - "GBA" / "NDS" / "Game Boy Advance" / "Nintendo DS" appear ONLY as plain factual platform descriptors (badge text, metadata labels) — never stylized, never in logos, never in marketing copy.
> - No Nintendo logos, fonts, sound effects, Pokémon assets/names, or Switch/eShop/DS-menu trade dress recreation.
> - No links to ROM sites. All copy assumes the user's own cartridge dumps.

---

## 1. Color Palette

All colors defined as CSS custom properties on `:root` (dark is the default theme). Tailwind v4: register via `@theme` in `app.css` (see §8).

### 1.1 Primary — "Indigo Shell" (handheld-plastic purple family)

| Token | Hex | Usage |
|---|---|---|
| `--ps-primary-300` | `#A99BFF` | Hover text, focus ring inner |
| `--ps-primary-400` | `#8B7BF4` | Links, active icons, secondary emphasis |
| `--ps-primary-500` | `#6C5CE7` | **Brand primary.** Play button, active nav item, selected states |
| `--ps-primary-600` | `#5A4BD1` | Primary hover/pressed |
| `--ps-primary-700` | `#483BAD` | Primary pressed (darkest) |
| `--ps-primary-glow` | `rgba(108, 92, 231, 0.35)` | Shadows/glows behind primary elements |

### 1.2 Neutrals — "Graphite & Silver" (dark-mode-first surface ramp)

| Token | Hex | Usage |
|---|---|---|
| `--ps-bg-base` | `#121217` | App window background (deepest layer) |
| `--ps-bg-sidebar` | `#17171E` | Sidebar (slightly lighter; gets translucency, see §7) |
| `--ps-bg-surface` | `#1C1C24` | Cards, panels, top bar |
| `--ps-bg-raised` | `#23232D` | Hovered cards, dropdowns, popovers, inputs |
| `--ps-bg-overlay` | `#2A2A36` | Modals, toasts, tooltips |
| `--ps-border` | `#2E2E3A` | Default hairline borders |
| `--ps-border-strong` | `#3D3D4C` | Input borders, dividers needing emphasis |
| `--ps-silver-100` | `#F2F2F5` | Highest-contrast text on dark |
| `--ps-silver-300` | `#C8C8D4` | Primary body text |
| `--ps-silver-500` | `#8E8EA0` | Secondary text, metadata labels |
| `--ps-silver-700` | `#5C5C6E` | Disabled text, placeholders |

### 1.3 Accent — "Cartridge Mint" + warm support

| Token | Hex | Usage |
|---|---|---|
| `--ps-accent-mint` | `#4FD8B0` | Success, "playable" status dot, positive toasts |
| `--ps-accent-mint-dim` | `#2E8A70` | Mint pressed/border |
| `--ps-accent-amber` | `#FFC75F` | Warm highlight: scan progress, favorites, soft warnings |
| `--ps-accent-coral` | `#FF7E6B` | Destructive actions, errors. (Coral — deliberately NOT `#E60012`) |

### 1.4 Platform badge colors (semantic, factual descriptors only)

| Token | Hex | Usage |
|---|---|---|
| `--ps-platform-gba` | `#8B7BF4` | "GBA" badge — text/border on `rgba(139,123,244,0.15)` fill |
| `--ps-platform-nds` | `#5FB7D4` | "NDS" badge — slate-cyan, text/border on `rgba(95,183,212,0.15)` fill |

Badges are plain text in the UI font (never a stylized logotype). Format: uppercase, 10px/700, letter-spacing 0.08em, pill shape.

### 1.5 Light mode (secondary, optional)

Invert the surface ramp: base `#F4F4F8`, sidebar `#ECECF2`, surface `#FFFFFF`, raised `#F7F7FB`, text `#1C1C24` / `#52525F`. Primary/accents unchanged (they pass contrast on light too). Dark stays the default: `color-scheme: dark light;` with a `.light` class override.

### 1.6 Contrast notes

- `--ps-silver-300` on `--ps-bg-surface` ≈ 9.8:1 (body text AA/AAA ✓)
- `--ps-primary-500` is for fills, not small text; for text links use `--ps-primary-400`/`300`.
- White `#FFFFFF` text on `--ps-primary-500` fill ≈ 5.1:1 ✓ (Play button).

---

## 2. Typography

Open fonts only, self-hosted via `@fontsource` (no Nintendo fonts, no CDN):

```bash
npm i @fontsource-variable/nunito @fontsource-variable/manrope @fontsource/jetbrains-mono
```

| Role | Font | Why |
|---|---|---|
| Display / headings / buttons | **Nunito Variable** | Rounded terminals = friendly handheld-plastic feel |
| Body / UI text | **Manrope Variable** | Clean, slightly geometric, great at small sizes |
| Mono (game codes, paths, sizes) | **JetBrains Mono** | Tabular, readable codes |

### Type scale (base 16px)

| Token | Size / Line-height | Weight | Font | Usage |
|---|---|---|---|---|
| `text-display` | 28px / 34px | 800 | Nunito | Empty state headline, onboarding |
| `text-title-1` | 22px / 28px | 800 | Nunito | DetailPanel game title |
| `text-title-2` | 17px / 24px | 700 | Nunito | Section headers, modal titles |
| `text-body` | 14px / 20px | 500 | Manrope | Default UI text |
| `text-body-strong` | 14px / 20px | 700 | Manrope | Card titles, emphasized rows |
| `text-caption` | 12px / 16px | 500 | Manrope | Metadata labels, sidebar group headers |
| `text-micro` | 10px / 14px | 700 | Manrope | Platform badges (uppercase, tracking 0.08em) |
| `text-mono` | 12px / 18px | 500 | JetBrains Mono | Game code, path, file size |

Rules: sentence case everywhere except badges and sidebar group headers (uppercase micro/caption). No font-weight below 500 on dark backgrounds.

---

## 3. Shape, Depth & Texture

### 3.1 Radii (squircle-leaning)

| Token | Value | Usage |
|---|---|---|
| `--ps-r-card` | 16px (`rounded-2xl`) | GameCard, DetailPanel, modals |
| `--ps-r-control` | 10px | Inputs, dropdowns, list rows |
| `--ps-r-pill` | 9999px | All buttons, badges, search field |
| `--ps-r-icon` | 12px | Game cover/icon thumbnails |

### 3.2 Shadows (soft, tinted — never harsh pure black)

```css
--ps-shadow-card:    0 1px 2px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.18);
--ps-shadow-lift:    0 2px 4px rgba(0,0,0,.25), 0 12px 28px rgba(0,0,0,.32),
                     0 0 0 1px rgba(139,123,244,.18);  /* hover: subtle indigo rim */
--ps-shadow-overlay: 0 8px 40px rgba(0,0,0,.45);
--ps-glow-primary:   0 0 24px var(--ps-primary-glow);   /* Play button only */
```

### 3.3 Background texture — subtle dot grid (CSS only)

Applied to the main content area (`.ps-texture`), NOT to cards/panels:

```css
.ps-texture {
  background-image: radial-gradient(rgba(139,123,244,0.045) 1px, transparent 1px);
  background-size: 22px 22px;
}
```

Optional scanline variant for the DetailPanel hero area only (even subtler):

```css
.ps-scanlines::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg,
    transparent 0 3px, rgba(255,255,255,0.012) 3px 4px);
}
```

Keep opacity ≤ 0.05 — felt, not seen. Drop both when `prefers-reduced-transparency` is set.

### 3.4 Spacing

4px base grid. Common steps: 4 / 8 / 12 / 16 / 24 / 32 / 48. Card grid gap: 16px. Panel padding: 24px. Sidebar item padding: 8px 12px.

---

## 4. Components

### 4.1 GameCard

Grid item, default 168px wide (responsive `grid-cols-[repeat(auto-fill,minmax(160px,1fr))]`).

```
┌──────────────────┐
│  [cover / icon]  │  ← square, rounded 12px, bg --ps-bg-raised,
│                  │     fallback: 🎮 emoji at 40px centered
│  Title (2-line   │  ← text-body-strong, line-clamp-2, --ps-silver-100
│  max, ellipsis)  │
│  [GBA]  12.4 MB  │  ← badge (§1.4) + text-mono size, --ps-silver-500
└──────────────────┘
```

- Container: `bg --ps-bg-surface`, `--ps-r-card`, `--ps-shadow-card`, padding 12px.
- Cover: NDS files use the extracted internal icon (32×32, rendered with `image-rendering: pixelated`, upscaled to fill). GBA files have no internal icon → generated placeholder: indigo-to-graphite gradient (`linear-gradient(135deg, #483BAD, #23232D)`) with the first letter of the title in Nunito 800.
- Hover: lift + tilt micro-animation (§5.2), shadow → `--ps-shadow-lift`.
- Selected: 2px ring `--ps-primary-500`, ring-offset 2px in `--ps-bg-base`.
- Right-click: context menu (Play, Reveal in Finder, Remove from library).

### 4.2 Sidebar

Width 220px fixed. Background: translucent (§7.2). Top 52px reserved as traffic-light zone (drag region, no content).

Structure:
- Group header "LIBRARY" (`text-caption` uppercase, `--ps-silver-700`, tracking 0.08em)
  - **All Games** (icon: `Gamepad2`, lucide-react) + count pill right-aligned
- Group header "PLATFORMS"
  - **GBA** (6px dot in `--ps-platform-gba`) + count
  - **NDS** (6px dot in `--ps-platform-nds`) + count
- Spacer (flex-1)
- **Settings** (icon: `Settings`) pinned bottom

Item states: default `--ps-silver-300`; hover `bg rgba(255,255,255,0.05)` with `--ps-r-control`; active `bg rgba(108,92,231,0.18)`, text `--ps-primary-300`, 2px rounded left indicator bar in `--ps-primary-500`.

### 4.3 TopBar

Height 52px, `bg --ps-bg-surface`, bottom border `--ps-border`. Acts as `data-tauri-drag-region`.

- **Search field**: left-center, max-width 360px, pill shape, `bg --ps-bg-raised`, border `--ps-border-strong`, leading `Search` icon, placeholder "Search your library… (⌘F)". Focus: border `--ps-primary-500` + outer ring `--ps-primary-glow`.
- **Scan button**: right side, secondary pill, icon `RefreshCw` + label "Rescan". While scanning: icon spins (1s linear infinite), label → "Scanning…", disabled, and a 2px amber progress hairline animates under the TopBar.
- Sort dropdown (Title / Recently added / Size) as a ghost button next to Scan.

### 4.4 DetailPanel

Slide-in from the right, width 320px, `bg --ps-bg-surface`, left border `--ps-border`, full height, `.ps-scanlines` on the hero block only.

Layout top→bottom:
1. **Hero**: icon at 96×96 (`image-rendering: pixelated`, `--ps-r-card`), centered on a radial indigo glow (`radial-gradient(circle, rgba(108,92,231,.18), transparent 70%)`).
2. **Title** (`text-title-1`) + platform badge underneath.
3. **Play button**: full-width pill, height 44px, `bg --ps-primary-500`, white Nunito 700 16px, `Play` icon, `--ps-glow-primary`. Hover `--ps-primary-600` + scale 1.02 spring; pressed `--ps-primary-700` scale 0.98. No emulator configured for the platform → disabled style + caption link "Choose an emulator in Settings".
4. **Metadata table** — 2-column rows, label `text-caption --ps-silver-500`, value `text-mono --ps-silver-300`:
   - Internal title (raw header string)
   - Game code
   - File size (`64.0 MB`)
   - Path (middle-truncated; click = Reveal in Finder; `Copy` icon on hover)
5. Close: `X` ghost icon button top-right; also `Esc`.

### 4.5 EmptyState

Centered in content area:
- Illustration: pure CSS/emoji — 96px `🕹️` (or `📦` for "no results") sitting on a CSS "shelf": a 140×8px rounded bar in `--ps-bg-raised` with `--ps-shadow-card`; emoji floats gently (§5.4).
- Headline `text-display`: "Your shelf is empty"
- Body `text-body`, `--ps-silver-500`, max-width 380px: "Point PocketShelf at the folder where you keep your own cartridge dumps and it will catalog everything." (Copy must never suggest downloading ROMs.)
- CTA: primary pill button "Add your ROM folder" (icon `FolderPlus`).
- Search-empty variant: `No matches for "{query}"` + ghost button "Clear search".

### 4.6 Settings

Modal sheet (560px wide, `--ps-r-card`, `--ps-shadow-overlay`); sections:

1. **ROM folders** — list rows (`--ps-r-control`, `bg --ps-bg-raised`): folder path (text-mono, middle-truncate) + `Trash2` ghost icon button (coral on hover). Footer: "Add folder…" secondary pill (native directory picker via Tauri dialog plugin).
2. **Emulators** — one row per platform: label "GBA" / "NDS" (factual descriptor, `text-body-strong`) + file picker button showing chosen app name or "Choose application…".
3. **Appearance** — segmented pill control: Dark / Light / System.

### 4.7 Toast notifications

Bottom-right stack, 12px gap, max 3 visible. Each: `bg --ps-bg-overlay`, radius 12px, `--ps-shadow-overlay`, padding 12px 16px, leading status icon, max-width 360px.

| Variant | Icon color | Example |
|---|---|---|
| success | `--ps-accent-mint` | "Scan complete — 42 games found" |
| info | `--ps-primary-400` | "Launching {title}…" |
| warning | `--ps-accent-amber` | "3 files skipped (unreadable header)" |
| error | `--ps-accent-coral` | "Emulator not found at saved path" |

Auto-dismiss 4s (error: 6s), hover pauses timer, swipe-right or `X` to dismiss. Motion in §5.5.

---

## 5. Motion

Library: `motion` (`import { motion, AnimatePresence } from "motion/react"`). Springs everywhere; durations listed are effective settle times. Global rule: respect `prefers-reduced-motion` — replace transforms with opacity-only fades.

### 5.1 Standard springs

```ts
export const spring = {
  snappy:  { type: "spring", stiffness: 420, damping: 30 },           // hovers, presses (~180ms)
  smooth:  { type: "spring", stiffness: 260, damping: 28 },           // panels, layout (~320ms)
  bouncy:  { type: "spring", stiffness: 300, damping: 18, mass: 0.9 } // playful: empty-state, toasts (~450ms)
};
export const easeOut = [0.16, 1, 0.3, 1]; // non-spring opacity fades, 200ms
```

### 5.2 GameCard hover (lift + tilt)

```tsx
<motion.div
  whileHover={{ scale: 1.03, rotate: index % 2 ? 1 : -1, y: -4 }}
  whileTap={{ scale: 0.98, rotate: 0 }}
  transition={spring.snappy}
/>
```

Tilt direction alternates by grid index so neighboring cards lean opposite ways — a cozy, hand-placed feel. Shadow transitions in parallel via CSS `transition: box-shadow 180ms ease-out`.

### 5.3 Grid entrance (staggered)

```tsx
const grid = { show: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } };
const card = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: spring.smooth }
};
```

Cap stagger at the first ~24 cards (index > 24 gets `delay: 0`) so large libraries never feel slow. Re-run on platform-filter change, NOT on search keystrokes (search = 120ms opacity only).

### 5.4 Panel slide-in (DetailPanel) & EmptyState float

```tsx
// DetailPanel, inside <AnimatePresence>
initial={{ x: 340, opacity: 0.5 }}
animate={{ x: 0,   opacity: 1 }}
exit=   {{ x: 340, opacity: 0 }}
transition={spring.smooth}
```

EmptyState emoji idle float: `animate={{ y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}`.

### 5.5 Toasts & Settings modal

- Toast in: `initial={{ x: 80, opacity: 0 }}` → `spring.bouncy`; out: `exit={{ x: 80, opacity: 0, transition: { duration: 0.18 } }}`. Stack reflow via `layout` prop with `spring.smooth`.
- Modal: backdrop fade 150ms (`rgba(0,0,0,0.5)` + 8px backdrop-blur); sheet `initial={{ scale: 0.96, y: 10, opacity: 0 }}` → `spring.smooth`.

---

## 6. Iconography

`lucide-react` only (open license, consistent stroke). 16px in controls, 20px in sidebar, stroke-width 2. Status dots: 6px circles. Never any game-company glyphs.

---

## 7. macOS Polish

### 7.1 Window & titlebar

`tauri.conf.json` (Tauri 2):

```json
"windows": [{
  "titleBarStyle": "Overlay",
  "hiddenTitle": true,
  "minWidth": 880,
  "minHeight": 560
}]
```

- Traffic lights overlay the sidebar's top-left. Reserve the sidebar's top 52px as an empty drag region: `<div data-tauri-drag-region class="h-[52px]" />`. The TopBar is also `data-tauri-drag-region` (interactive children excluded automatically).
- Keep default double-click-to-zoom on drag regions.

### 7.2 Sidebar translucency

True `NSVisualEffectView` vibrancy is plugin territory; ship the **faux-translucency** look in v1 (reliable, identical across spaces):

```css
.ps-sidebar {
  background: linear-gradient(180deg, rgba(23,23,30,0.92), rgba(18,18,23,0.94));
  border-right: 1px solid var(--ps-border);
  backdrop-filter: saturate(140%) blur(20px); /* harmless while window is opaque */
}
```

If window transparency is later enabled (e.g. `window-vibrancy` crate), the same CSS reads as real translucency — no redesign needed.

### 7.3 Keyboard shortcuts

Frontend `keydown` listener on `window` (`e.metaKey`), surfaced in tooltips:

| Shortcut | Action |
|---|---|
| `⌘F` | Focus search field (select existing text) |
| `⌘R` | Rescan library (`e.preventDefault()` to suppress reload) |
| `⌘,` | Open Settings (macOS convention) |
| `Esc` | Close DetailPanel / modal / clear focused search |
| `↑↓←→` | Move grid selection · `Enter` opens DetailPanel · `⌘Enter` = Play |

### 7.4 Misc

- `user-select: none` on chrome (sidebar/topbar/cards); selectable text only in metadata values.
- Scrollbars: `::-webkit-scrollbar` 8px, thumb `--ps-border-strong` rounded, transparent track.
- Focus ring: 2px `--ps-primary-400`, only on `:focus-visible`.
- `-webkit-font-smoothing: antialiased` app-wide.

---

## 8. Tailwind v4 wiring (reference)

```css
/* app.css */
@import "tailwindcss";
@import "@fontsource-variable/nunito";
@import "@fontsource-variable/manrope";
@import "@fontsource/jetbrains-mono";

@theme {
  --color-primary-300: #A99BFF;
  --color-primary-400: #8B7BF4;
  --color-primary-500: #6C5CE7;
  --color-primary-600: #5A4BD1;
  --color-primary-700: #483BAD;
  --color-bg-base: #121217;
  --color-bg-sidebar: #17171E;
  --color-bg-surface: #1C1C24;
  --color-bg-raised: #23232D;
  --color-bg-overlay: #2A2A36;
  --color-border-default: #2E2E3A;
  --color-border-strong: #3D3D4C;
  --color-silver-100: #F2F2F5;
  --color-silver-300: #C8C8D4;
  --color-silver-500: #8E8EA0;
  --color-silver-700: #5C5C6E;
  --color-mint: #4FD8B0;
  --color-amber: #FFC75F;
  --color-coral: #FF7E6B;
  --color-gba: #8B7BF4;
  --color-nds: #5FB7D4;
  --font-display: "Nunito Variable", ui-rounded, system-ui, sans-serif;
  --font-body: "Manrope Variable", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 16px;
  --radius-control: 10px;
}
```

---

## 9. Voice & copy

Friendly, brief, second person: "your shelf", "your library", "your dumps". Never "download", never "find ROMs". Errors are calm and actionable ("Emulator not found at saved path — pick it again in Settings"). Platform names appear in plain UI font as facts, nothing more.
