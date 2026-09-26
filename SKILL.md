---
name: finor-design-system
description: Apply this fintech-dashboard design system (indigo/mint/coral palette, bold tabular numerals, pill-shaped nav and badges, hatched-texture charts and progress bars, near-flat elevation) whenever building, restyling, or reviewing UI for this app. Trigger this skill any time the user asks to redesign a screen, build a new page/component/dashboard, add a chart or progress bar, create a card, button, or nav element, or says things like "match my app's style," "use our design system," "make it look like Finor," or "keep it consistent with the rest of the app" — even if they don't explicitly mention design tokens. Always consult this before writing any HTML/CSS/JSX for this app's UI.
---

# wepay Design System

A clean, high-contrast fintech dashboard aesthetic: flat surfaces, one bold brand color, disciplined accent palette, and a signature diagonal hatch-texture used to represent "inactive / remaining" state in charts and progress bars. Soft everywhere (pill shapes, big radii), minimal shadow, numbers-first hierarchy.

Use the tokens and patterns below verbatim when generating UI for this app, unless the user's request explicitly overrides one of them.

## 1. Color Tokens

```css
:root {
  /* Brand / primary */
  --color-primary: #4F46E5;       /* indigo — hero cards, active states, primary CTAs */
  --color-primary-dark: #3730A3;  /* gradient end for card/hero surfaces */

  /* Neutrals */
  --color-bg: #F5F6FA;            /* page background, cool light gray */
  --color-surface: #FFFFFF;       /* card background */
  --color-text-primary: #14161A;  /* headings, big numbers */
  --color-text-secondary: #8A8F98;/* labels, timestamps, muted text */
  --color-border: #ECEDF1;        /* hairline dividers, input borders */

  /* Semantic accents */
  --color-positive-bg: #E3F8EE;
  --color-positive-text: #1C9A5B; /* up-trend pills, "Success" status */
  --color-negative-bg: #FDEAEA;
  --color-negative-text: #E0483E; /* down-trend pills */
  --color-tertiary: #F0704F;      /* coral — secondary chart/progress accent, use sparingly */
}
```

Rules:
- Exactly one primary hue (indigo) carries brand weight. Green/coral/red are semantic only — never decorative.
- Green = positive trend or success status. Red/coral-red = negative trend. Coral (orange-red, distinct from the negative red) = a secondary data-series color (e.g. a third progress bar), not a status.
- Backgrounds are always near-white or near-white-gray. Never use dark mode surfaces unless explicitly asked.

## 2. Typography

- Font stack: a modern grotesque — `Inter, "General Sans", "Satoshi", system-ui, sans-serif`.
- Numerals: use `font-variant-numeric: tabular-nums;` on every dollar amount so figures align in tables and don't jitter.
- Three-tier hierarchy, apply consistently:

| Tier | Use | Size | Weight |
|---|---|---|---|
| Hero number | Primary stat on a card ($102,489.00) | 32–40px | 700 (bold) |
| Heading | Section/card titles (My Cards, Savings) | 18–20px | 600 (semibold) |
| Body/label | Timestamps, categories, nav text | 13–14px | 400–500, `--color-text-secondary` |

Never introduce a fourth size tier — flatten anything that doesn't fit one of these three into the closest one.

## 3. Spacing & Shape

```css
:root {
  --radius-card: 20px;     /* all cards */
  --radius-pill: 999px;    /* nav tabs, badges, buttons, progress-bar tracks */
  --radius-sm: 10px;       /* small inline elements (icons-in-circle use 50%) */
  --gap-grid: 20px;        /* gutter between cards in a dashboard grid */
  --pad-card: 24px;        /* inner padding of a standard card */
}
```

- No sharp corners, anywhere. If in doubt, round it more, not less.
- Cards align to a strict internal grid: icon top-right (outlined circle), label top-left, big value bottom-left, trend/delta bottom-right. Reuse this exact slot layout for every stat card so the eye doesn't have to relearn position card to card.

## 4. Elevation & Shadow System (Untitled UI–based)

A shadow is a claim about distance from the page — reserve it accordingly. If every surface floats, none of them do.

### Shadow scale

```css
--shadow-xs:  0 1px 2px rgba(16,24,40,0.05);
--shadow-sm:  0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04);
--shadow-md:  0 4px 8px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04);
--shadow-lg:  0 8px 16px rgba(16,24,40,0.10);
--shadow-xl:  0 12px 24px rgba(16,24,40,0.12);
--shadow-2xl: 0 20px 40px rgba(16,24,40,0.14);
--shadow-3xl: 0 32px 64px rgba(16,24,40,0.16);
```

