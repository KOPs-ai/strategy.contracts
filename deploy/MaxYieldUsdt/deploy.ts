import { HardhatRuntimeEnvironment } from 'hardhat/types'

module.exports = async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  const hypurrfiPoolAddress = '0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b'
  const hyperlendPoolAddress = '0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b'
  const usdtAddress = '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb'
  const hypurrfiATokenAddress = '0x1Ca7e21B2dAa5Ab2eB9de7cf8f34dCf9c8683007'
  const hyperlendATokenAddress = '0x10982ad645D5A112606534d8567418Cf64c14cB5'

  const result = await deploy('MaxYieldUSDT', {
    from: deployer,
    args: [
      deployer,
      hypurrfiPoolAddress,
      hyperlendPoolAddress,
      usdtAddress,
      hypurrfiATokenAddress,
      hyperlendATokenAddress
    ], // constructor args for the *implementation* (usually empty for upgradeables)
    log: true
  })

  console.log('MaxYieldUSDT deployed at', result.address)
}
