---
name: Warm Editorial Glass
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#444748'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#685d4c'
  on-secondary: '#ffffff'
  secondary-container: '#eddec8'
  on-secondary-container: '#6c6150'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c1c'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#f0e0cb'
  secondary-fixed-dim: '#d3c4b0'
  on-secondary-fixed: '#221a0d'
  on-secondary-fixed-variant: '#4f4536'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-hero:
    fontFamily: Bodoni Moda
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Bodoni Moda
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: 0em
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-uppercase:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.18em
  label-caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-desktop: 2rem
  margin: 1.25rem
  margin-desktop: 4rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
  space-3xl: 6rem
---

## Brand & Style

This design system channels an elevated, tactile, and cinematic tone tailored for high-end visual storytelling, architectural photography, and documentary videography. The aesthetic balances the restraint of an art monograph with the fluid, modern tactility of editorial glassmorphism. 

The emotional response should evoke intimacy, stillness, and deliberate craftsmanship. Interfaces step back to let rich visual media lead, supporting imagery with airy negative space, warm organic undertones, subtle translucent card overlays, and high-precision typographic pairings.

## Colors

The palette is rooted in soft, warm natural light and archival paper tones:

- **Primary (`#1A1A1A`):** Deep charcoal ink used for high-contrast titles, primary interactive triggers, and dominant framing elements.
- **Secondary (`#C0B29E`):** Warm taupe / muted beige used for subtle accents, category tags, interactive states, and soft dividing details.
- **Tertiary (`#666666`):** Muted stone for secondary editorial copy, captions, timestamps, and discreet metadata.
- **Neutral (`#FAF8F5`):** Soft warm ivory canvas forming the foundational background, preventing the stark sterility of pure digital white.
- **Overlay & Glass:** Translucent milk white (`rgba(255, 255, 255, 0.65)`) layered over visual backdrops, framed by delicate translucent highlight borders (`rgba(255, 255, 255, 0.4)` to `rgba(255, 255, 255, 0.8)`).

## Typography

The type system creates an intentional juxtaposition between classical editorial high-contrast serif headlines (`Bodoni Moda`) and warm, modern humanist sans-serif body copy (`Plus Jakarta Sans`).

All primary labels, metadata tags, and studio captions make deliberate use of uppercase tracking (`letter-spacing: 0.18em`) to mimic gallery placards and film slate markings. Editorial body text maintains generous line heights to preserve comfortable reading cadences alongside large-format visual showcases.

## Layout & Spacing

The layout is built upon a 12-column responsive fluid grid with generous outer margins, reflecting editorial publication margins.

- **Desktop (>= 1024px):** 12 columns, 32px gutters, 64px canvas margins. Galleries alternate between asymmetric 7/5 column pairings and full-bleed cinematic spreads.
- **Tablet (768px - 1023px):** 8 columns, 24px gutters, 32px canvas margins.
- **Mobile (< 768px):** 4 columns, 16px gutters, 20px canvas margins. Multi-column editorial cards reflow into vertical tactile stacks with unified vertical spacing rhythm.

## Elevation & Depth

Visual hierarchy is achieved through modern optical glassmorphism combined with soft ambient lighting:

- **Frosted Glass (Base Level):** Cards, sticky navigation bars, and contextual overlays utilize `background: rgba(255, 255, 255, 0.65)` backed by `backdrop-filter: blur(16px) saturate(140%)` and a 1px perimeter highlight of `border: 1px solid rgba(255, 255, 255, 0.5)`.
- **Floating Overlays (Interactive Level):** Modals, media controls, and floating action prompts increase opacity to `rgba(255, 255, 255, 0.85)` with a 24px blur and an ambient warm shadow: `0 16px 40px -12px rgba(26, 26, 26, 0.08)`.
- **Flat Insets:** Recessed media viewports and thumbnail strips use subtle border outlines in `#E8E2D9` without dropshadows to keep the interface grounding calm and non-distracting.

## Shapes

The shape hierarchy establishes an organic, contemporary softness:

- **Containers & Glass Cards:** Utilize `rounded-2xl` (16px) for standard modules and `rounded-3xl` (24px) for hero containers, full-bleed media frames, and major floating panels.
- **Micro Elements:** Chips, interactive pill buttons, and audio/video transport scrubbers use continuous full-pill geometry (`rounded-full`) to offer a tactile, thumb-friendly feel.
- **Inputs & Text Fields:** Form controls utilize `rounded-xl` (12px) to subtly contrast with the larger radius of parent glass surfaces.

## Components

### Buttons
- **Primary:** Deep charcoal background (`#1A1A1A`), crisp white text, fully pill-shaped (`rounded-full`), padded `12px 28px`. Hover softly lifts with an opacity transition to `rgba(26, 26, 26, 0.85)`.
- **Secondary Glass:** Semi-transparent frosted fill (`rgba(255, 255, 255, 0.7)`), 1px border (`rgba(255, 255, 255, 0.8)`), charcoal text, pill-shaped. Hover triggers an inward glow and `background: rgba(255, 255, 255, 0.95)`.
- **Editorial Ghost:** Transparent background with an underline accent that expands on hover, styled in uppercase tracked text (`label-uppercase`).

### Cards & Media Panels
- Engineered as frosted panels (`rgba(255, 255, 255, 0.65)`) with `backdrop-filter: blur(16px)`, `border-radius: 24px`, and `border: 1px solid rgba(255, 255, 255, 0.5)`.
- Media embeds within cards take a slightly smaller nested radius (`16px`) to ensure harmonic concentric curvature.

### Chips & Tags
- Used for photography disciplines (e.g., "EDITORIAL", "35MM", "SHORT FILM"). Rendered with `label-uppercase`, `padding: 6px 14px`, `rounded-full`, background `rgba(192, 178, 158, 0.15)` and text `#1A1A1A`.

### Inputs & Selectors
- Studio booking and contact inputs feature a subtle glass background (`rgba(255, 255, 255, 0.5)`), thin borders (`#C0B29E` at 40% opacity), `rounded-xl` corners, and deep charcoal input text. Active focus transitions border color to `#1A1A1A` with a soft 2px ivory glow.

### Checkboxes & Radios
- Rounded custom controls; checked states fill with `#1A1A1A` exhibiting a subtle inset white checkmark or inner dot.

### Specialized Studio Components
- **Film Strip Navigation:** Horizontal scroll container with subdued borders, holding 16:9 and 4:5 aspect ratio media tiles with glassmorphic timecode overlays.
- **Audio/Video Scrubbers:** Minimalist hairline bars (`#C0B29E`) expanding slightly on hover, paired with floating frosted glass transport controls.