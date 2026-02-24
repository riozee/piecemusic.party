# DESIGN_GUIDES.md

## 1. Project Context & Concept

- **Theme:** "Piece" (Puzzle) - Elements should feel like they fit together seamlessly.
- **Core Identity:** A music creator circle. The site must visually communicate musicality and rhythm without being overwhelming.
- **Primary Goal:** Fast, simple navigation that highlights music, events, and written content.

## 2. Global Design Constraints (Strict Rules)

When generating HTML/CSS/JS for this project, you must adhere to the following constraints:

- **Backgrounds:** \* Base: Solid color.
  - Layer: A heavily blurred Music Video (MV) background.
  - _Constraint:_ The video must act as ambient lighting, not a focal point.
- **Motion & Animation:**
  - Primary movement: Vertical scrolling only.
  - _Negative Prompt:_ Do NOT generate excessive horizontal animations, parallax effects, or continuous rapid background movements.
- **The "Rhythm" Rule:**
  - Timed animations (like image sliders/carousels) should follow a musical measure logic.
  - Example: Use 4-second intervals per slide, resulting in a 12-second total loop for 3 slides, mimicking a musical phrase.
- **Loading States:**
  - _Negative Prompt:_ Do NOT build complex JS preloaders or heavy loading screens. Use standard, lightweight HTML page transitions.

## 3. Component Specifications

### 3.1 Buttons

- **Default State:** Sharp, square corners (`border-radius: 0;`).
- **Hover State:** Smoothly transitions to rounded corners.
- **Animation Timing:** Strictly between `0.2s` and `0.3s`.
- **CSS Example Standard:** `transition: border-radius 0.25s ease-in-out;`

### 3.2 Navigation (Menu Bar)

- **Routing:** Must use hard page transitions (e.g., `<a href="/works">`). Do NOT use single-page anchor scrolling (e.g., `<a href="#works">`).
- **Mobile:** Must include a standard Hamburger Menu implementation.

## 4. Site Architecture & Routing Logic

### 4.1 Global Routes

- `/` (Home)
- `/works` (Music & Project Exhibitions)
- `/events` (Event Schedules & Details)
- `/blog` (Production notes, research, reports)
- `/about` (Circle philosophy, activities, core member list)
- `/download` (Access-card download listings)

### 4.2 Home Page Structure (Top to Bottom)

When generating the `index.html` or main page layout, assemble these sections in order:

1. **Header:** Simple logo, consistent with brand.
2. **Works (Carousel):** Auto-sliding highlight of 3-5 songs. Includes `[View Works]` button routing to `/works`.
3. **Schedule & Social (Row Layout):** Displays the single most recent upcoming event alongside an embedded real-time Twitter (X) feed. Includes `[View Events]` button routing to `/events`.
4. **Downloads (External Routing):** Displays album/single titles and cover art thumbnails. Routes to `/download`.
   - _Implementation:_ Works in Velite carry two optional frontmatter fields: `download` (URL string) and `accessCard` (boolean). When `accessCard: true`, clicking the download button on a `/works/[slug]` page opens an **Access Card Modal** instead of navigating directly.
   - _Access Card Modal:_ Displays the external URL as a warning banner, step-by-step 利用方法 (how-to-use) instructions, and 注意事項 (cautions) sourced from the physical access card. User must explicitly click "サイトに移動" to proceed.
   - _`/download` page:_ Groups all works that share the same `download` URL into a single list item. Each item shows a cover art collage (adapts layout for 1–4+ images), the combined work title(s) joined with commas and "&", and the raw URL string beneath. Clicking any item opens the same Access Card Modal.
   - _Deep-link via query param:_ `/download?id=<path-segment>` (e.g. `/download?id=piece_1_20251121`) will auto-open the modal for the matching group on page load. The `id` is derived from the URL path segment of the `download` field.
   - _Critical UI Rule:_ The download button must visually indicate it is an external link (uses `variant="warning"` orange styling). Direct navigation to the external site only occurs after the user reads and dismisses the modal.
5. **Blog Teaser:** Highlights recent articles/research. Includes `[Read Blog]` button routing to `/blog`.
6. **About Teaser:** Brief circle intro. Includes `[About Us]` button routing to `/about`.
7. **Footer:** Horizontal layout. External links only: X (Twitter), niconico, YouTube, TID-related sites.

## 5. Content & Copy Constraints

- **About Page Philosophy:** Must include the exact phrase: "音楽って音でできてるんですね" (Music is made of sound, isn't it).
- **Member List:** Do not generate a full roster list. Only map out data structures for "Key Roles/Positions" and a "Total Member Count".
- **Logic Correction Override:** Ensure all event data maps to `/events` and all portfolio/music data maps to `/works`.
