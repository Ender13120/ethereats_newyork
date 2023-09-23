// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {



    // Deploy TestUSDC
    const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
    const testUSDC = await TestUSDC.deploy();
    await testUSDC.waitForDeployment();
    console.log("TestUSDC deployed to:", await testUSDC.getAddress());

      // Deploy GovernanceTokenBlockBite
  const GovernanceTokenBlockBite = await hre.ethers.getContractFactory("GovernanceTokenBlockBite");
  const blockBiteToken = await GovernanceTokenBlockBite.deploy();
  await blockBiteToken.waitForDeployment();
  console.log("GovernanceTokenBlockBite deployed to:", await blockBiteToken.getAddress());

 // Deploy DecentralizedDeliveryService
 const DecentralizedDeliveryService = await hre.ethers.getContractFactory("DecentralizedDeliveryService");
 const deliveryService = await DecentralizedDeliveryService.deploy(await blockBiteToken.getAddress(), await testUSDC.getAddress());
 await deliveryService.waitForDeployment();
 console.log("DecentralizedDeliveryService deployed to:",await  deliveryService.getAddress());
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
