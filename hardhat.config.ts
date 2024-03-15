import { task } from "hardhat/config";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import dotenv from "dotenv";

dotenv.config();

import type { HardhatUserConfig } from "hardhat/config";

const deployer = {
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
};

// const deployer = [""];

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: deployer,
      chainId: 44787,
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: deployer,
      chainId: 42220,
    },
    polygonMumbai: {
      url: "https://matic-mumbai.chainstacklabs.com",
      accounts: deployer,
      chainId: 80001,
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: deployer,
      chainId: 137,
      gasMultiplier: 1.5,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: deployer,
      chainId: 84532,
      gasMultiplier: 1.5,
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: deployer,
      chainId: 8453,
      gasMultiplier: 1.5,
    },
  },
  gasReporter: {
    currency: "ETH",
  },
  etherscan: {
    // Your API keys for Etherscan
    apiKey: {
      celo: process.env.CELO_API_KEY || "",
      alfajores: process.env.CELO_API_KEY || "",
      polygon: process.env.POLYGON_API_KEY || "",
      polygonMumbai: process.env.POLYGON_API_KEY || "",
      baseSepolia: process.env.BASE_SEPOLIA_API_KEY || "",
      base: process.env.BASE_SEPOLIA_API_KEY || "",
    },
    // Custom chains that are not supported by default
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io/",
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
};

export default config;
