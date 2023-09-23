// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDC is ERC20 {
    constructor() ERC20("TestUSDC", "T-USDC") {}

    // Demo function to mint any amount of tokens to the msg.sender
    function demoMint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
