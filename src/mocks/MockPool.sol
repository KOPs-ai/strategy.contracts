// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPool {
    // Simplified mock - doesn't implement full IPool interface
    // Just provides the methods that MaxYieldUSDT actually calls

    event Supply(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        uint16 indexed referralCode
    );

    event Withdraw(
        address indexed reserve,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {
        // Mock implementation - just emit the event
        // transfer asset to this contract
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        emit Supply(asset, msg.sender, onBehalfOf, amount, referralCode);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        // Mock implementation - just emit the event
        // transfer asset to to
        IERC20(asset).transfer(to, amount);
        emit Withdraw(asset, msg.sender, to, amount);
        return amount;
    }
}
