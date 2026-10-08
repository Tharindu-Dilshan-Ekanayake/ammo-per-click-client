# +1 Ammo Per Click — client

A blocky clicker shooter: every click fires your gun for Ammo, Ammo breaks the
stage walls, the Win pads at the end of each stage pay Wins (1, 5, 10, 50, 250…),
and Wins buy better guns, targets and pets. Rebirth for a permanent multiplier;
Rebirth 1 opens the **Boss Arena**, Rebirth 3 opens **Space World**.

React + three.js (react-three-fiber, Rapier physics), with the Bloxity SDK for
login, avatars and Bux.

## Running it locally

```bash
npm install
cp .env.example .env     # set VITE_GAME_SLUG
npm run dev
```

Run the server too (`../ammo-per-click-server`, `npm run dev`). With
`VITE_SERVER_URL=http://localhost:3000` in `.env`, a localhost page talks to it
directly — lobbies and cloud saves both.

## Where things are

| | |
| --- | --- |
| `src/game/guns.js` | every gun: price, Ammo per click, model type, colours |
| `src/game/walls.js` | wall health and the stage payouts (`STAGE_WINS`) |
| `src/game/trainers.js` | the shooting targets and their multipliers |
| `src/game/boss.js` | boss health, rewards and the fight clock |
| `src/game/passes.js` | Bux passes and Ammo packs |
| `src/game/catalog.js` | every Bux SKU in one list (must match the server's) |
| `src/game/cloudSave.js` | loading and saving progress on the game server |
| `src/net/hosting.js` | which back end and matchmaker this page uses |
| `src/game/world/layout.js` | the whole map: lobby, stages, Boss Arena, Space World |

## Deploying

Push to `dev` or `main` and `.github/workflows/deploy.yml` builds the game and
uploads it to Bloxity's frontend hosting (dev → `https://<id>.dev.play.bloxity.io`,
main → `https://<id>.play.bloxity.io`). It needs, in this repo's GitHub settings:

| where | name | value |
| --- | --- | --- |
| Actions → **Secrets** | `LEGION_DEPLOY_TOKEN` | the deploy token from My Games |
| Actions → **Variables** | `LEGION_GAME_ID` | the hosting id |
| Actions → **Variables** | `VITE_GAME_SLUG` | the slug on bloxity.io (usually the same) |

The page works out its own back end from its address: saves go to
`https://<id>[.dev].host.bloxity.io`, and the lobby socket goes through the Boxity
matchmaker (`Legion.SDK.net.resolveEndpoint`), never straight to the host.

## Bloxity admin panel: In-App Purchases

**Default Webhook URL** — the server's webhook, for the channel players buy on:

```
https://<gameId>.host.bloxity.io/api/legion-webhook
```

Without it, purchases still go through in the moment, but they are not recorded
against the account — a pass bought today is gone on the next device or the next
visit. If the panel offers a webhook secret, set the same value on the server as
`LEGION_WEBHOOK_SECRET` (see the server README).

**IAPs** — one per row, **SKU exactly as written**. The price is yours to choose: the
game reads it live from the panel, so the signs always show what the player will be
charged. The prices below are what the game shows if an IAP is missing.

| SKU | name | what it gives | suggested price |
| --- | --- | --- | --- |
| `pass_2x_power` | 2x Power | every click gives double Ammo, forever | 149 |
| `pass_2x_wins` | 2x Wins | every Wins payout doubled, forever | 99 |
| `pass_auto_wins` | Auto Wins | best cleared stage's Wins every 10 s while on | 199 |
| `vip_wins_pad` | VIP Wins Pad | opens the blue 2x pad at every stage | 99 |
| `gun_phantom_blaster` | Phantom Blaster | VIP gun, +25K Ammo per click | 99 |
| `gun_celestial_minigun` | Celestial Minigun | VIP gun, +700K Ammo per click | 249 |
| `target_vip_250x` | VIP Target | 250x shooting target | 99 |
| `target_vip_1000x` | Golden VIP Target | 1000x shooting target | 199 |
| `egg_exclusive` | Exclusive Egg | the Tralaledon pet, x20 Wins | 199 |
| `ammo_pack_100k` | 100K Ammo | 100,000 Ammo, once | 9 |
| `ammo_pack_1m` | 1M Ammo | 1,000,000 Ammo, once | 29 |
| `ammo_pack_10m` | 10M Ammo | 10,000,000 Ammo, once | 79 |

The browser console lists any of these the panel does not know yet
(`[bloxity] these IAPs are not set up in the admin panel yet: …`).
