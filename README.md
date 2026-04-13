# Instagram Wrapped

A privacy-first web tool that parses your Instagram data export and generates a Spotify-Wrapped-style breakdown — swipeable story cards, real insights, shareable PNGs. Everything runs in your browser. Your data never leaves your device.

## What it does

Upload your Instagram data export ZIP and get an 11-card interactive deck:

- **Your Year** — total interactions, most active month, peak day, longest DM streak
- **Your Evolution** — profile change timeline + posting frequency by year
- **Top People** — your closest circle ranked by DMs, likes, and story reactions (with a force-directed network graph)
- **Relationship Insights** — one-sided friendships and late-night "situationship" patterns
- **Personality Type** — "Night Owl Scroller", "Chaos Messenger", etc. based on your behavior (with radar chart)
- **Red Flags** — patterns like liking without commenting, searching the same person repeatedly
- **Green Flags** — balanced friendships, consistent replies, regular presence
- **Content Categories** — what you're really into based on liked/saved accounts (with donut chart)
- **Device Locations** — how many devices you log in from, most-used browser
- **Ad Personality** — what Instagram thinks you are, including the most embarrassing ad category
- **Activity Heatmap** — GitHub-contributions-style grid of your daily activity

Every card can be shared as a PNG via the native share sheet (mobile) or downloaded (desktop).

## Privacy

- **No backend, no database, no analytics, no tracking**
- The ZIP is unzipped and parsed in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) in your browser
- Parsed data lives in browser memory only (Zustand store with zero persistence middleware)
- Refresh the page and every trace is gone
- The entire site is a static export — no server-side code runs at any point

## How to get your Instagram data

1. Open Instagram → Settings → Accounts Center → Your information and permissions → Download your information
2. Select your Instagram account
3. Choose **JSON** format (not HTML)
4. Request the download and wait for Instagram to email you the link
5. Download the ZIP file

## Run locally

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm

### Setup

```bash
git clone <your-repo-url>
cd InstagramWrapped
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click "Upload your export", and drop your ZIP.

The `predev` script automatically builds the Web Worker before starting the dev server. If you change anything in `src/parsing/`, restart `npm run dev` to rebuild the worker.

### Run tests

```bash
npm test
```

357 tests across 40 files. Tests run against the real export if present in the repo root (`instagram-*/`), otherwise they'll need a fixture.

### Build for production

```bash
npm run build
```

Produces a fully static export in `out/`. Serve it with any static file server:

```bash
npx serve out
```

### Deploy

The `out/` directory can be deployed to any static hosting:

- **Vercel** — connect your GitHub repo; Vercel auto-detects Next.js static export
- **Cloudflare Pages** — build command: `npm run build`, output directory: `out`
- **GitHub Pages** — push the `out/` directory
- **Any static host** — just upload the `out/` folder

No environment variables, no edge functions, no API routes — pure static files.

## Tech stack

| Layer             | Technology                                                                      |
| ----------------- | ------------------------------------------------------------------------------- |
| Framework         | [Next.js](https://nextjs.org/) 16 (App Router, static export)                   |
| Styling           | [Tailwind CSS](https://tailwindcss.com/) v4                                     |
| ZIP extraction    | [JSZip](https://stuk.github.io/jszip/) (in-browser)                             |
| Schema validation | [Zod](https://zod.dev/)                                                         |
| Client state      | [Zustand](https://zustand.docs.pmnd.rs/) (no persistence)                       |
| Charts            | [Recharts](https://recharts.org/) (radar, donut, bars)                          |
| Network graph     | [d3-force](https://d3js.org/d3-force)                                           |
| Animations        | [Framer Motion](https://www.framer.com/motion/)                                 |
| Card sharing      | [html-to-image](https://github.com/bubkoo/html-to-image)                        |
| Testing           | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| Worker bundling   | [esbuild](https://esbuild.github.io/)                                           |

## Project structure

```
src/
  app/          → Next.js routes (/, /upload, /wrapped, /wrapped/cards, /privacy)
  parsing/      → ZIP extraction, JSON decoders, 13 projections → normalized events
  model/        → TypeScript types (Interaction, ParsedBundle) + Zustand store
  modules/      → 11 insight algorithms (top people, personality, heatmap, etc.)
  cards/        → 11 story-card components + deck carousel + share logic
  viz/          → Reusable chart components (heatmap grid, radar, network, donut, bars, timeline)
tests/          → 357 tests (parsing, modules, cards, viz)
scripts/        → esbuild worker bundler
```

## How it works under the hood

1. User drops a ZIP on `/upload`
2. A Web Worker runs `JSZip` to extract the archive, then parses all JSON files through 3 generic decoders (Shape A: `label_values`, Shape B: `string_map_data`, Shape C: DM threads)
3. 13 projections convert the raw JSON into a normalized `Interaction[]` array (~12K events for a typical account) plus sidecars (profile changes, login events, ad interests)
4. The parsed bundle is saved to a Zustand store (in-memory only) and the user navigates to `/wrapped`
5. 11 insight modules run against the bundle, each gated by `requires` glob patterns so they auto-skip on accounts that lack the relevant data
6. `buildDeck()` filters and orders the module results into a card sequence, suppressing cards whose data doesn't meet quality thresholds
7. The `StoryDeck` carousel renders each card with Framer Motion swipe/drag, keyboard navigation, and tap zones
8. The share button uses `html-to-image` to snapshot the visible card to PNG

## License

MIT
