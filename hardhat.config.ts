import * as dotenv from "dotenv";

import { HardhatUserConfig, extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import { deployments, Deployment, Deployments } from "./deployments";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 9999999,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.7.6/metadata.html
        bytecodeHash: "none",
      },
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
    only: [],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      // arbitrum
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      arbitrumNova: process.env.ARBISCAN_NOVA_API_KEY || "",
      arbitrumGoerli: process.env.ARBISCAN_API_KEY || "",

      // polygon
      polygon: process.env.POLYSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "arbitrumNova",
        chainId: 42170,
        urls: {
          apiURL: "https://api-nova.arbiscan.io/api",
          browserURL: "https://nova.arbiscan.io/",
        },
      },
    ],
  },
  networks: {
    // mainnets
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${
        process.env.ARBITRUM_API_KEY ?? ""
      }`,
      accounts:
        process.env.ARBITRUM_PRIVATE_KEY !== undefined
          ? [process.env.ARBITRUM_PRIVATE_KEY]
          : [],
    },
    "arbitrum-nova": {
      url: `https://skilled-yolo-mountain.nova-mainnet.discover.quiknode.pro/${
        process.env.ARBITRUM_NOVA_API_KEY ?? ""
      }`,
      accounts:
        process.env.ARBITRUM_NOVA_PRIVATE_KEY !== undefined
          ? [process.env.ARBITRUM_NOVA_PRIVATE_KEY]
          : [],
    },
    matic: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${
        process.env.POLYGON_API_KEY ?? ""
      }`,
      accounts:
        process.env.POLYGON_PRIVATE_KEY !== undefined
          ? [process.env.POLYGON_PRIVATE_KEY]
          : [],
    },
    // testnets
    maticmum: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${
        process.env.POLYGON_MUMBAI_API_KEY ?? ""
      }`,
      accounts:
        process.env.POLYGON_MUMBAI_PRIVATE_KEY !== undefined
          ? [process.env.POLYGON_MUMBAI_PRIVATE_KEY]
          : [],
    },
    hardhat: {
      mining: {
        auto: !(process.env.HARDHAT_DISABLE_AUTO_MINING === "true"),
        interval: [100, 3000],
      },
      allowUnlimitedContractSize:
        process.env.HARDHAT_UNLIMITED_CONTRACT_SIZE === "true",
    },
  },
  config: {
    deployments,
  },
};

interface MyNetworkConfig {
  deployments: Deployments;
}

declare module "hardhat/types/config" {
  // eslint-disable-next-line no-unused-vars
  interface HardhatUserConfig {
    config: MyNetworkConfig;
  }
}

declare module "hardhat/types/runtime" {
  // eslint-disable-next-line no-unused-vars
  interface HardhatRuntimeEnvironment {
    deployment: Deployment;
  }
}

extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  // Get configs for user-selected network
  const config = hre.userConfig.config;
  hre.deployment = (config.deployments as any)[hre.network.name];
});

export default config;