Assign by how far the element should feel off the page:
- **Resting surfaces** (cards, sidebar panel, list rows): `--shadow-xs` or `--shadow-sm` only.
- **Temporary floats** (dropdowns, popovers, tooltips): `--shadow-md` / `--shadow-lg`.
- **Screen-taking overlays** (modals, dialogs): `--shadow-xl`–`--shadow-3xl`, backed by a dimmed scrim.

Two overlapping surfaces should never share a shadow step — if a dropdown and the button that opened it look equally elevated, one of them is wrong.

### Rule: elevated surfaces read brighter, not just shadowed

Every card-type surface — **sidebar panel, search bar, input field, dropdown, stat card** — must be visibly **brighter (lighter background) than the page it sits on**, in addition to its shadow step. Shadow alone is easy to lose against a busy background; lightness contrast is what actually reads at a glance.

```css
--color-bg: #F5F6FA;             /* page */
--color-surface: #FFFFFF;        /* any resting card, incl. sidebar panel */
--color-surface-input: #FFFFFF;  /* inputs / search — same brightness or brighter than the card it's inside */
```

If a card must sit on a surface that's already white, tint the page background down slightly rather than dimming the card — the card is always the brighter of the two.

### Inputs & search fields

Inputs and search bars are the most-interacted-with elements on the page, so they get an always-visible treatment, not a hover-only one:
- Background: `--color-surface-input`, brighter than the card it sits inside.
- Shadow: `--shadow-xs` applied **inline by default** — part of the resting style, not added only on `:hover`/`:focus` — so the field reads as interactive at rest.
- Border: 1px `--color-border` for edge definition even where the shadow is subtle.
- On focus, layer the focus ring on top of this resting shadow — never replace it.

### Focus rings

A layer can carry only one effect style, so a focused control that also needs a shadow gets the two baked into one combined style rather than stacked live:

```css
--focus-ring:        0 0 0 4px rgba(79, 70, 229, 0.24), 0 0 0 1px var(--color-primary);
--focus-ring-error:  0 0 0 4px rgba(224, 72, 62, 0.18), 0 0 0 1px var(--color-negative-text);
--focus-ring-shadow-xs: var(--focus-ring), var(--shadow-xs); /* ring + resting shadow, combined */
```

Keep the ring visible enough to clear WCAG's focus-visible requirement — aim for the equivalent of a 2px perimeter at 3:1 contrast against the unfocused state.

### Backdrop blur

For scrims and frosted panels, always pair with a semi-transparent fill — blur alone doesn't dim, so busy content behind it keeps competing with what's on top:

```css
--blur-sm: 4px;
--blur-md: 8px;
--blur-lg: 16px;
--blur-xl: 24px;
```

### Dark mode note

Don't port these shadows unchanged into a dark variant — a dark shadow on a dark surface has almost nothing to contrast against. Lean on lighter surface tone and visible borders to carry elevation instead of shadow depth.

### Style hygiene

Define every value above as a named token, never a one-off blur radius typed directly into a component. A pasted shadow can't be searched or updated centrally and will drift from the rest of the system within weeks.

## 5. Signature Motif: Hatch Texture

This is the one distinctive, ownable detail of the system — use it deliberately, not everywhere.

**Rule: diagonal hatch = inactive/remaining. Solid fill = active/achieved/selected.**

SVG pattern definition (reuse this exact pattern, recolor via `stroke`):

```html
<svg width="0" height="0">
  <defs>
    <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#C7CAD1" stroke-width="2" />
    </pattern>
  </defs>
</svg>
```

Apply as `fill="url(#hatch)"` on:
- **Bar chart bars** that are not the selected/hovered month (selected bar gets solid `--color-primary` fill instead).
- **Progress bar remainder** — e.g. a savings goal at 26% renders 26% solid `--color-primary` (or `--color-tertiary`) and the remaining 74% as the hatch pattern, inside a pill-shaped track (`--radius-pill`).

Do not use the hatch texture as generic decoration — it only appears where it's communicating "this part isn't filled/selected yet."

## 6. Component Patterns

