# Poké 82-0 🏀

An [82-0](https://www.82-0.com/)-style basketball draft game for all 1,025 Pokémon (inspired by [All 22 Pokémon](https://all22pokemon.com/play)).
Spin the type wheel, draft 8 Pokémon into PG / SG / SF / PF / C plus a 3-deep bench, then simulate an 82-game season
and a 16-team playoff. Can your squad go **82-0**?

## How it plays

1. **Roll & draft.** Like 82-0's decade + team roll, each spin rolls a **generation** (I–IX) and a **type**, then deals up
   to 6 undrafted Pokémon from that generation with that type. Re-roll either half on its own: you get **3 generation and
   3 type re-rolls** per draft. Pick one and place it on the court. Tap a drafted Pokémon to move/swap positions.
2. **Stats → basketball ratings** (`src/engine/ratings.ts`, scaled 25–99):

   | Rating | Built from |
   | --- | --- |
   | Shooting | Sp. Atk (+ a little Speed) |
   | Finishing | Attack + size |
   | Playmaking | Speed + Sp. Atk |
   | Perimeter D | Speed + Sp. Def + Defense |
   | Interior D | Defense + HP + size |
   | Rebounding | HP + size (height & weight) + Attack |
   | Athleticism / Stamina | Speed / HP |

   Each position weights these differently (a Snorlax center is great, a Snorlax point guard is not).
   **Chemistry** rewards type diversity and evolution families on the same roster and penalizes stacking more than 2 legendaries.
3. **Season sim** (`src/engine/sim.ts`): a possession-by-possession game engine — turnovers, shot selection (3s vs. rim),
   contests by the matched defender plus rim protection, blocks, offensive rebounds, free throws, home court, and
   **type matchups** (a super-effective shooter gets a boost over their defender). Every game has a full box score.
4. **League**: 29 clubs led by champions, Elite Four members, gym leaders and villains from every region (Red, Cynthia,
   Leon, Geeta, Cyrus with Dialga, N with Zekrom…), split into an East (Kanto–Sinnoh) and West (Unova–Paldea) conference
   and tiered from gym-level to champion-level. Top 8 in each conference make the best-of-7 World Coronation Series.

5. **Play it yourself**: after the draft (or from the season recap), take your team onto the court in a live, NBA Jam-style
   5-on-5 game (~5 minutes, four 75-second quarters). Climb the **Gym Challenge** — 8 gym leaders, the Elite Four
   (Lance, Cynthia, Blue, Red) and Champion Leon, each unlocking the next and getting tougher — or play an
   **Exhibition** against any club. Ratings still drive everything: speed, shooting/finishing, steals and blocks,
   rebounding reach, stamina and type matchups. Hit three in a row and you're **on fire**.

   | Action | Keyboard | Touch |
   | --- | --- | --- |
   | Move | Arrows / WASD | Left stick |
   | Shoot (hold, release in the green zone) · steal/block on defense | J / Space | A (Shoot/Steal) |
   | Pass · switch defender on defense | K | B (Pass/Switch) |
   | Turbo | Shift | Turbo |
   | Pause | Esc / P | Pause button |

   On phones the court turns vertical in portrait, with the controls in a bar below it. Gym Challenge progress is saved
   per drafted roster in your browser. The live game lives in `src/play/` (engine, renderer, input), and the engine runs
   headless in tests.

**Daily Challenge** uses a date seed so everyone gets the same spins; **Free Play** is random. Results can be shared as a
link (`?seed=…`) that replays the same spins.

## Run it

### Docker + free Cloudflare link (recommended)

```bash
cp .env.example .env          # optional
docker compose up --build -d
./scripts/tunnel-url.sh       # prints https://<random>.trycloudflare.com
```

- The game is at http://localhost:8080 (change with `PORT` in `.env`). The port is only published on this machine by
  default; set `BIND_ADDRESS=0.0.0.0` in `.env` to open it to other devices on your network.
- The `tunnel` service runs `cloudflared`. With no token it opens a **free quick tunnel** — no Cloudflare account needed —
  and prints a public `https://*.trycloudflare.com` URL (new URL each restart; also visible with `docker compose logs tunnel`).
  `docker compose ps` shows the tunnel as `healthy` only while it is connected to Cloudflare.
- **Cloudflare error 1033** means the URL exists but no `cloudflared` is connected behind it. Either the container restarted
  (old quick-tunnel URLs die; run `./scripts/tunnel-url.sh` for the current one) or it can't reach Cloudflare. The tunnel uses
  HTTP/2 by default (TCP port 7844) because QUIC (UDP port 7844) is more often blocked; set `TUNNEL_PROTOCOL` in `.env` to change it.
  Either way the network must allow **outbound port 7844** to Cloudflare. If the logs show `dial tcp …:7844: i/o timeout`, a
  firewall is dropping it: cloudflared keeps retrying other Cloudflare servers and may connect after a minute or two, but a
  network that blocks 7844 entirely (common on corporate/managed networks) can't run the tunnel.
- For a **stable URL on your own domain**, create a tunnel in Cloudflare Zero Trust → Networks → Tunnels, point its public
  hostname at `http://web:8080`, and put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`. The same compose file then runs it as a named tunnel.

### Security

- Static site only: no backend, accounts or user data leave the browser (best record is kept in `localStorage`).
- nginx sends a strict Content-Security-Policy (self-hosted scripts, fonts and images only; no inline scripts or `eval`)
  plus `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS
  (`docker/security-headers.conf`, mirrored in `public/_headers` for Cloudflare Pages). It hides its version, only
  allows `GET`/`HEAD`, and never serves dotfiles.
- Both containers run as non-root users with read-only filesystems, all Linux capabilities dropped and
  `no-new-privileges`. The web port is published on `127.0.0.1` only; the tunnel reaches it over Docker's network.
- CI uses a read-only `GITHUB_TOKEN`, actions pinned to commit SHAs and an exact `wrangler` version. For Pages deploys,
  give the Cloudflare API token only the "Cloudflare Pages: Edit" permission.
- On your domain in Cloudflare, also turn on **Always Use HTTPS** and set SSL/TLS to **Full (strict)** if you ever
  point it at an origin directly instead of the tunnel.

### Permanent free `*.pages.dev` link (optional)

The game is a static site, so it can also live on Cloudflare Pages for free. Add the repo secrets
`CLOUDFLARE_API_TOKEN` (with the "Cloudflare Pages: Edit" permission) and `CLOUDFLARE_ACCOUNT_ID`; every push to `main` then
deploys to `https://poke-82-0.pages.dev` (override the project name with the `CLOUDFLARE_PAGES_PROJECT` repo variable).
See `.github/workflows/ci.yml`.

### Local dev

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests incl. balance checks
npm run build
```

## Project layout

```
src/data/       pokemon.json (1,025 Pokémon, generated), opponents, type chart
src/engine/     rng, ratings, draft, game sim, season + playoffs (pure TS, unit-tested)
src/store/      Zustand game state
src/screens/    Home, Draft, Season, Playoffs, Results
src/components/ Court board, spin reel, cards, box score, UI kit
public/sprites/ official artwork as 256px WebP (generated)
scripts/        fetch-pokemon.mjs (regenerates data + sprites), tunnel-url.sh
docker/         nginx config, cloudflared tunnel image + entrypoint
```

Regenerate the Pokédex data with `npm run data` (needs network + ImageMagick). The output is committed so Docker builds work offline.

## Design

The UI follows the bundled [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill
(`.claude/skills/ui-ux-pro-max`): the *Vibrant & Block-based* style for gaming, the *Gaming Bold* font pairing
(Russo One + Chakra Petch, self-hosted), a Poké Ball red / Pikachu yellow / court blue palette on a dark arena background,
44px+ touch targets, visible focus rings, and `prefers-reduced-motion` support.

---

Fan project, not affiliated with Nintendo, Game Freak or The Pokémon Company. Pokémon data and artwork via [PokeAPI](https://pokeapi.co/).
