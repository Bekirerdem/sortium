# scoreboard — pool bets on the numbers the internet watches

Prediction games on public internet numbers: which song tops Apple Music in a country tomorrow, which video tops YouTube, how many views a creator's new video gets in 24 hours. A template factory opens the markets automatically, every market is a pool bet, and outcomes are decided by open resolver code reading a public source, posted to UMA's Optimistic Oracle on Arbitrum with a dispute window. No admin decides results.

Built for the Colosseum Crypto World's Fair hackathon, Arbitrum track. Testnet only (Arbitrum Sepolia), test dollars only.

- App: https://cwf-markets.pages.dev
- Engine API: https://cwf-engine.l3ekirerdem.workers.dev/api/markets
- Contracts (Arbitrum Sepolia, chain 421614):
  - PoolMarkets `0x950863296D8d229ee7B847E20B7960E8C7f6C41a`
  - UmaResolver `0x15F8C0C400beDE3d228A88af1360e4e3e899D623`
  - TestUSD `0x15cA921E97e8E3c33C1DAf63DBdfD173b4e1C970`
  - UMA Optimistic Oracle V3 (UMA's deployment) `0x1037A21a30aEfF90c269b01c3933eB9a5285d9b8`

## Why

- The big venues don't pick categories, they run template factories: Kalshi turns ~15k series into ~119k markets (one template × many entities × repeating windows).
- Long-tail fun markets die on order books. Kalshi opened ~820 music and ~58 YouTube series; almost all are empty today because liquidity fragments. Pool betting needs no market maker and works with 20 players.
- Resolution is the sector's open wound: rule drift, missing sources, admin-final results. Here the rule is code, the evidence is hashed, and UMA lets anyone dispute.

## How a market lives

```
template ──▶ engine (Cloudflare Worker, cron) ──▶ PoolMarkets.createMarket
players  ──▶ bet / betWithPermit (pool per outcome, 2..16 outcomes)
lock     ──▶ no more bets
resolve  ──▶ engine fetches the public source, stores the raw snapshot, hashes it,
             runs the template's pure resolve() and calls UmaResolver.propose
             ──▶ UMA OOv3 assertion with a liveness window (anyone can dispute)
settle   ──▶ OOv3 callback ──▶ PoolMarkets.finalize ──▶ winners claim (2% fee)
             source gone for 6h ──▶ VOID ──▶ everyone refunded
```

## Templates

| Key | Question | Source | Cadence |
|---|---|---|---|
| `AM_TOP_COUNTRY` | Which song will top Apple Music in a country tomorrow? | Apple's official Most Played feed | daily, 10 storefronts |
| `AM_TOP_DEMO` | Same, with minutes-long windows (labelled demo) | same | every 15 min |
| `YT_TOP_COUNTRY` | Which video will top YouTube in a country tomorrow? | YouTube Data API `chart=mostPopular` | daily, 8 regions |
| `YT_VIEWS_24H` | How many views will a new video have 24h after publishing? | YouTube Data API `videos.list` | per upload of tracked creators |

Each template's `resolve()` lives in `packages/templates/src/resolve/` and its keccak256 is registered onchain as the template's `codeHash`.

## Verify any market yourself

```bash
bun install
cd packages/templates
bun run verify <marketId>   # downloads the evidence, checks its sha256 against the onchain proposal, re-runs resolve()
```
`MATCH` means the proposal is honest. `MISMATCH` means dispute it on UMA.

## Repo

- `contracts/` — Foundry: `TestUSD`, `PoolMarkets`, `UmaResolver` (+ unit, fuzz and Arbitrum Sepolia fork tests against the real OOv3)
- `packages/templates/` — templates, pure resolvers, code hashes, registration script, verifier CLI
- `workers/engine/` — Cloudflare Worker + D1: opens markets, snapshots sources, proposes to UMA, settles, faucet, API
- `app/` — Vite + React PWA

```bash
cd contracts && forge test            # 25 tests incl. fork test (needs network)
cd packages/templates && bun test
cd workers/engine && bun test
cd app && bun test src/lib && bun run build
```

## Roadmap

More templates from the same factory: film and TV release dates, Rotten Tomatoes scores, Netflix Top 10, Steam launch peaks, streamer peaks, speech mentions, weather. Creator-opened markets with a fee share. Mainnet with native USDC.

## Prior work

None. Everything here was written during the hackathon. Third-party open source used: UMA Optimistic Oracle V3 (deployed by UMA), OpenZeppelin Contracts, viem, forge-std.
