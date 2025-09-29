// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 public _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 initialDecimals
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = initialDecimals;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
