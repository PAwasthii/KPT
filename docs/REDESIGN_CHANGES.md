# Synkro Redesign — Changes Summary

This document covers the visual/design changes made on top of the existing
Synkro rebrand, based on `Synkro Brand Guideline 1 (1).pdf` and the reference
dashboard screenshot. **No backend code, business logic, API routes, or
frontend page/component structure were changed.** Every change below is
styling, asset, or copy-free markup polish inside existing components.

## 1. Sidebar / brand gradient — more teal, still balanced

**File:** `packages/ui/src/components/ui/sidebar/sidebar.tsx`,
`packages/ui/src/styles/globals.css` (`--sidebar-gradient`)

The vertical navy → teal gradient used on the sidebar rail was weighted too
far toward Deep Indigo before turning teal. Per the reference dashboard
screenshot (more teal presence, still balanced with indigo at the top for
logo contrast), the middle color stop was moved from 55% → 38% and swapped
for a richer mid-teal tone:

```
before: linear-gradient(180deg, #0F1B3D 0%, #075E68 55%, #009D9A 100%)
after:  linear-gradient(180deg, #0F1B3D 0%, #0E6B6E 38%, #009D9A 100%)
```

The login page's brand panel gradient was updated to match the same teal
weighting (see §3).

## 2. Button hover states — matches brand guide §5.2

**File:** `packages/ui/src/components/ui/button.tsx`

The brand guide's Primary Button spec shows teal as the default state and
**Deep Indigo as the hover state** (not just a darker/lighter teal). The
`default` button variant hover was changed from `hover:bg-primary/90` to
`hover:bg-brand-indigo`, with a small `hover:shadow-sm` lift for tactile
feedback. The `outline` (secondary action) variant's indigo border/fill was
left as-is — this token underpins ~140 secondary/utility buttons across the
app (Cancel, Export, Filter, etc.), and the brand guide's own 60/30/10 color
proportion rule (§2.5) reserves teal for primary CTAs only, so it was not
recolored to teal to avoid overusing the 10% accent budget.

## 3. Login page — structural polish only, no new copy

**File:** `apps/web/components/login-form.tsx`

- The form fields are now wrapped in a bordered, softly-shadowed card
  (`rounded-xl border bg-card shadow-sm`) instead of sitting directly on the
  page background — gives the form clearer visual grouping without touching
  any of the existing fields, labels, or logic.
- The right-hand brand panel gradient was updated to the same teal-weighted
  gradient as the sidebar (`#0F1B3D → #0E6B6E → #009D9A`) so both surfaces
  read as one consistent brand treatment.
- Added a single decorative soft-glow blur shape (pure CSS, `aria-hidden`)
  behind the logo on the brand panel for depth — no text, icons, or taglines
  were added anywhere on the page, per instruction.

## 4. Dashboard card hover feedback

**File:** `apps/web/components/analytics-overview.tsx`

The "Leads Generated" / "Conversion Rate" / "Lead Sources" cards (the ones
shown in the reference screenshot) now share the same subtle hover treatment
already used on the key-metric tiles below them (`hover:shadow-md
hover:border-primary/30`, 200ms transition) — consistent, restrained hover
feedback across the whole dashboard grid, no motion/scale effects that could
feel janky or add lag.

## 5. Color palette — completed missing token

**File:** `packages/ui/src/styles/globals.css`

The brand guide's §3.4 Accent Palette includes **Pink `#FF4D9D`** (used for
"Important Alerts" and already referenced directly by hex in the chart color
array), but it had no corresponding CSS variable/Tailwind utility. Added
`--brand-pink` / `bg-brand-pink` etc. alongside the other accent tokens for
consistency and future reuse.

## 6. Performance — page-switch speed

**Files:** `apps/web/app/assets/images/logos/*.png`

The three logo files used in the persistent sidebar, header, and login page
were massively oversized for how they're actually displayed (max ~28–90px
tall on screen):

| File | Before | After | Reduction |
|---|---|---|---|
| `logo_synkro_white.png` (2991×708) | 476 KB | 16 KB (640×151) | 97% |
| `logo_v1.png` (2991×708) | 189 KB | 8 KB (640×151) | 96% |
| `logo_symbol_white.png` (1028×1028) | 189 KB | 2.8 KB (128×128) | 99% |

These are resized (not just re-encoded) versions with plenty of headroom for
retina displays at their real render size, so visual quality is unaffected.
Since these assets load on effectively every authenticated page (sidebar/
header) and on the login screen, cutting ~840 KB combined down to ~27 KB
noticeably reduces first-load and navigation payload weight.

No other frontend performance bottlenecks (route-transition libraries,
polling intervals, unnecessary client-side blocking guards) were found in
this pass — the app already prefetches sidebar links via `next/link`, and the
one canvas animation (`ParticleNetwork`) only mounts on the login screen and
cleans up its animation frame on unmount.

## Not changed (out of scope, on purpose)

- No backend/API route or business-logic files were touched.
- No page layout, component tree, or routing structure was changed —
  every edit above is a className/style/asset change inside existing markup.
- No copy was added to the login page (no taglines, no extra headings).
- Secondary (`outline`) button color and the generic `Card` component were
  deliberately left alone (see §2) since they're shared by 100+ non-brand
  call sites across the app; recoloring them app-wide would overshoot the
  brand guide's own color-proportion rule and risk regressions well beyond
  what was asked.

## Note on visual verification

This environment has no browser/screenshot tooling available, so these
changes were verified by: reading the rendered JSX/CSS directly, confirming
`tsc --noEmit` introduces no new type errors from these edits (pre-existing,
unrelated errors exist in `ParticleNetwork.tsx` on `main` already), and
confirming the dev server serves `/` and `/login` with `200 OK` after the
edits. A quick manual look in the browser is still recommended before
shipping.
