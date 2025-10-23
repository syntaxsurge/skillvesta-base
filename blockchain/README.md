# Skillvesta Blockchain Workspace

This folder is a stand-alone Hardhat project that contains the smart contracts powering Skillvesta’s on-chain course marketplace on Base.

## Contract Suite

| Contract                 | Purpose                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `MembershipPass1155.sol` | USDC-gated ERC-1155 passes (tokenId per course). Handles expirations, cooldowns, and marketplace-only transfers.    |
| `SplitPayout.sol`        | Pull-based USDC splitter for collaborators. Receives funds from the membership contract and releases them on demand. |
| `Badge1155.sol`          | Soulbound completion badges (non-transferable ERC-1155).                                                             |
| `Registrar.sol`          | Deploys a `SplitPayout` and registers a course in one call.                                                          |
| `MembershipMarketplace.sol` | Primary + secondary marketplace enforcing platform fees, cooldowns, and renewals.                                |

## Getting Started

1. Install dependencies and scaffold an env file

   ```bash
   cd blockchain
   pnpm install
   cp .env.example .env
   ```

2. Populate `.env` using the reference below. The deployment scripts will refuse
   to run when a required value is missing, so fill in the basics before
   invoking Hardhat.

### Environment Variables

| Key                                       | Purpose                                                                                             | When to provide it                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `PRIVATE_KEY`                             | Deployer/admin wallet used for all scripts.                                                         | **Before** first deployment                |
| `BASE_SEPOLIA_RPC_URL` / `BASE_MAINNET_RPC_URL` | RPC endpoints for the selected Base network(s).                                                     | **Before** first deployment                |
| `BASESCAN_API_KEY`                        | Optional – enables `hardhat verify`.                                                                | Optional                                   |
| `USDC_ADDRESS`                            | Address of USDC on the target network.                                                              | **Before** first deployment                |
| `MEMBERSHIP_METADATA_URI`                 | Base URI for membership token metadata.                                                             | Before deployment (or leave blank to skip) |
| `BADGE_METADATA_URI`                      | Base URI for badge metadata.                                                                        | Before deployment (or leave blank to skip) |
| `MARKETPLACE_TREASURY_ADDRESS`            | Wallet that should receive marketplace fees.                                                        | **Before** marketplace deployment          |
| `MARKETPLACE_FEE_BPS`                     | Platform fee in basis points (defaults to `250` → 2.5%).                                            | Optional                                   |
| `MARKETPLACE_MAX_LISTING_DURATION_SECONDS`| Max duration for secondary listings (defaults to 7 days).                                           | Optional                                   |
| `MEMBERSHIP_CONTRACT_ADDRESS`             | Address of an already deployed `MembershipPass1155`. Enables scripts to attach instead of redeploy. | **After** first deployment                 |
| `BADGE_CONTRACT_ADDRESS`                  | Address of an already deployed `Badge1155`.                                                         | **After** first deployment                 |
| `REGISTRAR_CONTRACT_ADDRESS`              | Address of an already deployed `Registrar`.                                                         | **After** first deployment                 |

After you deploy each contract, paste its address back into `.env`. The deploy
scripts check these fields so they can skip redeploying and instead attach to
the existing instance (necessary for tasks such as granting roles or updating
pricing). Keeping this information in `blockchain/.env` prevents accidental
redeployments and keeps the Hardhat tooling in sync with production.

## Typical Commands

```bash
npx hardhat compile
npx hardhat run scripts/deployMembershipPass.ts --network baseSepolia
npx hardhat run scripts/deployBadge1155.ts --network baseSepolia
npx hardhat run scripts/deployRegistrar.ts --network baseSepolia
npx hardhat run scripts/deployMarketplace.ts --network baseSepolia
```

Compiling generates ABIs under `artifacts/` and TypeScript types under `typechain-types/`.

## Deployment Cheatsheet

1. **Deploy `MembershipPass1155`** (`deployMembershipPass.ts`).
   - Uses `USDC_ADDRESS`, metadata URI, and the admin wallet.
   - Copy the emitted address into `MEMBERSHIP_CONTRACT_ADDRESS`.
2. **Deploy `Badge1155`** (`deployBadge1155.ts`).
   - Copy its address into `BADGE_CONTRACT_ADDRESS`.
3. **Deploy `Registrar`** (`deployRegistrar.ts`).
   - Script expects the membership address in `.env` and grants `REGISTRAR_ROLE`.
   - Copy the new address into `REGISTRAR_CONTRACT_ADDRESS`.
4. **Deploy `MembershipMarketplace`** (`deployMarketplace.ts`).
   - Requires the membership address and `MARKETPLACE_TREASURY_ADDRESS`.
   - Script grants `MARKETPLACE_ROLE`; note the resulting address for the web app.
5. Mirror the same addresses into the frontend (`NEXT_PUBLIC_*`, including
   `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS`) so the app talks to the correct contracts.

Whenever a creator registers a course the dApp will call the Registrar which deploys a `SplitPayout` and wires the course configuration.

> **Re-running scripts:** With the addresses stored in `.env`, rerunning a
> deployment script detects that the contract already exists and reattaches,
> letting you perform admin tasks (e.g. fee updates, role grants) without
> redeploying.

Happy building!
