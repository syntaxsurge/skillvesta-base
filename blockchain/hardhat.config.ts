import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-truffle5";
require("dotenv").config();

/* -------------------------------------------------------------------------- */
/*                               E N V  V A R S                               */
/* -------------------------------------------------------------------------- */

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL ?? "";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY ?? "";

/* -------------------------------------------------------------------------- */
/*                               H A R D H A T                                */
/* -------------------------------------------------------------------------- */

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      evmVersion: "london",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    /** Base mainnet */
    base: {
      url: BASE_MAINNET_RPC_URL,
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },
    /** Base Sepolia testnet */
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      base: BASESCAN_API_KEY,
      baseSepolia: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: { target: "truffle-v5" },
};

export default config;
