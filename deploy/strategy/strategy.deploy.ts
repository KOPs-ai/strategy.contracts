import { HardhatRuntimeEnvironment } from 'hardhat/types'

module.exports = async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy, get } = deployments
  const { deployer, proxyAdmin } = await getNamedAccounts()

  const result = await deploy('Strategy', {
    from: deployer,
    args: [], // constructor args for the *implementation* (usually empty for upgradeables)
    log: true,
    proxy: {
      owner: proxyAdmin, // ProxyAdmin owner
      proxyContract: 'OpenZeppelinTransparentProxy', // or "UUPS" for UUPS pattern
      execute: {
        init: {
          methodName: 'initialize', // called via proxy after creation
          args: [deployer, deployer] // your initializer(args)
        }
      }
    }
  })

  console.log('strategy proxy deployed at', result.address)
  const impl = await get('Strategy_Implementation')
  console.log('Strategy implementation at:', impl.address)
}
