const { ethers } = require("ethers");

const fs = require("fs");
const path = require('path');



// Load the ABIs from the artifacts folder
const contractABIEtherEats = JSON.parse(fs.readFileSync(path.join(__dirname, 'artifacts/contracts/BlockBite.sol', 'DecentralizedDeliveryService.json'))).abi;
const contractABIUSDC = JSON.parse(fs.readFileSync(path.join(__dirname, 'artifacts/contracts/testUSDC.sol', 'TestUSDC.json'))).abi;
const contractABIGOV = JSON.parse(fs.readFileSync(path.join(__dirname, 'artifacts/contracts/GovernanceToken.sol', 'GovernanceTokenBlockBite.json'))).abi;






// Configuration
const contractAddressTokenUSDC = "0xcDbCe2029C80cC4829ECc7f80838295C063E9414";
const contractAddressEtherEats = "0x03B99A03bd4b73E5c4FAb00C523A17C250BA7700";

const contractAddressGovToken = "0x142327929a27186FD4d4dEA78FD5783b3529f118"


//addr1: 0x111111efDB779228DF8D8c18FCd57477007a61dc
//addr2: 0x222224Bb80cCCC57595f03c855A476373098E99d


const user1PrivateKey = "a4f8b010d83c442a4cdbb4d0f69602cffc524aea1267a70bb1be026dda731125";
const user2PrivateKey = "7b8aafc9d4af6f523bccce8aebe855cfbeb6a0f59f10e30dbd19715b33259dcf";
const providerUrl = "https://rpc.ankr.com/polygon_mumbai";

async function main() {

    const provider =  new ethers.JsonRpcProvider(
        'https://rpc-mumbai.maticvigil.com',
      );
   
    const user1Wallet = new ethers.Wallet(user1PrivateKey, provider);
    const user2Wallet = new ethers.Wallet(user2PrivateKey, provider);


    const etherEatsWithUser1 = new ethers.Contract(contractAddressEtherEats, contractABIEtherEats, user1Wallet);
    const etherEatsWithUser2 = new ethers.Contract(contractAddressEtherEats, contractABIEtherEats, user2Wallet);
    const tokenUSDCWithUser1 = new ethers.Contract(contractAddressTokenUSDC, contractABIUSDC, user1Wallet);
    const tokenUSDCWithUser2 = new ethers.Contract(contractAddressTokenUSDC, contractABIUSDC, user2Wallet);
    const govTokenWithUser1 = new ethers.Contract(contractAddressGovToken, contractABIGOV, user1Wallet)

  
    // 1. Ensure deliverer has enough reputation

    /*
    await govTokenWithUser1.demoMint();
    */
    await govTokenWithUser1.approve(contractAddressEtherEats, ethers.parseEther("100"));
  


    await etherEatsWithUser1.stakeTokens();

    // 2. Create an order as a customer
    const tokenAmount = ethers.parseEther("100");
      
    const demoMintUSDC = await tokenUSDCWithUser2.demoMint(tokenAmount);
    console.log('mint is out')

    await tokenUSDCWithUser2.approve(contractAddressEtherEats, tokenAmount);
    const encryptedParams = ethers.toUtf8Bytes("test");
    await etherEatsWithUser2.createOrder(encryptedParams, tokenAmount);

    // 3. Accept the order as a deliverer
    const orderId = (await etherEatsWithUser1.orderCount()).toString();
    await etherEatsWithUser1.acceptOrder(orderId);

    // 4. Customer signs a message confirming order completion
    const message = ethers.utils.solidityKeccak256(["string", "uint256"], ["Order Completed", orderId]);
    const signature = await user2Wallet.signMessage(ethers.utils.arrayify(message));

    // 5. Deliverer completes the order using the customer's signature
    await etherEatsWithUser1.completeOrder(orderId, signature);

    console.log("Script executed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
