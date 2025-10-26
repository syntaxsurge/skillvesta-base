# Skillvesta: Onchain Courses and Memberships for Creators

Live app: https://skillvesta.com/

Demo video: https://youtu.be/Ypacq_338a0

Skillvesta lets creators run paid communities and courses on Base using portable onchain memberships with a built-in marketplace and clear collaborator payouts — all inside one app.

What it solves
- One place to sell access, teach, and share earnings with transparent records.
- Portable ERC‑1155 passes with expiry and transfer cooldowns to curb abuse.
- Free communities grant access without minting a pass (nothing to resell).

Who it’s for
- Creators and small education teams who want ownership, portability, and simple revenue splits.

How it works (at a glance)
- Create a paid community (sets price, duration, cooldown). The app collects a small USDC platform fee and registers a course on chain.
- Create a course, add modules and lessons, and safely embed video (YouTube links are normalized to embeds).
- Members join with USDC on Base. If they just joined, marketplace listing is blocked until cooldown ends.
- My Memberships shows pass expiry and cooldown. Listing stays disabled until eligible.
- Discover and join free groups instantly (no pass minted, not listable on the marketplace).

Demo chapters
1. Connect wallet (MetaMask used in demo; Base Smart Wallet also works)
2. Create a paid community and land on About (course ID + explorer link)
3. Classroom: create course, modules, lessons (demo uses sample YouTube playlist content)
4. Join paid group from a second wallet; tabs unlock
5. Marketplace: List Your Membership shows transfer cooldown
6. My Memberships: see expiry and cooldown; listing disabled
7. Feed: admin post; member likes/comments
8. Discover: join a free group; browse its feed and classroom

Core smart contracts
- `MembershipPass1155`: USDC-gated access passes per course
- `SplitPayout`: non-custodial revenue sharing for collaborators
- `Badge1155`: soulbound proof-of-learning badges
- `Registrar`: one-transaction course creation that wires everything together

## Features

- Smart Wallet connect flow powered by `@coinbase/onchainkit`
- Basename-aware identity chips across posts, comments, and membership lists
- Wallet-backed Convex auth: user profiles keyed by wallet address
- Course access and payouts fully on-chain (USDC on Base)
- Production-ready Hardhat workspace under `blockchain/` powering the contract
  suite

Product capabilities
- Paid and free communities, with gating handled by onchain state and group visibility.
- Marketplace listing, buying, and renewals with cooldown logic (UI blocks listing while cooldown settles).
- My Memberships view showing pass expiry, cooldown, and listing eligibility.
- Classroom with course grid, modules/lessons, safe video embeds, and live editing for owners.
- Feed with posts, likes, and comments; real-time updates via Convex.

## Prerequisites

- Node.js ≥ 18
- A Convex project (`npx convex dev` will prompt you to create or link one)
- A Coinbase Developer Platform or Quickstart API key for OnchainKit
- A treasury wallet on Base (test with Base Sepolia) holding or receiving USDC
- A Base Sepolia wallet funded with testnet USDC and native ETH for gas

## Installation

```bash
git clone <this repo>
cd skillvesta
npm install
```

## Environment Variables

Create `.env.local` in the project root. The app reads the following keys:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL="https://<your-convex-deployment>.convex.cloud"

# Coinbase / OnchainKit
NEXT_PUBLIC_ONCHAINKIT_API_KEY="ck_live_or_test_key"
NEXT_PUBLIC_BASE_CHAIN_ID="84532"                        # 8453 for Base mainnet, 84532 for Base Sepolia
NEXT_PUBLIC_BASE_MAINNET_RPC_URL="https://developer-access-mainnet.base.org"  # optional override
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"                   # optional override
# NEXT_PUBLIC_BASE_RPC_URL is still accepted as a legacy mainnet override

