const { expect } = require("chai");

describe("TestUSDC", function () {
  let testUSDC;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    TestUSDC = await ethers.getContractFactory("TestUSDC");
    GovernanceTokenBlockBite = await ethers.getContractFactory("GovernanceTokenBlockBite");
    DecentralizedDeliveryService = await ethers.getContractFactory("DecentralizedDeliveryService");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the contracts for each test
    testUSDC = await TestUSDC.deploy();
    blockBiteToken = await GovernanceTokenBlockBite.deploy();


    console.log(await blockBiteToken.getAddress())
    console.log(await testUSDC.getAddress())
    
    deliveryService = await DecentralizedDeliveryService.deploy(await blockBiteToken.getAddress(), await testUSDC.getAddress());


  });

  describe("Deployment TESTUSDC", function () {
    it("Should set the right token name and symbol", async function () {
      expect(await testUSDC.name()).to.equal("TestUSDC");
      expect(await testUSDC.symbol()).to.equal("T-USDC");
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await testUSDC.balanceOf(owner.address);
      expect(await testUSDC.totalSupply()).to.equal(ownerBalance);
    });


    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1

      await testUSDC.connect(addr1).demoMint(50);
      const addr1Balance = await testUSDC.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use connect here because it's a different account than the default (owner)
      await testUSDC.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await testUSDC.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await testUSDC.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner (1000 tokens)
      await expect(
        testUSDC.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed
      expect(await testUSDC.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });
  });

  describe("Deployment BlockBite", function () {
    it("Should set the right token name and symbol for BlockBite", async function () {
      expect(await blockBiteToken.name()).to.equal("BB-GovernanceToken");
      expect(await blockBiteToken.symbol()).to.equal("BB-GOV");
    });

    it("Should mint the right amount of tokens using demoMint", async function () {
      await blockBiteToken.connect(addr1).demoMint();
      const addr1Balance = await blockBiteToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.parseEther("100")); // 100 tokens
    });

    it("Should not allow demoMint more than once for the same address", async function () {
      await blockBiteToken.connect(addr1).demoMint();
      await expect(blockBiteToken.connect(addr1).demoMint()).to.be.revertedWith(
        "Tokens have already been minted for this address"
      );
    });
  });

  

  describe("DecentralizedDeliveryService", function () {

  

    describe("Delivery Service", function () {
      it("Should allow users to stake tokens", async function () {
        await blockBiteToken.connect(addr1).demoMint();
        await blockBiteToken.connect(addr1).approve(await deliveryService.getAddress(), ethers.parseEther("100"));
        await deliveryService.connect(addr1).stakeTokens();
  
        expect(await deliveryService.reputation(addr1.address)).to.equal(100);
        expect(await deliveryService.stakedTokens(addr1.address)).to.equal(ethers.parseEther("100"));
      });
    });

    describe("Order Creation", function () {
      it("Should allow customers to create orders", async function () {
        const tokenAmount = ethers.parseEther("100");
        await testUSDC.connect(addr1).demoMint(tokenAmount);

        let initialOrderCount = await deliveryService.orderCount();
        initialOrderCount = BigInt(initialOrderCount);

        await testUSDC.connect(addr1).approve(await deliveryService.getAddress(), tokenAmount);

        const encryptedParams = ethers.toUtf8Bytes("test");
        await deliveryService.connect(addr1).createOrder(encryptedParams, tokenAmount);

        const newOrderCount = await deliveryService.orderCount();
        expect(newOrderCount.toString()).to.equal(initialOrderCount + 1n);

        const order = await deliveryService.orders(newOrderCount);
        expect(order.customer).to.equal(addr1.address);
        expect(order.amount.toString()).to.equal(tokenAmount.toString());
   
      });
  });
  
  describe("Order Acceptance", function () {
    it("Should allow deliverers with enough reputation to accept orders", async function () {
        // 1. Ensure deliverer has enough reputation
        await blockBiteToken.connect(addr2).demoMint();
        await blockBiteToken.connect(addr2).approve(await deliveryService.getAddress(), ethers.parseEther("100"));
        await deliveryService.connect(addr2).stakeTokens();

        // 2. Create an order as a customer
        const tokenAmount = ethers.parseEther("100");
        await testUSDC.connect(addr1).demoMint(tokenAmount);
        await testUSDC.connect(addr1).approve(await deliveryService.getAddress(), tokenAmount);
        const encryptedParams = ethers.toUtf8Bytes("test");
        await deliveryService.connect(addr1).createOrder(encryptedParams, tokenAmount);

        // 3. Accept the order as a deliverer
        const orderId = (await deliveryService.orderCount()).toString();
        await deliveryService.connect(addr2).acceptOrder(orderId);

        // 4. Verify
        const order = await deliveryService.orders(orderId);
        expect(order.deliverer).to.equal(addr2.address);
        expect(order.isAccepted).to.be.true;
    });


    it("Full flow accept and confirm delivery successful", async function () {
      // 1. Ensure deliverer has enough reputation
      await blockBiteToken.connect(addr2).demoMint();
      await blockBiteToken.connect(addr2).approve(await deliveryService.getAddress(), ethers.parseEther("100"));
      await deliveryService.connect(addr2).stakeTokens();

      // 2. Create an order as a customer
      const tokenAmount = ethers.parseEther("100");
      await testUSDC.connect(addr1).demoMint(tokenAmount);
      await testUSDC.connect(addr1).approve(await deliveryService.getAddress(), tokenAmount);
      const encryptedParams = ethers.toUtf8Bytes("test");
      await deliveryService.connect(addr1).createOrder(encryptedParams, tokenAmount);

      // 3. Accept the order as a deliverer
      const orderId = (await deliveryService.orderCount()).toString();
      await deliveryService.connect(addr2).acceptOrder(orderId);

      // 4. Verify
      const order = await deliveryService.orders(orderId);
      expect(order.deliverer).to.equal(addr2.address);
      expect(order.isAccepted).to.be.true;

         // 5. Customer signs a message confirming order completion
    const message = ethers.solidityPackedKeccak256(["string", "uint256"], ["Order Completed", orderId]);
    const signature = await addr1.signMessage(ethers.getBytes(message));

    // 6. Deliverer completes the order using the customer's signature
    await deliveryService.connect(addr2).completeOrder(orderId, signature);

    // 7. Verify order completion
    const updatedOrder = await deliveryService.orders(orderId);
    expect(updatedOrder.isCompleted).to.be.true;

    // 8. Verify reputation increase
    const delivererReputation = await deliveryService.reputation(addr2.address);
    const customerReputation = await deliveryService.customerReputation(addr1.address);
    expect(delivererReputation).to.equal(101); // Assuming initial reputation was 0
    expect(customerReputation).to.equal(1); // Assuming initial reputation was 0

    // 9. Verify token transfer to deliverer
    const delivererBalance = await testUSDC.balanceOf(addr2.address);
    expect(delivererBalance).to.equal(tokenAmount);
  });
});



describe("Order Acceptance with Insufficient Reputation", function () {
  it("Should revert if deliverer does not have enough reputation", async function () {
      // 1. Ensure deliverer does not have enough reputation
      // Assuming addr2 does not have any reputation at this point

      // 2. Create an order as a customer
      const tokenAmount = ethers.parseEther("100");
      await testUSDC.connect(addr1).demoMint(tokenAmount);
      await testUSDC.connect(addr1).approve(await deliveryService.getAddress(), tokenAmount);
      const encryptedParams = ethers.toUtf8Bytes("test");
      await deliveryService.connect(addr1).createOrder(encryptedParams, tokenAmount);

      // 3. Attempt to accept the order as the under-reputed deliverer
      const orderId = (await deliveryService.orderCount()).toString();
      await expect(deliveryService.connect(addr2).acceptOrder(orderId))
          .to.be.revertedWith("Not enough reputation!");

      // 4. Verify that the order's deliverer is still unset
      const order = await deliveryService.orders(orderId);
      expect(order.deliverer).to.equal(ethers.ZeroAddress);
      expect(order.isAccepted).to.be.false;
  });
});

  });
});