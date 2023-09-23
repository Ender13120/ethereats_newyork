require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.19",
  networks: {
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com", // This is a public RPC for the Mumbai testnet. It's recommended to use your own or a service like Infura or Alchemy.
      accounts: [process.env.PRIVATE_KEY], // Replace with your private key or use a mnemonic
      chainId: 80001,
      gasPrice: 20000000000, // 20 Gwei
    },
  },
};