**Stat card** (Income/Expenses/Savings style):
`white or primary-colored surface, --radius-card, --pad-card` → outlined icon-circle top-right → label top-left (secondary text) → hero number bottom-left → trend pill bottom-right (`--color-positive-bg`/`--color-negative-bg`, pill-shaped, small up/down arrow).

**Nav pills**: horizontal row, pill-shaped container, active tab = solid dark/black or primary background with white text; inactive tabs = transparent with `--color-text-secondary`.

**Input / search field**: `--color-surface-input` background (brighter than its parent card), `--radius-pill` for search bars or `--radius-sm` for form inputs, 1px `--color-border`, `--shadow-xs` applied inline at rest (see §4), leading icon in `--color-text-secondary`, placeholder text also secondary. On focus: swap to `--focus-ring-shadow-xs` — ring + resting shadow together, background stays the same bright surface.

**Progress bar (savings-goal style)**: label + current/target amount on one line, percentage badge, then a pill-track below split solid/hatch per §5.

**Transaction row**: circular brand/merchant icon left, name + timestamp stacked, payment-method chip, outlined category tag, solid status pill (green = success), amount right-aligned with tabular numerals. Rows grouped under a date header showing a transaction count.

**Credit card widget**: the one intentionally skeuomorphic element — indigo-to-navy gradient, chip icon, contactless icon, masked PAN, expiry, freeze toggle switch. Everything else in the system stays flat; this widget is the deliberate exception because it's meant to read as a physical card.

## 7. Motion

Keep motion subtle and functional — never decorative bounce or long durations.

- Bar chart bar select: hatch → solid fill cross-fades, ~150–200ms ease-out; tooltip scales in from 95%→100% + fades, ~150ms.
- Progress bars: animate fill from 0 → target value on mount/load, 400–600ms ease-out, once.
- Nav tab switch: active pill background slides or cross-fades between tabs, ~150ms — never an instant jump-cut.
- Toggles/switches: standard 150–200ms slide with slight ease-spring.
- Hover states on cards/buttons: opacity or subtle background shift only, ~100–150ms — no scale/lift on hover (stay flat).

## 8. Tailwind Mapping (if this app uses Tailwind)

```js
// tailwind.config.js excerpt
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#4F46E5', dark: '#3730A3' },
      surface: '#FFFFFF',
      bg: '#F5F6FA',
      positive: { bg: '#E3F8EE', text: '#1C9A5B' },
      negative: { bg: '#FDEAEA', text: '#E0483E' },
      tertiary: '#F0704F',
    },
    borderRadius: { card: '20px', pill: '9999px', sm: '10px' },
    boxShadow: {
      xs: '0 1px 2px rgba(16,24,40,0.05)',
      sm: '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)',
      md: '0 4px 8px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
      lg: '0 8px 16px rgba(16,24,40,0.10)',
      xl: '0 12px 24px rgba(16,24,40,0.12)',
      '2xl': '0 20px 40px rgba(16,24,40,0.14)',
      '3xl': '0 32px 64px rgba(16,24,40,0.16)',
      'focus-ring': '0 0 0 4px rgba(79,70,229,0.24), 0 0 0 1px #4F46E5',
      'focus-ring-xs': '0 0 0 4px rgba(79,70,229,0.24), 0 0 0 1px #4F46E5, 0 1px 2px rgba(16,24,40,0.05)',
    },
  },
}
```

## 9. Applying This to an Existing App (checklist)

When retrofitting a screen that doesn't yet match this system:
1. Swap the background to `--color-bg`, cards to `--color-surface` with `--radius-card`.
2. Re-map existing box-shadows onto the xs–3xl scale by how far each element should feel off the page (§4); make sure every card, the sidebar panel, and every input/search field render **brighter than the surface behind them**, with inputs carrying their `--shadow-xs` inline at rest rather than only on hover.
3. Round every interactive control (buttons, tabs, badges, input pills) to `--radius-pill`.
4. Re-run all monetary/stat values through the 3-tier type hierarchy (§2) and add tabular numerals.
5. Re-color trend indicators to the semantic green/red pill pattern — remove any other ad hoc colors used for trends.
6. Anywhere there's a "progress toward a goal" or "selected vs. unselected" visual, apply the solid/hatch pattern from §5 instead of two flat colors.
7. Check motion timings against §7 — trim anything longer than ~200ms for micro-interactions.

Ask the user before changing brand hue if their app already has an established, different primary color — this system's structure (type scale, radii, shadows, hatch motif, motion) transfers even if the accent color itself stays theirs.