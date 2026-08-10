// Shared "glass" surface for the modern Navbar + ModernSidebar — a flat,
// neutral translucent tint (no brand-color gradient) plus a soft white sheen
// so it reads as glossy glass rather than a colored panel. Being a flat
// color rather than a directional gradient, it naturally lines up at the
// navbar/sidebar boundary with no seam, unlike the earlier gradient version.
//
// Kept genuinely see-through (low alpha) — legibility against whatever's
// behind it (bright white page, dark page, anything) is handled separately
// by MODERN_CONTENT_SHADOW below, applied as a filter: drop-shadow on the
// foreground content layer, not by making the panel itself darker/more
// opaque. That's the standard trick real glass UIs use: a truly transparent
// panel + a shadow halo on the text/icons sitting on top of it, rather than
// relying on the panel's own opacity for contrast (which is what forced a
// much-less-transparent 0.78 tint in an earlier pass, and it looked too
// opaque to read as glass).
export const MODERN_GLASS_BG = 'rgba(15, 23, 42, 0.22)'

// A soft diagonal light sweep layered over the flat tint above — the classic
// "light catching an angled glass pane" cue. Monochrome (white), not a color
// gradient, so it reads as a highlight rather than a hue shift.
export const MODERN_GLASS_SHEEN = 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 28%, rgba(255,255,255,0) 55%)'

// Applied via `filter` (not `text-shadow`, so it covers icons too, not just
// text) to the foreground CONTENT layer only — never the blurred background
// tint layer itself, which must stay a plain childless element (see
// ModernSidebar.tsx's comment on the Chromium backdrop-filter+scroll bug).
// Two stacked shadows: a tight dark one for crisp edge contrast, a wider
// soft one so content still reads even over a busy/bright patch behind it.
export const MODERN_CONTENT_SHADOW = 'drop-shadow(0 1px 2px rgba(0,0,0,0.85)) drop-shadow(0 2px 10px rgba(0,0,0,0.55))'

// Single, consistent icon color (the same teal/cyan accent used for the
// active-route dot and this app's "glow" chrome elsewhere) rather than a
// different color per icon — used at rest by both ModernSidebar and Navbar's
// feature icons; hover/active states switch to plain white so selection
// stays the clearest signal.
export const MODERN_ICON_REST_COLOR = 'text-(--color-accent-cyan-2)'
