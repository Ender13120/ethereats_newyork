// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DecentralizedDeliveryService is Ownable {
    struct Order {
        address customer;
        address deliverer;
        uint256 amount;
        uint256 timestamp;
        bytes encryptedParams;
        bool isAccepted;
        bool isCompleted;
    }

    mapping(address => uint256) public reputation;
    mapping(address => uint256) public customerReputation;
    mapping(address => uint256) public stakedTokens;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => uint256) public reputationLevels;
    mapping(uint256 => uint256) public customerReputationLevels;
    mapping(address => bool) public delivererHasActiveOrder;

    uint256 public constant SLASHING_PERCENTAGE = 5; // 5% of staked tokens will be slashed

    address public governanceToken;

    address public transactionCurrencyToken;

    uint256 public orderCount = 0;

    event OrderCreated(
        uint256 orderId,
        address customer,
        bytes encryptedParams
    );

    event OrderAccepted(uint256 orderId, address deliverer);
    event OrderCompleted(uint256 orderId);
    event OrderCancelled(uint256 orderId, address by);
    event TokensSlashed(address indexed deliverer, uint256 amount);
    event DelivererReputationIncreased(
        address indexed deliverer,
        uint256 amount
    );
    event DelivererReputationDecreased(
        address indexed deliverer,
        uint256 amount
    );
    event CustomerReputationIncreased(address indexed customer, uint256 amount);

    constructor(address _governanceToken, address _transactionCurrencyToken) {
        governanceToken = _governanceToken;
        transactionCurrencyToken = _transactionCurrencyToken;
        reputationLevels[1] = 100;
    }

    function changeGovernanceTokenDEMOAdmin(
        address _newGovernanceToken,
        address _transactionCurrencyToken
    ) external onlyOwner {
        governanceToken = _newGovernanceToken;
        transactionCurrencyToken = _transactionCurrencyToken;
    }

    function changeReputationLevelsDEMOAdmin(
        uint _requiredReputation,
        uint _reputationLevel
    ) external onlyOwner {
        reputationLevels[_reputationLevel] = _requiredReputation;
    }

    function stakeTokens() external {
        uint amount = 100;
        uint256 amountTokens = amount * 1e18;

        // Transfer the tokens from the caller to this contract
        IERC20(governanceToken).transferFrom(
            msg.sender,
            address(this),
            amountTokens
        );

        // Increase the caller's reputation and staked tokens
        reputation[msg.sender] += amount;
        stakedTokens[msg.sender] += amountTokens;
        emit DelivererReputationIncreased(msg.sender, amount);
    }

    function unstakeTokens(uint256 _amount) external {
        uint amountTokens = _amount * 1e18;
        require(
            stakedTokens[msg.sender] >= amountTokens,
            "Not enough staked tokens"
        );
        require(
            reputation[msg.sender] >= amountTokens,
            "Reputation is less than the amount to unstake"
        );

        // Decrease the user's staked tokens and reputation
        stakedTokens[msg.sender] -= amountTokens;
        reputation[msg.sender] -= _amount;

        // Transfer the unstaked tokens back to the user
        IERC20(governanceToken).transfer(msg.sender, amountTokens);

        emit DelivererReputationDecreased(msg.sender, _amount); // Emit the event for deliverer reputation decrease
    }

    function verifyWorldCoin() external {
        // Logic to verify World Coin and raise reputation by a set amount
    }

    function createOrder(
        bytes memory encryptedParams,
        uint256 tokenAmount
    ) external {
        require(
            IERC20(transactionCurrencyToken).transferFrom(
                msg.sender,
                address(this),
                tokenAmount
            ),
            "Token transfer failed"
        );

        orderCount++;
        orders[orderCount] = Order({
            customer: msg.sender,
            deliverer: address(0),
            amount: tokenAmount,
            timestamp: block.timestamp,
            encryptedParams: encryptedParams,
            isAccepted: false,
            isCompleted: false
        });
        emit OrderCreated(orderCount, msg.sender, encryptedParams);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.customer,
            "Only the customer can cancel the order"
        );
        require(
            !order.isAccepted,
            "Order has already been accepted by a deliverer"
        );

        // Refund the customer in ERC20 tokens
        require(
            IERC20(transactionCurrencyToken).transfer(
                order.customer,
                order.amount
            ),
            "Token refund failed"
        );
        emit OrderCancelled(orderId, msg.sender);
    }

    function acceptOrder(uint256 orderId) external {
        Order storage order = orders[orderId];

        require(
            reputation[msg.sender] >= reputationLevels[1],
            "Not enough reputation!"
        );
        require(
            !delivererHasActiveOrder[msg.sender],
            "Deliverer already has an active order!"
        );
        require(order.deliverer == address(0), "Order already has a deliverer");
        require(!order.isCompleted, "Order is already completed");

        order.deliverer = msg.sender;
        order.isAccepted = true;
        delivererHasActiveOrder[msg.sender] = true; // Mark the deliverer as having an active order
        emit OrderAccepted(orderId, msg.sender);
    }

    function completeOrder(
        uint256 orderId,
        bytes memory _customerSignature
    ) external {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.deliverer,
            "Only the assigned deliverer can complete the order"
        );
        require(order.isAccepted, "Order has not been accepted yet");

        // Construct the message that was signed
        // This is a simple example, you might want to include more details in the message
        bytes32 message = keccak256(
            abi.encodePacked("Order Completed", orderId)
        );

        // Convert the message to an Ethereum signed message
        bytes32 ethSignedMessage = ECDSA.toEthSignedMessageHash(message);

        // Recover the signer's address from the signature
        address recoveredAddress = ECDSA.recover(
            ethSignedMessage,
            _customerSignature
        );

        // Compare the recovered address with the customer's address
        require(recoveredAddress == order.customer, "Invalid signature");

        // Transfer funds to deliverer
        require(
            IERC20(transactionCurrencyToken).transfer(
                order.deliverer,
                order.amount
            ),
            "Token transfer to deliverer failed"
        );
        order.isCompleted = true;

        // Raise reputation for deliverer and customer

        reputation[msg.sender] += 1;
        customerReputation[order.customer] += 1;

        emit DelivererReputationIncreased(msg.sender, 1);
        emit CustomerReputationIncreased(order.customer, 1); // Emit the event for customer reputation increase

        emit OrderCompleted(orderId);
    }

    function cancelAfter3Hours(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(
            block.timestamp - order.timestamp > 3 hours,
            "3 hours have not passed yet"
        );
        require(!order.isCompleted, "Order is already completed");

        // Refund the customer in ERC20 tokens
        require(
            IERC20(transactionCurrencyToken).transfer(
                order.customer,
                order.amount
            ),
            "Token refund failed"
        );
        reputation[order.deliverer] -= 1;

        emit DelivererReputationDecreased(order.deliverer, 1); // Emit the event for deliverer reputation decrease
        emit OrderCancelled(orderId, msg.sender);
    }

    function delivererCancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.deliverer,
            "Only the assigned deliverer can cancel the order"
        );
        require(order.isAccepted, "Order has not been accepted yet");

        // Refund the customer in ERC20 tokens
        require(
            IERC20(transactionCurrencyToken).transfer(
                order.customer,
                order.amount
            ),
            "Token refund failed"
        );
        emit DelivererReputationDecreased(order.deliverer, 1);
        reputation[order.deliverer] -= 1;
        emit OrderCancelled(orderId, msg.sender);
    }

    function _slashTokens(address deliverer) private {
        uint256 slashingAmount = (stakedTokens[deliverer] *
            SLASHING_PERCENTAGE) / 100;
        stakedTokens[deliverer] -= slashingAmount;

        emit TokensSlashed(deliverer, slashingAmount);
    }
}
