import { expect } from 'chai'
import { ethers } from 'hardhat'
import { parseUnits } from 'ethers'

describe('MaxYieldUSDT', function () {
  async function deployMaxYieldUSDT() {
    const [owner, user, attacker] = await ethers.getSigners()

    // Deploy mock contracts
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const usdt = await MockERC20.deploy('Tether USD', 'USDT', 6)
    await usdt.waitForDeployment()

    const MockHypurrfiAToken = await ethers.getContractFactory('MockERC20')
    const hypurrfiAToken = await MockHypurrfiAToken.deploy('Hypurrfi A Token', 'HYPURRFI', 18)
    await hypurrfiAToken.waitForDeployment()

    const MockHyperlendAToken = await ethers.getContractFactory('MockERC20')
    const hyperlendAToken = await MockHyperlendAToken.deploy('Hyperlend A Token', 'HYPERLEND', 18)
    await hyperlendAToken.waitForDeployment()

    const MockPool = await ethers.getContractFactory('MockPool')
    const hypurrfiPool = await MockPool.deploy(await hypurrfiAToken.getAddress())
    await hypurrfiPool.waitForDeployment()

    const hyperlendPool = await MockPool.deploy(await hyperlendAToken.getAddress())
    await hyperlendPool.waitForDeployment()

    // transfer owner for pool
    await hyperlendAToken.transferOwnership(await hyperlendPool.getAddress())
    await hypurrfiAToken.transferOwnership(await hypurrfiPool.getAddress())

    // Deploy MaxYieldUSDT contract
    const MaxYieldUSDT = await ethers.getContractFactory('MaxYieldUSDT')
    const maxYieldUSDT = await MaxYieldUSDT.deploy(
      await owner.getAddress(),
      await hypurrfiPool.getAddress(),
      await hyperlendPool.getAddress(),
      await usdt.getAddress(),
      await hypurrfiAToken.getAddress(),
      await hyperlendAToken.getAddress()
    )
    await maxYieldUSDT.waitForDeployment()

    return {
      maxYieldUSDT,
      usdt,
      hypurrfiAToken,
      hyperlendAToken,
      hypurrfiPool,
      hyperlendPool,
      owner,
      user,
      attacker
    }
  }

  describe('Deployment', function () {
    it('Should deploy with correct initial values', async function () {
      const {
        maxYieldUSDT,
        usdt,
        hypurrfiPool,
        hyperlendPool,
        owner,
        hypurrfiAToken,
        hyperlendAToken
      } = await deployMaxYieldUSDT()

      expect(await maxYieldUSDT.owner()).to.equal(await owner.getAddress())
      expect(await maxYieldUSDT.hypurrfiPool()).to.equal(await hypurrfiPool.getAddress())
      expect(await maxYieldUSDT.hyperlendPool()).to.equal(await hyperlendPool.getAddress())
      expect(await maxYieldUSDT.usdt()).to.equal(await usdt.getAddress())
      expect(await maxYieldUSDT.hypurrfiAToken()).to.equal(await hypurrfiAToken.getAddress())
      expect(await maxYieldUSDT.hyperlendAToken()).to.equal(await hyperlendAToken.getAddress())
    })

    it('Should revert if hypurrfiPool is zero address', async function () {
      const [owner] = await ethers.getSigners()
      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const usdt = await MockERC20.deploy('Tether USD', 'USDT', 6)
      await usdt.waitForDeployment()

      const MockHyperlendAToken = await ethers.getContractFactory('MockERC20')
      const hyperlendAToken = await MockHyperlendAToken.deploy('Hyperlend A Token', 'HYPERLEND', 18)
      await hyperlendAToken.waitForDeployment()

      const MockHypurrfiAToken = await ethers.getContractFactory('MockERC20')
      const hypurrfiAToken = await MockHypurrfiAToken.deploy('Hypurrfi A Token', 'HYPURRFI', 18)
      await hypurrfiAToken.waitForDeployment()

      const MockPool = await ethers.getContractFactory('MockPool')
      const hyperlendPool = await MockPool.deploy(await hyperlendAToken.getAddress())
      await hyperlendPool.waitForDeployment()

      const MaxYieldUSDT = await ethers.getContractFactory('MaxYieldUSDT')

      await expect(
        MaxYieldUSDT.deploy(
          await owner.getAddress(),
          ethers.ZeroAddress, // hypurrfiPool
          await hyperlendPool.getAddress(),
          await usdt.getAddress(),
          await hypurrfiAToken.getAddress(),
          await hyperlendAToken.getAddress()
        )
      ).to.be.revertedWithCustomError(MaxYieldUSDT, 'InvalidAddress')
    })

    it('Should revert if hyperlendPool is zero address', async function () {
      const [owner] = await ethers.getSigners()
      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const usdt = await MockERC20.deploy('Tether USD', 'USDT', 6)
      await usdt.waitForDeployment()

      const MockHyperlendAToken = await ethers.getContractFactory('MockERC20')
      const hyperlendAToken = await MockHyperlendAToken.deploy('Hyperlend A Token', 'HYPERLEND', 18)
      await hyperlendAToken.waitForDeployment()

      const MockHypurrfiAToken = await ethers.getContractFactory('MockERC20')
      const hypurrfiAToken = await MockHypurrfiAToken.deploy('Hypurrfi A Token', 'HYPURRFI', 18)
      await hypurrfiAToken.waitForDeployment()

      const MockPool = await ethers.getContractFactory('MockPool')
      const hypurrfiPool = await MockPool.deploy(await hypurrfiAToken.getAddress())
      await hypurrfiPool.waitForDeployment()

      const MaxYieldUSDT = await ethers.getContractFactory('MaxYieldUSDT')

      await expect(
        MaxYieldUSDT.deploy(
          await owner.getAddress(),
          await hypurrfiPool.getAddress(),
          ethers.ZeroAddress, // hyperlendPool
          await usdt.getAddress(),
          await hypurrfiAToken.getAddress(),
          await hyperlendAToken.getAddress()
        )
      ).to.be.revertedWithCustomError(MaxYieldUSDT, 'InvalidAddress')
    })

    it('Should revert if usdt is zero address', async function () {
      const [owner] = await ethers.getSigners()
      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const usdt = await MockERC20.deploy('Tether USD', 'USDT', 6)
      await usdt.waitForDeployment()

      const MockHyperlendAToken = await ethers.getContractFactory('MockERC20')
      const hyperlendAToken = await MockHyperlendAToken.deploy('Hyperlend A Token', 'HYPERLEND', 18)
      await hyperlendAToken.waitForDeployment()

      const MockHypurrfiAToken = await ethers.getContractFactory('MockERC20')
      const hypurrfiAToken = await MockHypurrfiAToken.deploy('Hypurrfi A Token', 'HYPURRFI', 18)
      await hypurrfiAToken.waitForDeployment()

      const MockPool = await ethers.getContractFactory('MockPool')
      const hypurrfiPool = await MockPool.deploy(await hypurrfiAToken.getAddress())
      await hypurrfiPool.waitForDeployment()

      const hyperlendPool = await MockPool.deploy(await hyperlendAToken.getAddress())
      await hyperlendPool.waitForDeployment()

      const MaxYieldUSDT = await ethers.getContractFactory('MaxYieldUSDT')

      await expect(
        MaxYieldUSDT.deploy(
          await owner.getAddress(),
          await hypurrfiPool.getAddress(),
          await hyperlendPool.getAddress(),
          ethers.ZeroAddress, // usdt
          await hypurrfiAToken.getAddress(),
          await hyperlendAToken.getAddress()
        )
      ).to.be.revertedWithCustomError(MaxYieldUSDT, 'InvalidAddress')
    })
  })

  describe('HypurrfiSupplyUSDT Action', function () {
    it('Should execute HypurrfiSupplyUSDT successfully', async function () {
      const { maxYieldUSDT, usdt, hypurrfiPool, owner } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6) // 1000 USDT
      const referralCode = 0

      // Mint USDT to the contract
      await usdt.mint(owner.address, amount)

      // Approve the pool to spend USDT
      await (await usdt.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)).wait()

      const data = hypurrfiPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(0, data) // Action.HypurrfiSupplyUSDT
      )
        .to.emit(maxYieldUSDT, 'HypurrfiSupplyUSDT')
        .withArgs(await usdt.getAddress(), amount, await owner.getAddress(), referralCode)
    })

    it('Should revert if asset is not USDT', async function () {
      const { maxYieldUSDT, owner, hypurrfiPool } = await deployMaxYieldUSDT()

      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const usdt = await MockERC20.deploy('Tether USD', 'USDT', 6)
      await usdt.waitForDeployment()

      const MockHypurrfiAToken = await ethers.getContractFactory('MockERC20')
      const hypurrfiAToken = await MockHypurrfiAToken.deploy('Hypurrfi A Token', 'HYPURRFI', 18)
      await hypurrfiAToken.waitForDeployment()

      const otherToken = await MockERC20.deploy('Other Token', 'OTHER', 18)
      await otherToken.waitForDeployment()

      const amount = parseUnits('1000', 6)
      const referralCode = 123

      const data = hypurrfiPool.interface.encodeFunctionData('supply', [
        await otherToken.getAddress(),
        amount,
        await owner.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(0, data) // Action.HypurrfiSupplyUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'TokenNotAllowed')
    })

    it('Should revert if onBehalfOf is not msg.sender', async function () {
      const { maxYieldUSDT, usdt, owner, user, hypurrfiPool } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)
      const referralCode = 123

      const data = hypurrfiPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await user.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(0, data) // Action.HypurrfiSupplyUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'NotOwner')
    })
  })

  describe('HypurrfiWithdrawUSDT Action', function () {
    it('Should execute HypurrfiWithdrawUSDT successfully', async function () {
      const { maxYieldUSDT, usdt, hypurrfiPool, owner, hypurrfiAToken, hyperlendAToken } =
        await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)

      await usdt.mint(owner.address, amount)

      // Approve the pool to spend USDT
      await (await usdt.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)).wait()

      const supplyData = hypurrfiPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress(),
        '0'
      ])

      await (await maxYieldUSDT.connect(owner).execute(0, supplyData)).wait() // Action.HypurrfiSupplyUSDT

      const aTokenBalance = await hypurrfiAToken.balanceOf(owner.address)

      console.log({ aTokenBalance })

      const data = hypurrfiPool.interface.encodeFunctionData('withdraw', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress()
      ])

      // approve atoken for strategy contract
      await hypurrfiAToken.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)

      const aTokenApproval = await hypurrfiAToken
        .connect(owner)
        .allowance(await owner.getAddress(), await maxYieldUSDT.getAddress())

      console.log({ aTokenApproval })

      await expect(
        maxYieldUSDT.connect(owner).execute(1, data) // Action.HypurrfiWithdrawUSDT
      )
        .to.emit(maxYieldUSDT, 'HypurrfiWithdrawUSDT')
        .withArgs(await usdt.getAddress(), amount, await owner.getAddress())
    })

    it('Should revert if asset is not USDT', async function () {
      const { maxYieldUSDT, owner, hypurrfiPool } = await deployMaxYieldUSDT()

      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const otherToken = await MockERC20.deploy('Other Token', 'OTHER', 18)
      await otherToken.waitForDeployment()

      const amount = parseUnits('1000', 6)

      const data = hypurrfiPool.interface.encodeFunctionData('withdraw', [
        await otherToken.getAddress(),
        amount,
        await owner.getAddress()
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(1, data) // Action.HypurrfiWithdrawUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'TokenNotAllowed')
    })

    it('Should revert if to is not msg.sender', async function () {
      const { maxYieldUSDT, usdt, owner, user, hypurrfiPool } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)

      const data = hypurrfiPool.interface.encodeFunctionData('withdraw', [
        await usdt.getAddress(),
        amount,
        await user.getAddress()
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(1, data) // Action.HypurrfiWithdrawUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'NotOwner')
    })
  })

  describe('HyperlendSupplyUSDT Action', function () {
    it('Should execute HyperlendSupplyUSDT successfully', async function () {
      const { maxYieldUSDT, usdt, hyperlendPool, owner, hyperlendAToken } =
        await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)
      const referralCode = 456

      // Mint USDT to the contract
      await usdt.mint(owner.address, amount)

      // Approve the pool to spend USDT
      await usdt.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)
      await hyperlendAToken.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)

      const data = hyperlendPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(2, data) // Action.HyperlendSupplyUSDT
      )
        .to.emit(maxYieldUSDT, 'HyperlendSupplyUSDT')
        .withArgs(await usdt.getAddress(), amount, await owner.getAddress(), referralCode)
    })

    it('Should revert if asset is not USDT', async function () {
      const { maxYieldUSDT, owner, hyperlendPool } = await deployMaxYieldUSDT()

      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const otherToken = await MockERC20.deploy('Other Token', 'OTHER', 18)
      await otherToken.waitForDeployment()

      const amount = parseUnits('1000', 6)
      const referralCode = 456

      const data = hyperlendPool.interface.encodeFunctionData('supply', [
        await otherToken.getAddress(),
        amount,
        await owner.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(2, data) // Action.HyperlendSupplyUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'TokenNotAllowed')
    })

    it('Should revert if onBehalfOf is not msg.sender', async function () {
      const { maxYieldUSDT, usdt, owner, user, hyperlendPool } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)
      const referralCode = 456

      const data = hyperlendPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await user.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(2, data) // Action.HyperlendSupplyUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'NotOwner')
    })
  })

  describe('HyperlendWithdrawUSDT Action', function () {
    it('Should execute HyperlendWithdrawUSDT successfully', async function () {
      const { maxYieldUSDT, usdt, owner, hyperlendPool, hyperlendAToken } =
        await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)

      await usdt.mint(owner.address, amount)

      // Approve the pool to spend USDT
      await (await usdt.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)).wait()

      const supplyData = hyperlendPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress(),
        '0'
      ])

      await (await maxYieldUSDT.connect(owner).execute(2, supplyData)).wait() // Action.HypurrfiSupplyUSDT

      const data = hyperlendPool.interface.encodeFunctionData('withdraw', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress()
      ])

      await hyperlendAToken.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)

      await expect(
        maxYieldUSDT.connect(owner).execute(3, data) // Action.HyperlendWithdrawUSDT
      )
        .to.emit(maxYieldUSDT, 'HyperlendWithdrawUSDT')
        .withArgs(await usdt.getAddress(), amount, await owner.getAddress())
    })

    it('Should revert if asset is not USDT', async function () {
      const { maxYieldUSDT, owner, hyperlendPool } = await deployMaxYieldUSDT()

      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const otherToken = await MockERC20.deploy('Other Token', 'OTHER', 18)
      await otherToken.waitForDeployment()

      const amount = parseUnits('1000', 6)

      const data = hyperlendPool.interface.encodeFunctionData('withdraw', [
        await otherToken.getAddress(),
        amount,
        await owner.getAddress()
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(3, data) // Action.HyperlendWithdrawUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'TokenNotAllowed')
    })

    it('Should revert if to is not msg.sender', async function () {
      const { maxYieldUSDT, usdt, owner, user, hyperlendPool } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)

      const data = hyperlendPool.interface.encodeFunctionData('withdraw', [
        await usdt.getAddress(),
        amount,
        await user.getAddress()
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(3, data) // Action.HyperlendWithdrawUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'NotOwner')
    })
  })

  describe('Pause/Unpause Functionality', function () {
    it('Should allow owner to pause', async function () {
      const { maxYieldUSDT, owner } = await deployMaxYieldUSDT()

      await expect(maxYieldUSDT.connect(owner).pause())
        .to.emit(maxYieldUSDT, 'Paused')
        .withArgs(await owner.getAddress())

      expect(await maxYieldUSDT.paused()).to.be.true
    })

    it('Should allow owner to unpause', async function () {
      const { maxYieldUSDT, owner } = await deployMaxYieldUSDT()

      await maxYieldUSDT.connect(owner).pause()

      await expect(maxYieldUSDT.connect(owner).unpause())
        .to.emit(maxYieldUSDT, 'Unpaused')
        .withArgs(await owner.getAddress())

      expect(await maxYieldUSDT.paused()).to.be.false
    })

    it('Should not allow non-owner to pause', async function () {
      const { maxYieldUSDT, user } = await deployMaxYieldUSDT()

      await expect(maxYieldUSDT.connect(user).pause()).to.be.revertedWithCustomError(
        maxYieldUSDT,
        'OwnableUnauthorizedAccount'
      )
    })

    it('Should not allow non-owner to unpause', async function () {
      const { maxYieldUSDT, owner, user } = await deployMaxYieldUSDT()

      await maxYieldUSDT.connect(owner).pause()

      await expect(maxYieldUSDT.connect(user).unpause()).to.be.revertedWithCustomError(
        maxYieldUSDT,
        'OwnableUnauthorizedAccount'
      )
    })

    it('Should not allow execution when paused', async function () {
      const { maxYieldUSDT, usdt, owner, hypurrfiPool, hypurrfiAToken } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)
      await usdt.mint(await hypurrfiPool.getAddress(), amount)

      await usdt.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)

      await hypurrfiAToken.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)

      await maxYieldUSDT.connect(owner).pause()

      const data = hypurrfiPool.interface.encodeFunctionData('withdraw', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress()
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(1, data) // Action.HypurrfiWithdrawUSDT
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'EnforcedPause')
    })
  })

  describe('WithdrawERC20 Functionality', function () {
    it('Should allow owner to withdraw ERC20 tokens', async function () {
      const { maxYieldUSDT, usdt, owner, user } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)

      // Mint tokens to the contract
      await usdt.mint(await maxYieldUSDT.getAddress(), amount)

      const userBalanceBefore = await usdt.balanceOf(await user.getAddress())

      await expect(
        maxYieldUSDT
          .connect(owner)
          .withdrawERC20(await usdt.getAddress(), await user.getAddress(), amount)
      ).to.not.be.reverted

      expect(await usdt.balanceOf(await user.getAddress())).to.equal(userBalanceBefore + amount)
    })

    it('Should not allow non-owner to withdraw ERC20 tokens', async function () {
      const { maxYieldUSDT, usdt, user } = await deployMaxYieldUSDT()

      const amount = parseUnits('1000', 6)

      // Mint tokens to the contract
      await usdt.mint(await maxYieldUSDT.getAddress(), amount)

      await expect(
        maxYieldUSDT
          .connect(user)
          .withdrawERC20(await usdt.getAddress(), await user.getAddress(), amount)
      ).to.be.revertedWithCustomError(maxYieldUSDT, 'OwnableUnauthorizedAccount')
    })

    it('Should handle withdrawal of different ERC20 tokens', async function () {
      const { maxYieldUSDT, owner, user } = await deployMaxYieldUSDT()

      const MockERC20 = await ethers.getContractFactory('MockERC20')
      const otherToken = await MockERC20.deploy('Other Token', 'OTHER', 18)
      await otherToken.waitForDeployment()

      const amount = parseUnits('1000', 18)

      // Mint tokens to the contract
      await otherToken.mint(await maxYieldUSDT.getAddress(), amount)

      const userBalanceBefore = await otherToken.balanceOf(await user.getAddress())

      await expect(
        maxYieldUSDT
          .connect(owner)
          .withdrawERC20(await otherToken.getAddress(), await user.getAddress(), amount)
      ).to.not.be.reverted

      expect(await otherToken.balanceOf(await user.getAddress())).to.equal(
        userBalanceBefore + amount
      )
    })
  })

  describe('Edge Cases and Security', function () {
    it('Should handle zero amounts correctly', async function () {
      const { maxYieldUSDT, usdt, owner, hypurrfiPool } = await deployMaxYieldUSDT()

      const amount = 0
      const referralCode = 123

      const data = hypurrfiPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(0, data) // Action.HypurrfiSupplyUSDT
      )
        .to.emit(maxYieldUSDT, 'HypurrfiSupplyUSDT')
        .withArgs(await usdt.getAddress(), amount, await owner.getAddress(), referralCode)
    })

    it('Should handle maximum uint256 amounts', async function () {
      const { maxYieldUSDT, usdt, owner, hypurrfiPool } = await deployMaxYieldUSDT()

      const amount = ethers.MaxUint256
      const referralCode = 123

      await usdt.mint(owner.address, amount)

      await usdt.connect(owner).approve(await maxYieldUSDT.getAddress(), amount)

      const data = hypurrfiPool.interface.encodeFunctionData('supply', [
        await usdt.getAddress(),
        amount,
        await owner.getAddress(),
        referralCode
      ])

      await expect(
        maxYieldUSDT.connect(owner).execute(0, data) // Action.HypurrfiSupplyUSDT
      )
        .to.emit(maxYieldUSDT, 'HypurrfiSupplyUSDT')
        .withArgs(await usdt.getAddress(), amount, await owner.getAddress(), referralCode)
    })
  })
})
