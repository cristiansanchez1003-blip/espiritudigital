---
name: Espíritu Digital
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#dcbed4'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#a4899d'
  outline-variant: '#564052'
  surface-tint: '#ffabf3'
  primary: '#ffabf3'
  on-primary: '#5b005b'
  primary-container: '#ff00ff'
  on-primary-container: '#510051'
  inverse-primary: '#a900a9'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#bfd043'
  on-tertiary: '#2d3400'
  tertiary-container: '#8a9a00'
  on-tertiary-container: '#282d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd7f5'
  primary-fixed-dim: '#ffabf3'
  on-primary-fixed: '#380038'
  on-primary-fixed-variant: '#810081'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#daed5c'
  tertiary-fixed-dim: '#bfd043'
  on-tertiary-fixed: '#1a1e00'
  on-tertiary-fixed-variant: '#434b00'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  section-gap: 120px
---

## Brand & Style
The design system for Espíritu Digital embodies a "Futuristic Minimalism" aesthetic, specifically tailored for a high-impact digital agency. The brand personality is visionary, precise, and sophisticated, aiming to evoke a sense of deep technological expertise and creative "spirit" (espíritu). 

The visual style leverages **Glassmorphism** as its primary structural metaphor—using translucent layers and frosted glass effects to create depth without clutter. This is paired with a **Corporate Modern** underlying structure to maintain professional credibility. High-impact visuals are achieved through vibrant neon accents against a void-like dark background, creating a "cyber-premium" atmosphere that feels both cutting-edge and dependable.

## Colors
The palette is built on a "Deep Dark" foundation to emphasize the luminosity of the digital interface.

- **Primary (Vibrant Magenta):** Used for core brand expression, primary calls to action, and active states. It represents the "spirit" and energy of the agency.
- **Secondary (Electric Cyan):** Reserved for technical highlights, data visualizations, and "success" metaphors. It provides a cool, digital contrast to the magenta.
- **Neutral / Background:** A hierarchy of deep blacks. The base layer is `#050505` (True Dark), while surfaces are built using semi-transparent overlays to create the glass effect.
- **Gradients:** Use linear gradients (45-degree angle) transitioning from Magenta to Cyan sparingly for high-impact hero sections or primary buttons to suggest movement and fluidity.

## Typography
The typography strategy blends the geometric impact of **Montserrat** for headlines with the utilitarian precision of **Inter** for body text.

- **Headlines:** Use Montserrat with tight letter-spacing to create a "locked-in," professional look. Large display titles should use Bold or Extra-Bold weights.
- **Body Text:** Inter is used for its exceptional readability in dark mode. Maintain a generous line-height (1.6) to prevent "halation" (where white text appears to glow/bleed into black backgrounds).
- **Labels:** Use Inter Medium or Semi-Bold with increased letter-spacing and uppercase styling for small metadata or overlines to enhance the "tech-specs" feel.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model for desktop to ensure a controlled, premium presentation, transitioning to a fluid model for mobile devices.

- **Grid:** A 12-column grid with 24px gutters. Content is centered within a 1280px max-width container.
- **Rhythm:** An 8px linear scale governs all spacing.
- **Sectioning:** Large vertical gaps (120px+) between major sections create "breathing room" that reinforces the minimalist aesthetic.
- **Mobile Adaptivity:** Margins reduce to 20px. Headlines scale down significantly to maintain readability and avoid awkward breaks. Elements should stack vertically, maintaining the glass card containers as the primary grouping mechanism.

## Elevation & Depth
Depth is not communicated through traditional drop shadows, but through **Backdrop Blurs** and **Luminous Outlines**.

1.  **Base Layer:** Solid `#050505`.
2.  **Level 1 (Cards/Panels):** Surface is `rgba(255, 255, 255, 0.03)` with a `backdrop-filter: blur(20px)`. A 1px border of `rgba(255, 255, 255, 0.1)` is required to define the edges.
3.  **Level 2 (Hover/Active):** Increase border opacity or add a subtle "inner glow" using a 0px spread shadow with the primary Magenta or Cyan color at 20% opacity.
4.  **Micro-interactions:** When an element is focused, it should "pulse" with a soft, diffused outer glow (shadow blur: 15px) in the accent color, simulating a powered-on state.

## Shapes
The shape language is "Rounded-Modern." 

Standard components (inputs, small buttons) use a **0.5rem (8px)** radius to feel approachable yet precise. Larger containers (cards, modals) should use **1rem (16px)** to emphasize the glass sheet metaphor. Avoid sharp 0px corners to maintain the fluid, "organic technology" feel, but avoid full pills for standard buttons to keep the agency feeling professional rather than casual.

## Components
- **Buttons:** Primary buttons use a solid Magenta-to-Cyan gradient or solid Magenta. Secondary buttons use the "Glass" style: transparent background, backdrop-blur, and a white or cyan 1px border. Hover states must include a "Glow" effect—a soft outer shadow in the button's accent color.
- **Glass Cards:** The signature component. Semi-transparent background with a high-strength backdrop blur. The border should be a subtle gradient (top-left to bottom-right) from `rgba(255,255,255,0.2)` to `rgba(255,255,255,0.05)`.
- **Input Fields:** Dark, recessed backgrounds (`rgba(0,0,0,0.4)`) with a 1px border. Upon focus, the border transitions to Electric Cyan with a subtle 4px cyan glow.
- **Chips/Tags:** Small, pill-shaped elements with low-opacity Magenta or Cyan backgrounds (`rgba(accent, 0.1)`) and matching text color. 
- **Navigation:** A fixed top-bar using the glass effect. Active links are indicated by a small, luminous Cyan dot underneath the text rather than a traditional underline.
- **Interactive Lists:** List items that reveal a Magenta vertical accent bar on the left side during hover, accompanied by a slight horizontal shift (4px) to indicate interactivity.