# Contracts & USDC routing
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS="0xd9aAEc86B65D86f6A7B5b1b0c42FFA531710b6CA" # Base Sepolia
NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS="0xYourTreasuryWallet"
NEXT_PUBLIC_MEMBERSHIP_CONTRACT_ADDRESS="0xYourMembershipPass1155"
NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS="0xYourBadge1155"
NEXT_PUBLIC_REGISTRAR_CONTRACT_ADDRESS="0xYourRegistrar"

# Optional marketplace (enable listing/renew flows)
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS="0xYourMembershipMarketplace"
```

> **Tip:** When deploying on Base mainnet swap the chain id (8453) and USDC
> contract address to the Base mainnet values.

If you have not initialised Convex locally, run `npx convex dev` once so
`convex/` can talk to your deployment and regenerate `_generated/` types.

## Testnet Funding

For end-to-end testing on Base Sepolia:

1. Visit https://faucet.circle.com/, choose `USDC`, pick the `Base Sepolia` network, and submit your wallet address to receive testnet USDC.
2. Ensure the same wallet also holds a small amount of Base Sepolia ETH so transactions have gas. Use any reputable Base Sepolia faucet or bridge to top up before interacting with the app.

## Scripts

- `npm run dev` – start Next.js in development mode
- `npx convex dev` – run Convex locally (required for live backend)
- `npm run build` / `npm run start` – production build & serve
- `npm run lint` – lint the codebase

## On-chain Course Flow

1. Connect a wallet through the header menu (Coinbase Smart Wallet modal).
2. Creators call `Registrar.registerCourse` (via dashboard UI or script). This
   deploys a dedicated `SplitPayout` and registers pricing in
   `MembershipPass1155`.
3. Learners purchase or renew passes through the on-site marketplace. The
   marketplace routes USDC, enforces cooldowns/fees, and mints through
   `MembershipPass1155`.
4. Collaborators withdraw their share using `SplitPayout.release`.
5. When a learner completes a course, the platform mints a non-transferable
   badge via `Badge1155`.

## Solidity Workspace

The `blockchain/` directory contains the Hardhat project:

- `contracts/MembershipPass1155.sol` – ERC-1155 course passes
- `contracts/SplitPayout.sol` – pull-based USDC splitter
- `contracts/Badge1155.sol` – soulbound completion badges
- `contracts/Registrar.sol` – deploys splitters and registers courses
- `contracts/MembershipMarketplace.sol` – primary/secondary marketplace for memberships

Compile with `cd blockchain && npx hardhat compile`. The `scripts/` folder can
host deployment scripts; see Hardhat docs for custom networks. Configure `.env`
in `blockchain/` with `PRIVATE_KEY`, `BASE_SEPOLIA_RPC_URL`, etc. before
deploying.

Deployment happens in a specific order so the later contracts know about the
earlier ones. Run the scripts in this sequence when bootstrapping a new
environment:

1. `deployMembershipPass.ts` – deploys `MembershipPass1155`
2. `deployBadge1155.ts` – deploys `Badge1155`
3. `deployRegistrar.ts` – deploys `Registrar` and wires it to the membership contract
4. `deployMarketplace.ts` – deploys `MembershipMarketplace` and grants marketplace roles

Each script prints the freshly deployed address. Copy those addresses straight
into `blockchain/.env` (`MEMBERSHIP_CONTRACT_ADDRESS`,
`BADGE_CONTRACT_ADDRESS`, `REGISTRAR_CONTRACT_ADDRESS`) so the workspace can
attach to existing instances instead of redeploying. Mirror the same values
into the web app’s `.env.local` under the `NEXT_PUBLIC_*` keys (including
`NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS`) so the frontend points at the
deployed contracts.

## Notes & Next Steps

- Learners need USDC and gas; add paymaster or Coinbase Checkout later if
  needed.
- Grant the Registrar contract the `REGISTRAR_ROLE` in `MembershipPass1155`
  after deployment so it can register courses.
- When shipping to mainnet, double-check all on-chain addresses in `.env.local`.

Happy building on Base!
