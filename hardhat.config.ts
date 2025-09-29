import * as dotenv from 'dotenv'
dotenv.config()

import '@typechain/hardhat'
import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-solhint'
import '@nomicfoundation/hardhat-verify'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'solidity-coverage'
import '@openzeppelin/hardhat-upgrades'

// Normalize deployer private key for external networks; only use when valid
const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim()
const normalizedKey = rawKey ? (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) : undefined
const celoAccounts = normalizedKey && normalizedKey.length === 66 ? [normalizedKey] : undefined

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  typechain: {
    outDir: './typechain',
    target: 'ethers-v6'
  },
  solidity: {
    version: '0.8.27',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  networks: {
    hardhat: {
      accounts: {
        count: 10
      },
      live: false,
      saveDeployments: true,
      tags: ['test', 'local'],
      chainId: 1337
    },
    development: {
      url: 'http://127.0.0.1:8545', // Localhost (default: none)
      live: false,
      saveDeployments: true
    },
    celo_testnet: {
      url: 'https://alfajores-forno.celo-testnet.org',
      accounts: celoAccounts,
      gasMultiplier: 1.2,
      verify: {
        etherscan: {
          apiUrl: '',
          apiKey: process.env.CELO_API_KEY
        }
      }
    },
    celo_mainnet: {
      url: 'https://forno.celo.org',
      accounts: celoAccounts,
      gasMultiplier: 1.2,
      verify: {
        etherscan: {
          apiUrl: '',
          apiKey: process.env.CELO_API_KEY
        }
      }
    }
  },

  paths: {
    sources: './src',
    tests: './test',
    cache: './build/cache',
    artifacts: './build/artifacts',
    deployments: './deployments'
  },

  verify: {
    etherscan: {
      apiKey: process.env.EXPLORER_API_KEY
    }
  },

  etherscan: {
    apiKey: {
      celo_testnet: process.env.CELO_API_KEY || '',
      celo_mainnet: process.env.CELO_API_KEY || ''
    },
    customChains: [
      {
        network: 'celo_testnet',
        chainId: 44787,
        urls: {
          apiURL: 'https://api-alfajores.celoscan.io/api',
          browserURL: 'https://alfajores.celoscan.io/'
        }
      },
      {
        network: 'celo_mainnet',
        chainId: 42220,
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io'
        }
      }
    ]
  },
  namedAccounts: {
    // migrations
    deployer: {
      default: 0
    },
    proxyAdmin: {
      default: 1,
      999: ''
    }
  }
}

export default config
