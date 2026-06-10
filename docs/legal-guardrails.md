# Legal Guardrails — PocketShelf

Practical checklist to keep this public repo safe from Nintendo takedown action.
PocketShelf is a macOS ROM **library manager** for files the user already owns.
It includes no ROMs, no copyrighted assets, and no links to infringing content.

---

## 1. Trademark use rules (nominative fair use)

Platform names may appear **only as factual, descriptive references** — never as branding.

**OK (descriptive use):**
- "Supports `.gba` and `.nds` files."
- "A library manager for Game Boy Advance and Nintendo DS cartridge dumps." (plain text, in a sentence)
- File-format documentation: "GBA ROM header", "NDS banner icon" as technical terms.

**NOT OK (branding use):**
- Nintendo trademarks in the app name, logo, icon, tagline, domain, or bundle ID.
- Stylized renderings of "Game Boy", "Nintendo", "DS" (fonts, colors, logos that evoke Nintendo trade dress).
- "Nintendo DS Manager", "GBA Shelf", or any name implying affiliation or endorsement.
- The Nintendo logo, the stylized "DS" mark, console silhouettes used as identity elements.

**Rule of thumb:** if removing the Nintendo word would break a *sentence*, it's probably fine.
If removing it would break the *brand*, it's not.

## 2. Zero copyrighted assets policy

- [ ] No ROMs, BIOS files, firmware, or save files in the repo, releases, CI artifacts, or test fixtures.
- [ ] No Nintendo box art, sprites, logos, screenshots of commercial games, or sound effects.
- [ ] No Pokemon names, artwork, or references anywhere (code, comments, tests, docs, commit messages).
- [ ] No Nintendo fonts or UI recreations of Switch/eShop/DS system menus (trade dress).
- [ ] Test fixtures: use zero-filled or homebrew ROM files only; name them generically (`test-rom-1.gba`).
- [ ] Add a CI/grep check or pre-commit rule for binary blobs over a size threshold and known ROM extensions.

## 3. No ROM sites, links, or seeding

- [ ] No links to ROM download sites, "abandonware" archives, torrents, or ROM packs — anywhere
      (README, docs, issue templates, code comments, release notes).
- [ ] No "where to get ROMs" guidance. If users ask in issues, close with: "PocketShelf manages
      files you dump from your own cartridges. We can't help source ROMs."
- [ ] No built-in scrapers that download game assets from infringing sources. Metadata, if any,
      must come from user-provided files or clearly licensed databases.
- [ ] Pin an issue / add a `CONTRIBUTING.md` note so maintainers and contributors hold the same line.

## 4. README disclaimer (use this exact paragraph)

> **Legal disclaimer:** PocketShelf is a tool for organizing and managing personal backup copies
> of game cartridges that you legally own and have dumped yourself. It does not include, bundle,
> link to, or facilitate the download of any copyrighted ROMs, BIOS files, or other copyrighted
> content. PocketShelf is an independent open-source project and is not affiliated with,
> endorsed by, or sponsored by Nintendo. "Game Boy Advance" and "Nintendo DS" are trademarks of
> Nintendo, used here only to describe file compatibility. Users are solely responsible for
> complying with the copyright laws of their jurisdiction.

Place it near the top of the README, not buried at the bottom.

## 5. Naming check — "PocketShelf"

**Verdict: safe to use.**
- Distinctive: coined compound, not a Nintendo mark; no use of "Game Boy", "DS", "Nintendo",
  "Advance", or close misspellings.
- "Pocket" alone is generic/descriptive (portable devices) and widely used by third parties;
  combined with "Shelf" it clearly signals a library tool, not a game or console.
- No likelihood of confusion: it does not imply origin from or endorsement by Nintendo.
- Caveats: keep the logo/icon free of console silhouettes and Nintendo-evocative styling;
  avoid taglines like "the Game Boy library" (use "your ROM library" instead). Do a quick
  USPTO/EUIPO search before distributing binaries widely, as routine diligence.

## 6. Screenshots and marketing images

- [ ] Never show real commercial game artwork, titles, or box art — and **never Pokemon** anything.
- [ ] Populate demo libraries with: homebrew ROMs (e.g., permissively licensed homebrew from itch.io),
      original placeholder art, or generic titles ("Adventure Quest", "Puzzle Pack 2").
- [ ] If a real library must be shown, blur or replace cover thumbnails and titles.
- [ ] No recreations of DS/Switch/eShop UI in mockups.
- [ ] Check every asset before committing: screenshots live forever in git history.

## 7. Repo description and topics

- Description: "A macOS-native ROM library manager for personal cartridge backups (.gba/.nds)."
- Topics (OK): `rom-manager`, `library-manager`, `tauri`, `macos`, `retro-gaming`, `emulation-tools`, `homebrew`.
- Avoid: `nintendo`, `pokemon`, `roms-download`, `gba-roms`, `nds-roms`, or anything pairing a
  platform name with acquisition language ("free", "download", "collection pack").
- Release notes and social posts follow the same rules as the README: descriptive platform
  mentions only, no sourcing talk.

---

**If you receive a takedown notice:** don't ignore it; remove the flagged content promptly,
document what was removed, and get actual legal counsel before counter-noticing. This document
is practical guidance, not legal advice.
