// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceTokenBlockBite is ERC20, Ownable {
    mapping(address => bool) public demoMinted;

    constructor() ERC20("BB-GovernanceToken", "BB-GOV") {}

    // Demo function to mint 100 * 1e18 tokens to the msg.sender once
    function demoMint() external {
        require(
            !demoMinted[msg.sender],
            "Tokens have already been minted for this address"
        );
        uint256 amount = 100 * 1e18;
        _mint(msg.sender, amount);
        demoMinted[msg.sender] = true;
    }
}
