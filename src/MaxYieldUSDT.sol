// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IPool} from "./interfaces/IPool.sol";
import {IERC20Burnable} from "./interfaces/IERC20Burnable.sol";
import {console} from "hardhat/console.sol";

contract MaxYieldUSDT is Pausable, Ownable {
    IPool public immutable hypurrfiPool;
    IPool public immutable hyperlendPool;
    IERC20Burnable public immutable usdt;

    IERC20Burnable public immutable hypurrfiAToken;
    IERC20Burnable public immutable hyperlendAToken;

    error InvalidAddress();
    error TokenNotAllowed();
    error NotOwner();
    error ActionNotFound(Action action);

    event HypurrfiSupplyUSDT(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    );
    event HypurrfiWithdrawUSDT(address asset, uint256 amount, address to);
    event HyperlendSupplyUSDT(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    );
    event HyperlendWithdrawUSDT(address asset, uint256 amount, address to);

    constructor(
        address initialOwner,
        address initHypurrfiPool,
        address initHyperlendPool,
        address initUsdtAddress,
        address initHypurrfiAToken,
        address initHyperlendAToken
    ) Ownable(initialOwner) {
        if (
            initHypurrfiPool == address(0) ||
            initHyperlendPool == address(0) ||
            initUsdtAddress == address(0) ||
            initHypurrfiAToken == address(0) ||
            initHyperlendAToken == address(0)
        ) {
            revert InvalidAddress();
        }
        hypurrfiPool = IPool(initHypurrfiPool);
        hyperlendPool = IPool(initHyperlendPool);
        usdt = IERC20Burnable(initUsdtAddress);
        hypurrfiAToken = IERC20Burnable(initHypurrfiAToken);
        hyperlendAToken = IERC20Burnable(initHyperlendAToken);
    }

    enum Action {
        HypurrfiSupplyUSDT,
        HypurrfiWithdrawUSDT,
        HyperlendSupplyUSDT,
        HyperlendWithdrawUSDT
    }

    function execute(Action action, bytes calldata data) public whenNotPaused {
        if (action == Action.HypurrfiSupplyUSDT) {
            _hypurrfiSupplyUSDT(data);
        } else if (action == Action.HypurrfiWithdrawUSDT) {
            _hypurrfiWithdrawUSDT(data);
        } else if (action == Action.HyperlendSupplyUSDT) {
            _hyperlendSupplyUSDT(data);
        } else if (action == Action.HyperlendWithdrawUSDT) {
            _hyperlendWithdrawUSDT(data);
        } else {
            revert ActionNotFound(action);
        }
    }

    function _hypurrfiSupplyUSDT(bytes calldata data) internal {
        (address asset, uint256 amount, address onBehalfOf, uint16 referralCode) = abi.decode(
            data[4:data.length],
            (address, uint256, address, uint16)
        );
        if (asset != address(usdt)) {
            revert TokenNotAllowed();
        }
        if (onBehalfOf != msg.sender) {
            revert NotOwner();
        }
        usdt.transferFrom(msg.sender, address(this), amount);
        //approve the pool to spend the USDT
        usdt.approve(address(hypurrfiPool), amount);
        hypurrfiPool.supply(asset, amount, onBehalfOf, referralCode);
        emit HypurrfiSupplyUSDT(asset, amount, onBehalfOf, referralCode);
    }

    function _hypurrfiWithdrawUSDT(bytes calldata data) internal {
        (address asset, uint256 amount, address to) = abi.decode(
            data[4:data.length],
            (address, uint256, address)
        );
        if (asset != address(usdt)) {
            revert TokenNotAllowed();
        }
        if (to != msg.sender) {
            revert NotOwner();
        }
        hypurrfiAToken.transferFrom(msg.sender, address(this), amount);
        hypurrfiPool.withdraw(asset, amount, to);
        emit HypurrfiWithdrawUSDT(asset, amount, to);
    }

    function _hyperlendSupplyUSDT(bytes calldata data) internal {
        (address asset, uint256 amount, address onBehalfOf, uint16 referralCode) = abi.decode(
            data[4:data.length],
            (address, uint256, address, uint16)
        );
        if (asset != address(usdt)) {
            revert TokenNotAllowed();
        }
        if (onBehalfOf != msg.sender) {
            revert NotOwner();
        }
        usdt.transferFrom(msg.sender, address(this), amount);

        //approve the pool to spend the USDT
        usdt.approve(address(hyperlendPool), amount);
        hyperlendPool.supply(asset, amount, onBehalfOf, referralCode);
        emit HyperlendSupplyUSDT(asset, amount, onBehalfOf, referralCode);
    }

    function _hyperlendWithdrawUSDT(bytes calldata data) internal {
        (address asset, uint256 amount, address to) = abi.decode(
            data[4:data.length],
            (address, uint256, address)
        );

        if (asset != address(usdt)) {
            revert TokenNotAllowed();
        }
        if (to != msg.sender) {
            revert NotOwner();
        }

        hyperlendAToken.transferFrom(msg.sender, address(this), amount);
        hyperlendPool.withdraw(asset, amount, to);
        emit HyperlendWithdrawUSDT(asset, amount, to);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function withdrawERC20(address token, address to, uint256 amount) public onlyOwner {
        IERC20Burnable(token).transfer(to, amount);
    }
}
