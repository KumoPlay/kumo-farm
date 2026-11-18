# Kumo Farm ☁️🌾

A cozy farming game on a floating cloud island, made by KumoPlay. Plant crops, look after hens and goats, bake in the Cloud Oven, fill orders for the sky neighbours, and grow the island one cloud patch at a time.

- Runs in phone and computer browsers. Installable ("Add to Home Screen") and playable offline after the first visit.
- No server, no accounts, no ads, no purchases, no links out, no data collection. The farm is saved in the player's own browser.
- Chill by design: nothing dies or spoils, nothing is lost while away, and no timer hurries the player.

Play: <https://kumoplay.github.io/kumo-farm/> (once deployed)

## Run it

You need [Node.js](https://nodejs.org) 22.12 or newer (the deployment uses Node 24).

```sh
npm install
npm run dev
```

Open <http://localhost:5173/kumo-farm/>.

### Try it on your phone (same Wi-Fi)

```sh
npm run dev:phone
```

The terminal prints a line like `Network: http://192.168.1.23:5173/kumo-farm/`. Type that address into the phone's browser. The phone and the computer must be on the same Wi-Fi, and if the computer asks whether Node may accept incoming connections, allow it.

Over this plain `http` address, browsers switch off a few things that only work on `https`: installing to the home screen, offline play, one-tap "Copy backup code" (the code is shown to copy by hand instead) and the request to keep storage. They all work on the real site.

## Check it

```sh
npm test         # unit tests: game rules, saves, storage, and checks on the content files
npm run build    # type-check, then build into dist/
npm run preview  # serve the built game at http://localhost:4173/kumo-farm/ (offline support works here)
```

## Deploy

Every push to `main` runs the tests, builds the game and publishes it to GitHub Pages with `.github/workflows/deploy.yml`. The repository's Pages source must be set to "GitHub Actions". If a test fails, nothing is published.

The game is served from `/kumo-farm/`. That path is set once, as `base` in `vite.config.ts`.

## Where things are

| Folder | What is in it |
| --- | --- |
| `src/content/` | **All game content and balance.** Data only: crops, animals, buildings, recipes, decorations, cloud patches, levels, prices, timers. |
| `src/art/` | **Every picture**, one SVG per file. |
| `src/i18n/` | **Every word** the player reads (`en.ts`). |
| `src/core/` | The game rules in plain TypeScript, with tests next to them. No drawing code. |
| `src/core/save/` | The save format, upgrades for old saves, and backup codes. |
| `src/platform/` | Browser things: storage, sounds, home-screen install, offline support. |
| `src/ui/` | The screens: farm view, bars and panels (Preact and plain CSS). |
| `public/` | The app icons. |

## Adding and changing content

Everything below is done by editing data files. Run `npm test` afterwards: it tells you if a name or picture is missing, or if a number makes no sense (for example a recipe that is worth less than its ingredients).

Ids are lowercase with dashes (`moon-melon`). An id is used three times: in the content file, as the key for its name in `src/i18n/en.ts`, and as the file name of its picture.

| To add… | Edit | Name in `en.ts` | Pictures in `src/art/` |
| --- | --- | --- | --- |
| a crop | `content/crops.ts` | `items` | `items/<id>.svg`, `crops/<id>-growing.svg`, `crops/<id>-ready.svg` |
| an animal and its home | `content/animals.ts` (`pens`, and its product in `goods`) | `objects` (home), `animals`, `items` (product) | `buildings/<home id>.svg`, `animals/<animal>.svg`, `items/<product>.svg` |
| a production building | `content/makers.ts` (`makers`) | `objects` | `buildings/<id>.svg` |
| a recipe | `content/makers.ts` (`recipes`) | `items` | `items/<id>.svg` |
| a decoration | `content/decorations.ts` | `objects` | `buildings/<id>.svg` |
| a cloud patch | `content/patches.ts` | none | none |
| a neighbour who sends orders | `content/customers.ts` | `customers` | `people/<id>.svg` |

New things appear in the shop, in orders and in the level-up message by themselves, at the `unlockLevel` you give them.

### Balancing the economy

| What | Where |
| --- | --- |
| Grow times, crop values, XP per crop | `content/crops.ts` |
| Animal prices, feed, product, time | `content/animals.ts` |
| Building prices, queue size, recipes, product values | `content/makers.ts` |
| Decoration prices | `content/decorations.ts` |
| Cloud patch prices and levels | `content/patches.ts` |
| XP needed per level, level-up coins | `content/levels.ts` |
| Starting coins, harvest bonus chance, plot prices and limits, barn sizes and upgrade prices, order sizes and how much orders pay | `content/balance.ts` |

How the numbers fit together:

- `value` is what one item sells for from the barn. An order pays `value × coinFactor` (1.6 to start with) and also gives XP, so orders are always the better deal.
- `orderQty` is how many of an item an order asks for, as `[fewest, most]`.
- The first slot on the orders board is always small (one item type, from the cheaper half of what the player can make), so a short visit can always finish something.
- Orders only ask for things the player can make today: animal goods need the animal home, products need the building and every ingredient.
- Times are written as `30 * SEC`, `2 * MIN`, `3 * HOUR`.

### Checking the pace

```sh
npm run simulate
```

A pretend player (`src/sim/player.ts`) plays the real game rules for 90 days on a few visit schedules: once a day for 3 minutes, four quick visits a day, and quick visits plus a 20-minute evening. It prints when each level is reached, how many minutes of play that took, and when each building was bought.

`npm test` also runs these as guard rails, so a balance change that breaks the pace shows up as a failing test:

- Level 2 comes in the first visit and level 3 on the first day, for every player.
- Every player unlocks everything, and never waits more than a week for the next level along the way.
- A player who visits a few times a day gets one to three weeks of new things.
- Every player can afford every animal home and building.

The pretend player is sensible, not perfect, and it does not decorate, so treat its numbers as a guide. Progress mostly follows minutes played: a 3-minute-a-day player moves about a quarter as fast as one who visits four times a day.

With the current numbers, the four-visits-a-day player unlocks everything on day 7, the once-a-day player on day 25, and the evening player on day 6.

### Swapping in better art

Replace an SVG in `src/art/` and keep its file name. Nothing else changes. Crop, item, animal and 1 × 1 pictures use a `0 0 64 64` viewBox; things that cover 2 × 2 tiles use `0 0 128 128` (64 per tile). `src/art/index.ts` lists the naming rules.

The home-screen icons in `public/` were exported from `src/art/app/icon.svg` at 512, 192, 180 and 32 pixels; `public/favicon.svg` is the same picture with rounded corners. If you change the icon, export those sizes again with any SVG tool.

### Text and languages

All text is in `src/i18n/en.ts`. To add Thai, copy it to `th.ts`, translate the values, and choose the language in `src/i18n/index.ts`. Words in `{curly braces}` are filled in by the game and must stay as they are. The Nunito font has no Thai letters, so Thai also needs a font added in `src/ui/styles/main.css`.

### Sounds

Sounds are made in code, with no audio files: see `src/platform/audio.ts`. Each sound is a short list of notes that can be edited there. Nothing plays until the player has tapped once, and Settings has a sound switch.

## How saving works

- The farm is saved after every action and when the tab is hidden, in IndexedDB, with a mirror in localStorage. On load the newest good copy wins, and a copy of the last save that loaded fine is kept as a backup.
- Every timer runs on an internal game clock that only moves forward. Time away counts in full. If the device clock jumps backwards, the game clock simply waits; nothing breaks and nothing is lost.
- Settings has a backup code (copy or save as a file) to move a farm to another device, and "Start a new farm" with a confirmation.
- A second tab takes over politely: the older tab stops saving, so two tabs never overwrite each other.

### Changing the save format

When the shape of the saved game changes (`GameState` in `src/core/state.ts`):

1. Raise `SAVE_VERSION` in `src/core/save/schema.ts` by one.
2. Add a step under the old version number in `src/core/save/migrations.ts`. It receives the old shape and returns the new one.
3. Add a test with an example of the old save in `src/core/save.test.ts`.

Old saves are upgraded step by step when they are loaded, so existing farms keep working. Loaded data is also checked and repaired (`normalizeState`), so a damaged save or a removed item cannot crash the game.

## Offline and install

`vite-plugin-pwa` builds a service worker that keeps a copy of the whole game on the device. When a new version has been downloaded, the game shows an "Update" button rather than changing mid-play. The web app manifest (name, colours, icons) is in `vite.config.ts`.

Browsers may clear a website's storage after a while without visits (Safari on iPhone in particular). The game asks the browser to keep its storage, and gently suggests "Add to Home Screen" once, because an installed game is much less likely to be cleared.
