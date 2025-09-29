import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { parseEther } from 'ethers'

describe('Strategy', function () {
  async function deployFreshStrategy() {
    const [deployer, defaultAdmin, operator, user, attacker] = await ethers.getSigners()

    // Deploy Strategy contract fresh each time
    const Strategy = await ethers.getContractFactory('Strategy')
    const proxy = await upgrades.deployProxy(
      Strategy,
      [await defaultAdmin.getAddress(), await operator.getAddress()],
      {
        initializer: 'initialize'
      }
    )
    await proxy.waitForDeployment()

    return { strategy: proxy, defaultAdmin, operator, user, attacker, deployer }
  }

  async function deployMockToken() {
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const mockToken = await MockERC20.deploy('Mock Token', 'MTK', 18)
    await mockToken.waitForDeployment()
    return mockToken
  }

  async function deployMockTarget() {
    const MockTarget = await ethers.getContractFactory('MockERC20')
    const mockTarget = await MockTarget.deploy('Mock Token target', 'MTK', 18)
    await mockTarget.waitForDeployment()
    return mockTarget
  }

  describe('Initialization', function () {
    it('Should initialize with correct roles', async function () {
      const { strategy, defaultAdmin, operator } = await deployFreshStrategy()

      const DEFAULT_ADMIN_ROLE = await strategy.DEFAULT_ADMIN_ROLE()
      const OPERATOR_ROLE = await strategy.OPERATOR_ROLE()

      expect(await strategy.hasRole(DEFAULT_ADMIN_ROLE, await defaultAdmin.getAddress())).to.be.true
      expect(await strategy.hasRole(OPERATOR_ROLE, await operator.getAddress())).to.be.true
    })

    it('Should not be paused initially', async function () {
      const { strategy } = await deployFreshStrategy()
      expect(await strategy.paused()).to.be.false
    })
  })

  describe('Action Management', function () {
    const targetAddress = '0x1234567890123456789012345678901234567890'
    const selector = '0x12345678'

    describe('addAction', function () {
      it('Should allow operator to add action', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await expect(strategy.connect(operator).addAction(targetAddress, selector))
          .to.emit(strategy, 'ActionAdded')
          .withArgs(targetAddress, selector)

        const actions = await strategy.connect(operator).actions(targetAddress, 0)
        expect(actions).to.include(selector)
      })

      it('Should not allow non-operator to add action', async function () {
        const { strategy, user } = await deployFreshStrategy()

        await expect(strategy.connect(user).addAction(targetAddress, selector)).to.be.rejectedWith(
          'AccessControl:'
        )
      })

      it('Should revert if selector already exists', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)

        await expect(
          strategy.connect(operator).addAction(targetAddress, selector)
        ).to.be.revertedWithCustomError(strategy, 'SelectorAlreadyExists')
      })
    })

    describe('removeAction', function () {
      it('Should allow operator to remove action', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)

        await expect(strategy.connect(operator).removeAction(targetAddress, selector))
          .to.emit(strategy, 'ActionRemoved')
          .withArgs(targetAddress, selector)

        console.log('removed action')
        const actions = await strategy.actionsLength(targetAddress)
        console.log('actions', actions)

        expect(actions).to.equal(0)
      })

      it('Should not allow non-operator to remove action', async function () {
        const { strategy, operator, user } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)

        await expect(
          strategy.connect(user).removeAction(targetAddress, selector)
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await user.getAddress()
          ).toLowerCase()} is missing role ${await strategy.OPERATOR_ROLE()}`
        )
      })

      it('Should revert if selector does not exist', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        const nonExistentSelector = '0x87654321'
        await expect(strategy.connect(operator).removeAction(targetAddress, nonExistentSelector))
          .to.be.revertedWithCustomError(strategy, 'ActionNotFound')
          .withArgs(targetAddress, nonExistentSelector)
      })

      it('Should handle multiple actions correctly', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        const selector2 = '0x87654321'
        const selector3 = '0x11111111'

        await strategy.connect(operator).addAction(targetAddress, selector)
        await strategy.connect(operator).addAction(targetAddress, selector2)
        await strategy.connect(operator).addAction(targetAddress, selector3)

        // Remove middle action
        await strategy.connect(operator).removeAction(targetAddress, selector2)

        const actions = await strategy.getActions(targetAddress)
        expect(actions).to.include(selector)
        expect(actions).to.include(selector3)
        expect(actions).to.not.include(selector2)
      })
    })
  })

  describe('Action Parameter Role Management', function () {
    const targetAddress = '0x1234567890123456789012345678901234567890'
    const selector = '0x12345678'
    const paramIndex = 0
    const onlySender = true

    describe('addActionParamRole', function () {
      it('Should allow operator to add action param role', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)

        await expect(
          strategy
            .connect(operator)
            .addActionParamRole(targetAddress, selector, paramIndex, onlySender)
        )
          .to.emit(strategy, 'ActionParamRoleAdded')
          .withArgs(targetAddress, selector, paramIndex, onlySender)

        const paramRoles = await strategy.getActionParamRoles(targetAddress, selector)
        console.log({ paramRoles })
        expect(paramRoles.length).to.equal(1)
        expect(paramRoles[0].index).to.equal(paramIndex)
        expect(paramRoles[0].onlySender).to.equal(onlySender)
      })

      it('Should not allow non-operator to add action param role', async function () {
        const { strategy, operator, user } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)

        await expect(
          strategy.connect(user).addActionParamRole(targetAddress, selector, paramIndex, onlySender)
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await user.getAddress()
          ).toLowerCase()} is missing role ${await strategy.OPERATOR_ROLE()}`
        )
      })

      it('Should revert if param role already exists', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)
        await strategy
          .connect(operator)
          .addActionParamRole(targetAddress, selector, paramIndex, onlySender)

        await expect(
          strategy
            .connect(operator)
            .addActionParamRole(targetAddress, selector, paramIndex, onlySender)
        )
          .to.be.revertedWithCustomError(strategy, 'ActionParamRoleAlreadyExists')
          .withArgs(targetAddress, selector, paramIndex)
      })
    })

    describe('removeActionParamRole', function () {
      it('Should allow operator to remove action param role', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)
        await strategy
          .connect(operator)
          .addActionParamRole(targetAddress, selector, paramIndex, onlySender)

        await expect(
          strategy.connect(operator).removeActionParamRole(targetAddress, selector, paramIndex)
        )
          .to.emit(strategy, 'ActionParamRoleRemoved')
          .withArgs(targetAddress, selector, paramIndex)

        const paramRoles = await strategy.getActionParamRoles(targetAddress, selector)
        console.log({ paramRoles })
        expect(paramRoles.length).to.equal(0)
      })

      it('Should not allow non-operator to remove action param role', async function () {
        const { strategy, operator, user } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)
        await strategy
          .connect(operator)
          .addActionParamRole(targetAddress, selector, paramIndex, onlySender)

        await expect(
          strategy.connect(user).removeActionParamRole(targetAddress, selector, paramIndex)
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await user.getAddress()
          ).toLowerCase()} is missing role ${await strategy.OPERATOR_ROLE()}`
        )
      })

      it('Should revert if param role does not exist', async function () {
        const { strategy, operator } = await deployFreshStrategy()

        await strategy.connect(operator).addAction(targetAddress, selector)

        const nonExistentIndex = 5
        await expect(
          strategy
            .connect(operator)
            .removeActionParamRole(targetAddress, selector, nonExistentIndex)
        )
          .to.be.revertedWithCustomError(strategy, 'ActionParamRoleNotFound')
          .withArgs(targetAddress, selector, nonExistentIndex)
      })
    })
  })

  describe('Execute Function', function () {
    it('Should execute action successfully', async function () {
      const { strategy, operator, defaultAdmin } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      // mint token

      const transferSelector = mockToken.interface.getFunction('transfer').selector
      await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

      const amount = parseEther('100')
      const data = mockToken.interface.encodeFunctionData('transfer', [
        await defaultAdmin.getAddress(),
        amount
      ])

      // Mint tokens to strategy contract
      await mockToken.mint(await strategy.getAddress(), amount)

      await expect(strategy.execute(mockToken.getAddress(), transferSelector, data))
        .to.emit(strategy, 'ActionExecuted')
        .withArgs(mockToken.getAddress(), data)

      expect(await mockToken.balanceOf(await defaultAdmin.getAddress())).to.equal(amount)
    })

    it('Should revert if selector not found in actions', async function () {
      const { strategy, defaultAdmin } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      const nonExistentSelector = '0x87654321'
      const data = mockToken.interface.encodeFunctionData('transfer', [
        await defaultAdmin.getAddress(),
        parseEther('100')
      ])

      await expect(strategy.execute(mockToken.getAddress(), nonExistentSelector, data))
        .to.be.revertedWithCustomError(strategy, 'InvalidData')
        .withArgs(data)
    })

    it('Should revert if data length is less than 4', async function () {
      const { strategy, operator } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      const transferSelector = mockToken.interface.getFunction('transfer').selector
      await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

      const invalidData = '0x'

      await expect(strategy.execute(mockToken.getAddress(), transferSelector, invalidData))
        .to.be.revertedWithCustomError(strategy, 'InvalidData')
        .withArgs(invalidData)
    })

    it('Should revert if selector in data does not match provided selector', async function () {
      const { strategy, operator, defaultAdmin } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      const transferSelector = mockToken.interface.getFunction('transfer').selector
      await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

      const approveSelector = mockToken.interface.getFunction('approve').selector
      const data = mockToken.interface.encodeFunctionData('transfer', [
        await defaultAdmin.getAddress(),
        parseEther('100')
      ])

      await expect(strategy.execute(mockToken.getAddress(), approveSelector, data))
        .to.be.revertedWithCustomError(strategy, 'InvalidData')
        .withArgs(data)
    })

    it('Should revert if target call fails', async function () {
      const { strategy, operator, defaultAdmin } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      const transferSelector = mockToken.interface.getFunction('transfer').selector
      await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

      const amount = parseEther('1000') // More than strategy has
      const data = mockToken.interface.encodeFunctionData('transfer', [
        await defaultAdmin.getAddress(),
        amount
      ])

      await expect(strategy.execute(mockToken.getAddress(), transferSelector, data))
        .to.be.revertedWithCustomError(strategy, 'ExecuteFailed')
        .withArgs(mockToken.getAddress(), transferSelector)
    })

    it('Should revert when paused', async function () {
      const { strategy, operator, defaultAdmin } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      const transferSelector = mockToken.interface.getFunction('transfer').selector
      await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

      // Pause the contract
      await strategy.connect(operator).pause()

      const amount = parseEther('100')
      const data = mockToken.interface.encodeFunctionData('transfer', [
        await defaultAdmin.getAddress(),
        amount
      ])

      await expect(
        strategy.execute(mockToken.getAddress(), transferSelector, data)
      ).to.be.rejectedWith('Pausable: paused')
    })

    describe('Parameter Role Validation', function () {
      it('Should execute when msg.sender matches parameter', async function () {
        const { strategy, operator, defaultAdmin, user } = await deployFreshStrategy()
        const mockToken = await deployMockToken()

        const transferSelector = mockToken.interface.getFunction('transfer').selector
        await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

        // Add param role that requires msg.sender to be the first parameter (recipient)
        await strategy.connect(operator).addActionParamRole(
          mockToken.getAddress(),
          transferSelector,
          0, // first parameter (recipient)
          true // onlySender = true
        )

        const amount = parseEther('100')
        const data = mockToken.interface.encodeFunctionData('transfer', [
          await user.getAddress(),
          amount
        ])

        // Mint tokens to strategy contract
        await mockToken.mint(await strategy.getAddress(), amount)

        await expect(
          strategy.connect(user).execute(mockToken.getAddress(), transferSelector, data)
        ).to.emit(strategy, 'ActionExecuted')
      })

      it('Should revert when msg.sender does not match parameter', async function () {
        const { strategy, operator, defaultAdmin, user, attacker } = await deployFreshStrategy()
        const mockToken = await deployMockToken()

        const transferSelector = mockToken.interface.getFunction('transfer').selector
        await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

        // Add param role that requires msg.sender to be the first parameter (recipient)
        await strategy.connect(operator).addActionParamRole(
          mockToken.getAddress(),
          transferSelector,
          0, // first parameter (recipient)
          true // onlySender = true
        )

        const amount = parseEther('100')
        const data = mockToken.interface.encodeFunctionData('transfer', [
          await attacker.getAddress(),
          amount
        ])

        // Mint tokens to strategy contract
        await mockToken.mint(await strategy.getAddress(), amount)

        await expect(strategy.connect(user).execute(mockToken.getAddress(), transferSelector, data))
          .to.be.revertedWithCustomError(strategy, 'ActionParamRoleInvalid')
          .withArgs(mockToken.getAddress(), transferSelector, 0)
      })

      it('Should execute when onlySender is false', async function () {
        const { strategy, operator, defaultAdmin, user, attacker } = await deployFreshStrategy()
        const mockToken = await deployMockToken()

        const transferSelector = mockToken.interface.getFunction('transfer').selector
        await strategy.connect(operator).addAction(mockToken.getAddress(), transferSelector)

        // Add param role with onlySender = false
        await strategy.connect(operator).addActionParamRole(
          mockToken.getAddress(),
          transferSelector,
          0,
          false // onlySender = false
        )

        const amount = parseEther('100')
        const data = mockToken.interface.encodeFunctionData('transfer', [
          await attacker.getAddress(),
          amount
        ])

        // Mint tokens to strategy contract
        await mockToken.mint(await strategy.getAddress(), amount)

        await expect(
          strategy.connect(user).execute(mockToken.getAddress(), transferSelector, data)
        ).to.emit(strategy, 'ActionExecuted')
      })
    })
  })

  describe('Pause/Unpause Functionality', function () {
    it('Should allow operator to pause', async function () {
      const { strategy, operator } = await deployFreshStrategy()

      await expect(strategy.connect(operator).pause())
        .to.emit(strategy, 'Paused')
        .withArgs(await operator.getAddress())

      expect(await strategy.paused()).to.be.true
    })

    it('Should allow operator to unpause', async function () {
      const { strategy, operator } = await deployFreshStrategy()

      await strategy.connect(operator).pause()

      await expect(strategy.connect(operator).unpause())
        .to.emit(strategy, 'Unpaused')
        .withArgs(await operator.getAddress())

      expect(await strategy.paused()).to.be.false
    })

    it('Should not allow non-operator to pause', async function () {
      const { strategy, user } = await deployFreshStrategy()

      await expect(strategy.connect(user).pause()).to.be.revertedWith(
        `AccessControl: account ${(
          await user.getAddress()
        ).toLowerCase()} is missing role ${await strategy.OPERATOR_ROLE()}`
      )
    })

    it('Should not allow non-operator to unpause', async function () {
      const { strategy, operator, user } = await deployFreshStrategy()

      await strategy.connect(operator).pause()

      await expect(strategy.connect(user).unpause()).to.be.revertedWith(
        `AccessControl: account ${(
          await user.getAddress()
        ).toLowerCase()} is missing role ${await strategy.OPERATOR_ROLE()}`
      )
    })
  })

  describe('Withdrawal Functions', function () {
    it('Should allow admin to withdraw ERC20 tokens', async function () {
      const { strategy, defaultAdmin, user } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      // Mint tokens to strategy contract

      await mockToken.mint(await strategy.getAddress(), parseEther('1000'))

      const amount = parseEther('100')

      const userBalanceBefore = await mockToken.balanceOf(await user.getAddress())
      await expect(
        strategy
          .connect(defaultAdmin)
          .withdrawERC20(await mockToken.getAddress(), await user.getAddress(), amount)
      ).to.not.be.reverted

      expect(await mockToken.balanceOf(await user.getAddress())).to.equal(
        userBalanceBefore + amount
      )
    })

    it('Should not allow non-admin to withdraw ERC20 tokens', async function () {
      const { strategy, defaultAdmin, user } = await deployFreshStrategy()
      const mockToken = await deployMockToken()

      // Mint tokens to strategy contract
      await mockToken.mint(await strategy.getAddress(), parseEther('1000'))

      const amount = parseEther('100')

      await expect(
        strategy
          .connect(user)
          .withdrawERC20(await mockToken.getAddress(), await user.getAddress(), amount)
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await user.getAddress()
        ).toLowerCase()} is missing role ${await strategy.DEFAULT_ADMIN_ROLE()}`
      )
    })

    it('Should allow admin to withdraw ETH', async function () {
      const { strategy, defaultAdmin, user } = await deployFreshStrategy()

      // Send ETH to strategy contract
      await defaultAdmin.sendTransaction({
        to: await strategy.getAddress(),
        value: parseEther('1')
      })

      const amount = parseEther('0.5')
      const initialBalance = await ethers.provider.getBalance(await user.getAddress())

      await expect(strategy.connect(defaultAdmin).withdrawETH(await user.getAddress(), amount)).to
        .not.be.reverted

      const finalBalance = await ethers.provider.getBalance(await user.getAddress())
      expect(finalBalance - initialBalance).to.equal(amount)
    })

    it('Should not allow non-admin to withdraw ETH', async function () {
      const { strategy, defaultAdmin, user } = await deployFreshStrategy()

      // Send ETH to strategy contract
      await defaultAdmin.sendTransaction({
        to: await strategy.getAddress(),
        value: parseEther('1')
      })

      const amount = parseEther('0.5')

      await expect(
        strategy.connect(user).withdrawETH(await user.getAddress(), amount)
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await user.getAddress()
        ).toLowerCase()} is missing role ${await strategy.DEFAULT_ADMIN_ROLE()}`
      )
    })

    it('Should revert if ETH transfer fails', async function () {
      const { strategy, defaultAdmin, user } = await deployFreshStrategy()

      // Send ETH to strategy contract
      await defaultAdmin.sendTransaction({
        to: await strategy.getAddress(),
        value: parseEther('1')
      })

      // Try to withdraw more than available
      const amount = parseEther('2')

      await expect(strategy.connect(defaultAdmin).withdrawETH(await user.getAddress(), amount))
        .to.be.revertedWithCustomError(strategy, 'ExecuteFailed')
        .withArgs(await user.getAddress(), '0x00000000')
    })
  })

  describe('Receive Function', function () {
    it('Should accept ETH transfers', async function () {
      const { strategy, defaultAdmin } = await deployFreshStrategy()

      const amount = parseEther('1')
      const initialBalance = await ethers.provider.getBalance(await strategy.getAddress())

      await defaultAdmin.sendTransaction({
        to: await strategy.getAddress(),
        value: amount
      })

      const finalBalance = await ethers.provider.getBalance(await strategy.getAddress())
      expect(finalBalance - initialBalance).to.equal(amount)
    })
  })

  describe('Role Management', function () {
    it('Should allow admin to grant and revoke roles', async function () {
      const { strategy, defaultAdmin, user } = await deployFreshStrategy()

      const OPERATOR_ROLE = await strategy.OPERATOR_ROLE()

      // Grant operator role to user
      await strategy.connect(defaultAdmin).grantRole(OPERATOR_ROLE, await user.getAddress())
      expect(await strategy.hasRole(OPERATOR_ROLE, await user.getAddress())).to.be.true

      // Revoke operator role from user
      await strategy.connect(defaultAdmin).revokeRole(OPERATOR_ROLE, await user.getAddress())
      expect(await strategy.hasRole(OPERATOR_ROLE, await user.getAddress())).to.be.false
    })

    it('Should not allow non-admin to grant roles', async function () {
      const { strategy, user } = await deployFreshStrategy()

      const OPERATOR_ROLE = await strategy.OPERATOR_ROLE()

      await expect(
        strategy.connect(user).grantRole(OPERATOR_ROLE, await user.getAddress())
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await user.getAddress()
        ).toLowerCase()} is missing role ${await strategy.DEFAULT_ADMIN_ROLE()}`
      )
    })
  })

  describe('Edge Cases and Security', function () {
    it('Should handle empty actions array', async function () {
      const { strategy } = await deployFreshStrategy()

      const targetAddress = '0x1234567890123456789012345678901234567890'
      const actions = await strategy.getActions(targetAddress)
      expect(actions.length).to.equal(0)
    })

    it('Should handle empty param roles array', async function () {
      const { strategy } = await deployFreshStrategy()

      const targetAddress = '0x1234567890123456789012345678901234567890'
      const selector = '0x12345678'
      const paramRoles = await strategy.getActionParamRoles(targetAddress, selector)
      expect(paramRoles.length).to.equal(0)
    })

    it('Should handle multiple param roles correctly', async function () {
      const { strategy, operator } = await deployFreshStrategy()

      const targetAddress = '0x1234567890123456789012345678901234567890'
      const selector = '0x12345678'

      await strategy.connect(operator).addAction(targetAddress, selector)

      // Add multiple param roles
      await strategy.connect(operator).addActionParamRole(targetAddress, selector, 0, true)
      await strategy.connect(operator).addActionParamRole(targetAddress, selector, 1, false)
      await strategy.connect(operator).addActionParamRole(targetAddress, selector, 2, true)

      const paramRoles = (await strategy.getActionParamRoles(targetAddress, selector)) as any
      expect(paramRoles.length).to.equal(3)
      expect(paramRoles[0].index).to.equal(0)
      expect(paramRoles[0].onlySender).to.be.true
      expect(paramRoles[1].index).to.equal(1)
      expect(paramRoles[1].onlySender).to.be.false
      expect(paramRoles[2].index).to.equal(2)
      expect(paramRoles[2].onlySender).to.be.true
    })
  })
})
