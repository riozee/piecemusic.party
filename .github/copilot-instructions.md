# Copilot Instructions for piecemusic.party

- This is a Next.js 16 App Router site built in `src/app/` with a static content layer powered by Velite.
- Content lives in `content/` as MDX files. The key collections are:
  - `content/works/*.mdx` → song/work pages and `/download` grouping
  - `content/events/*.mdx` → event pages
  - `content/posts/*.mdx` → blog posts
- Velite schema and output alias are defined in `velite.config.ts`.
  - Generated content is emitted into `.velite/`
  - Code imports it via `#site/content`
- Important build flow: `npm run build` runs `velite build` first, then `next build`.
  - If you change frontmatter or add MDX content, the Velite step must run before Next build.

- Route files are under `src/app/`; page metadata and routing are defined in each route file.
  - `src/app/download/page.tsx` generates `/download` from `works` entries with `download` frontmatter.
  - `src/app/works/[slug]/page.tsx` and `src/app/events/[slug]/page.tsx` render individual content pages.
- UI components are in `src/components/`; shared logic like `AccessCardModal` and `DownloadList` live there.
  - Client-only components use `'use client'` at the top.
- Static assets are stored in `public/`, especially `public/images/`.

- There is no dedicated test suite in this repository, so prefer validating by running the app locally.
- Primary npm commands:
  - `npm run dev` → local development server
  - `npm run build` → Velite content generation + production build
  - `npm run velite` → only content generation
  - `npm run lint` → ESLint
- Deployment is expected to be a static export (`next.config.ts` uses `output: 'export'`) and Cloudflare Pages assets are configured with `wrangler.jsonc`.

- When editing content, preserve MDX frontmatter structure and quoting style.
  - Example `works` fields: `title`, `date`, `description`, `author`, `cover`, `download`, `accessCard`, `tags`, `links`, `highlight`.
- When editing rendering or page behavior, prefer touching `src/app/*` or `src/components/*` rather than `content/`.

- Be careful with alias imports:
  - `@/*` → `./src/*`
  - `#site/content` → `./.velite`
  - `@/components/*` → `./src/components/*`

- New download portal system:
  - `/app/download/page.tsx` and `/app/download/[album]/page.tsx` must use hardcoded JSON data in the TSX files for album and track metadata.
  - Do not rely on Velite or `content/works` for the new download route data.
  - Use `functions/api/access.ts` for passcode verification, Turnstile validation, D1 passcode lookup, IP tracking, and R2 file delivery.
  - Use `manage-codes/manage-codes.js` as the local CLI to sync the `passcodes` D1 table via `wrangler d1 execute`.
  - Keep existing global layouts, styles, and Velite config unchanged; this new system should be self-contained in `src/app/download/`, `src/components/portal/`, and `functions/api/`.

If any part of the content pipeline or route structure looks unclear, ask for the intended page or MDX format before changing it.
