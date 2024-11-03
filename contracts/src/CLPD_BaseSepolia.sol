// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Contract deployed on Base Sepolia
 * @notice You can view the deployed contract at:
 * https://sepolia.basescan.org/address/0x3CDd0830D873eAB083653bb4aCa8d8D8023B7BF3
*/

// Main contract for CLPD that inherits from ERC20 and Ownable
contract CLPD is ERC20, Ownable {

    // Bank data value from API
    uint256 private apiDataBank;
    // chains data value from API
    uint256 private apiDataChains;

    // Token name storage
    string private _tokenName;
    // Token symbol storage  
    string private _tokenSymbol;
    // Flag to control minting permissions
    bool private canMint;

    // Custom errors for request ID and mint condition failures
    error UnexpectedRequestID(bytes32 requestId);
    error MintConditionNotMet(uint256 balance, uint256 totalSupply, uint256 mintAmount);

    // Variables to store pending mint amounts and users for single mints
    uint256 private pendingMintAmount;
    address private pendingUser;

    // Arrays to store pending users and amounts for batch minting
    address[] private pendingUsers;
    uint256[] private pendingAmounts;

    // Address that will receive tokens (e.g. for revoked tokens)
    address public receiver;

    // Access control mappings
    mapping(address => bool) public agents;      // Authorized agents who can perform admin actions
    mapping(address => bool) public frozenAccounts;  // Accounts that are temporarily frozen
    mapping(address => bool) public blacklisted;     // Permanently blocked accounts

    // Global freeze flag to stop all transfers
    bool public freezeAll;

    // Events emitted for various contract actions
    event TokensMinted(address indexed agent, address indexed user, uint256 amount);
    event BatchMintCompleted(address[] users, uint256[] amounts, uint256 totalAmount);
    event RedeemExecuted(address indexed user, uint256 amount, address receiver);
    event TokensBurned(address indexed user, uint256 amount);
    event AccountFrozen(address indexed user);
    event AccountUnfrozen(address indexed user);
    event AccountBlacklisted(address indexed user);
    event AccountRemovedFromBlacklist(address indexed user);
    event TokensRevoked(address indexed user, uint256 amount, address receiver);
    event ForceTransferExecuted(address indexed from, address indexed to, uint256 amount);
    event AllTokensFrozen();
    event AllTokensUnfrozen();
    event AddAgent();
    event RemoveAgent();
    event SetsubscriptionID();
    event SetReceiver();
    event TokenDetailsUpdated(string newName, string newSymbol);
    event TokensBridge(address indexed user, uint256 amount, address indexed receiver);

    // Initialize contract with default token name and symbol
    constructor() ERC20(_tokenName, _tokenSymbol) Ownable(msg.sender) {
        _tokenName = "CLPD";
        _tokenSymbol = "CLPD";
    }

    // Restrict function access to authorized agents
    modifier onlyAgent() {
        require(agents[msg.sender], "Only agents can execute this function");
        _;
    }

    // Check if accounts are frozen or blacklisted before transfers
    modifier notFrozenOrBlacklisted(address _from, address _to) {
        require(!freezeAll, "All transfers are frozen");
        require(!frozenAccounts[_from], "Sender is frozen");
        require(!frozenAccounts[_to], "Recipient is frozen");
        require(!blacklisted[_from], "Sender is blacklisted");
        require(!blacklisted[_to], "Recipient is blacklisted");
        _;
    }

    // Add a new authorized agent
    function addAgent(address agent) external onlyOwner {
        agents[agent] = true;
        emit AddAgent();
    }

    // Remove an authorized agent
    function removeAgent(address agent) external onlyOwner {
        agents[agent] = false;
        emit RemoveAgent();
    }

    // Verify and update API bank value and minting permission using Oracle data
    function verifyValueAPI(uint256 totalSupplyAllChains, uint256 currentBankBalance) public onlyAgent {
        require(apiDataBank != currentBankBalance, "It is the same value");

        apiDataBank = currentBankBalance;
        apiDataChains = totalSupplyAllChains;

        if(totalSupplyAllChains < apiDataBank) {
            canMint = true;
        }
        else {
            canMint = false;
        }
    }

    // Mint tokens to a single user
    function mint(address user, uint256 amount) external onlyAgent {
        require(canMint, "You can not mint");
        require(!frozenAccounts[user] && !blacklisted[user], "User is frozen or blacklisted");
        require(!freezeAll, "Token minting is frozen");
        pendingMintAmount = amount;  // Store the pending mint amount
        pendingUser = user;  // Store the pending user
        mintTokens();
    }

    // Batch mint tokens to multiple users
    function mintBatch(address[] calldata users, uint256[] calldata amounts) external onlyAgent {
        require(canMint, "You can not mint");
        require(users.length == amounts.length, "Users and amounts length mismatch");
        require(!freezeAll, "Token minting is frozen");
        for (uint256 i = 0; i < users.length; i++) {
            require(!frozenAccounts[users[i]] && !blacklisted[users[i]], "User is frozen or blacklisted");
        }
        pendingUsers = users;  // Store the pending users
        pendingAmounts = amounts;  // Store the pending amounts
        mintTokens();
    }

    // Internal function to handle both single and batch minting
    function mintTokens() internal {
        uint256 balance = apiDataBank * 10 **18;
        // Handle batch minting
        if (pendingUsers.length > 0) {
            uint256 totalMintAmount = 0;
            for (uint256 i = 0; i < pendingAmounts.length; i++) {
                totalMintAmount += pendingAmounts[i];
            }

            // Verify total supply matches expected balance
            if (balance == (apiDataChains + totalMintAmount)) {
                for (uint256 i = 0; i < pendingUsers.length; i++) {
                    _mint(pendingUsers[i], pendingAmounts[i]);  // Mint to each user
                    emit TokensMinted(msg.sender, pendingUsers[i], pendingAmounts[i]);  // Emit event
                }
                emit BatchMintCompleted(pendingUsers, pendingAmounts, totalMintAmount);  // Event of batch mint
            } else {
                revert MintConditionNotMet(balance, totalSupply(), pendingMintAmount);
            }

            // Reset temporary variables
            delete pendingUsers;
            delete pendingAmounts;
        }
        // Handle single mint
        else if (pendingMintAmount > 0) {
            if (balance == (apiDataChains + pendingMintAmount)) {
                _mint(pendingUser, pendingMintAmount);  // Mint
                emit TokensMinted(msg.sender, pendingUser, pendingMintAmount);  // Emit event
            } else {
                revert MintConditionNotMet(balance, totalSupply(), pendingMintAmount);
            }

            // Reset variables
            pendingMintAmount = 0;
            pendingUser = address(0);
        }
    }

    // Force transfer tokens between accounts (admin function)
    function forceTransfer(address from, address to, uint256 amount) external onlyAgent notFrozenOrBlacklisted(msg.sender, receiver) {
        require(to != address(0), "Recipient cannot be the zero address");
        require(balanceOf(from) >= amount, "Source address does not have enough tokens");
        _transfer(from, to, amount);
        emit ForceTransferExecuted(from, to, amount);
    }

    // Redeem (burn) tokens from an account
    function redeem(uint256 amount, address recipient) external notFrozenOrBlacklisted(msg.sender, recipient) onlyAgent {
        require(balanceOf(recipient) >= amount, "Not enough tokens to redeem");
        burnFrom(recipient, amount);
        emit RedeemExecuted(recipient, amount, receiver);
    }

    // Freeze a specific account
    function freezeAccount(address user) external onlyAgent {
        frozenAccounts[user] = true;
        emit AccountFrozen(user);
    }

    // Unfreeze a specific account
    function unfreezeAccount(address user) external onlyAgent {
        frozenAccounts[user] = false;
        emit AccountUnfrozen(user);
    }

    // Freeze all token transfers
    function freezeAllTokens() external onlyAgent {
        freezeAll = true;
        emit AllTokensFrozen();
    }

    // Unfreeze all token transfers
    function unfreezeAllTokens() external onlyAgent {
        freezeAll = false;
        emit AllTokensUnfrozen();
    }

    // Add an account to blacklist
    function blacklist(address user) external onlyAgent {
        blacklisted[user] = true;
        emit AccountBlacklisted(user);
    }

    // Remove an account from blacklist
    function removeFromBlacklist(address user) external onlyAgent {
        blacklisted[user] = false;
        emit AccountRemovedFromBlacklist(user);
    }

    // Revoke tokens from a frozen account
    function revoke(address user, uint256 amount) external onlyAgent {
        require(frozenAccounts[user], "Account is not frozen");
        _transfer(user, receiver, amount);
        emit TokensRevoked(user, amount, receiver);
    }

    // Override transfer with additional restrictions
    function transfer(address recipient, uint256 amount) public override notFrozenOrBlacklisted(msg.sender, recipient) returns (bool) {
        require(recipient != address(0), "Recipient cannot be the zero address");
        return super.transfer(recipient, amount);
    }

    // Override transferFrom with additional restrictions
    function transferFrom(address sender, address recipient, uint256 amount) public override notFrozenOrBlacklisted(sender, recipient) returns (bool) {
        require(recipient != address(0), "Recipient cannot be the zero address");
        return super.transferFrom(sender, recipient, amount);
    }

    // Update the receiver address for revoked tokens
    function setReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Receiver cannot be the zero address");
        receiver = _receiver;
        emit SetReceiver();
    }

    // Get the token name
    function name() public view override returns (string memory) {
        return _tokenName;
    }

    // Get the token symbol
    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
    }

    // Burn tokens from the caller's account (only agents can call)
    function burn(uint256 amount) external onlyAgent {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    // Internal function to burn tokens from a specific user's account (only agents can call)
    function burnFrom(address user, uint256 amount) internal onlyAgent {
        _burn(user, amount);
        emit TokensBurned(user, amount);
    }

    // Bridge tokens to another chain by transferring to receiver and burning
    function bridgeCLPD(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Not enough tokens to bridge");
        _transfer(msg.sender, receiver, amount);
        burnFrom(receiver, amount);
        emit TokensBridge(msg.sender, amount, receiver);
    }
}