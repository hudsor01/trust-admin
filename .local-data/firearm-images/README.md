# Firearm Images Workspace

**This directory is gitignored.** Only this README and `.gitkeep` are tracked. Anything you drop here stays on your local machine.

## Purpose

Hold firearm photos so the agent (Claude) can autonomously validate the corresponding `firearm` records in the database — cross-checking the photo's visible data (serial #, make/model, caliber stamp, NFA markings, condition state) against what's stored in the trust-admin DB.

## How to organize

Pick the simplest scheme that works for you. Two patterns the agent can handle without extra config:

### Pattern A — flat, name-encoded (simplest)

```
.local-data/firearm-images/
├── 12-glock-19-AAB1234.jpg
├── 12-glock-19-AAB1234-serial-closeup.jpg
├── 13-rem700-RL-789-receiver.jpg
└── 13-rem700-RL-789-stock.jpg
```

Format: `<firearm.id>-<make-slug>-<model-slug>-<serial-or-tag>.<ext>`

Multiple photos for the same firearm get a free-text suffix (`-receiver`, `-serial-closeup`, `-left-profile`, etc.). The agent uses the leading numeric id to look up the DB row.

### Pattern B — per-firearm subdirectory (more photos per firearm)

```
.local-data/firearm-images/
├── 12-glock19/
│   ├── 01-overview.jpg
│   ├── 02-serial-closeup.jpg
│   └── 03-receiver-markings.jpg
└── 13-rem700/
    ├── 01-stock.jpg
    └── 02-action.jpg
```

The leading numeric prefix on the directory name is the `firearm.id`. The agent walks the tree and groups by directory.

**Either pattern works.** Don't mix — pick one and stick with it across the whole directory so the agent's scan is unambiguous.

## What the agent will check when you ask it to validate

When you say *"validate the firearm images in `.local-data/firearm-images/`"*, the agent will:

1. **Inventory** — read every image file, extract the firearm id from the filename/directory.
2. **Pull DB record** — for each id, query `firearm` (via tRPC `firearm.byId` or direct Drizzle if needed) to get the row.
3. **OCR / vision** — read the photo and extract visible facts: serial number (from the receiver), make + model (from the slide/barrel), caliber stamp, NFA markings (tax-stamp number, SBR/suppressor marking), condition cues (rust, finish wear, missing parts).
4. **Compare** — match extracted vs stored. Flag mismatches:
   - serialNumber in photo ≠ DB → BLOCKING (regulatory record requires this match)
   - make/model differ → flag (could be data-entry typo or wrong photo attached)
   - caliber not visible / not matching → flag
   - condition mismatch (e.g. DB says GOOD, photo shows visible rust) → flag for review
   - NFA marking present but DB says `isNfa=false` → BLOCKING (compliance risk)
   - DB says `isNfa=true` but no visible NFA marking → flag
5. **Per-firearm report** — markdown summary written to `.local-data/firearm-images/<id>-VALIDATION.md` (also gitignored). Aggregate report printed to the chat.
6. **No automatic writes** — the agent will surface corrections you should make; YOU apply them via the `/firearms` admin page or a tRPC call. Auto-edits to firearm records require your explicit go-ahead per record.

## When you're ready

Drop photos in here, then in a fresh Claude Code session say:

```
validate the firearm images in .local-data/firearm-images/
```

Or to validate a single firearm by id:

```
validate firearm id 12 against the images in .local-data/firearm-images/
```

## Privacy / security notes

- This directory is **gitignored** — photos never reach the remote repo or any deployed environment.
- **Serial numbers and NFA tax-stamp numbers are PII**. Don't share photos outside the trust administration team.
- If you ever need to delete: `rm -rf .local-data/firearm-images/<id>*` (or the whole dir).
- Backups of this directory are your responsibility — not part of any automated trust-admin backup.

## Cleanup pattern

After validation, you can move processed photos to a `processed/` subdir to track what's been audited:

```
.local-data/firearm-images/processed/12-glock19/...
.local-data/firearm-images/pending/13-rem700/...
```

The agent will accept that layout too — it walks the tree recursively under any `pending/`, `processed/`, or no-prefix structure.
