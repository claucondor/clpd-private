// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./erc20p.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@oasisprotocol/sapphire-contracts/contracts/Sapphire.sol";

contract CLPD is ERC20P, Ownable {
    // Constants
    bytes32 private immutable ENCRYPTION_SALT;
    bytes32 private immutable CONTRACT_SECRET;

    // State variables
    address public mainAuditor;
    address public receiver;
    bool private canMint;
    uint256 private apiDataBank;
    uint256 private apiDataChains;
    bool public freezeAll;
    // Token name storage
    string private _tokenName;
    // Token symbol storage  
    string private _tokenSymbol;

    // Batch minting variables
    address[] private pendingUsers;
    uint256[] private pendingAmounts; 
    uint256 private pendingMintAmount;
    address private pendingUser;

    // Structs
    // Stores permissions for auditors including expiry time, access level and authorized addresses
    struct AuditorPermission {
        uint256 expiryTime;
        bool hasFullAccess;
        bool isActive;
        mapping(address => bool) authorizedAddresses;
    }

    // Stores decrypted transaction data for auditing purposes
    struct DecryptedData {
        address from;
        address to;
        uint256 amount;
        string action;
        uint256 timestamp;
        bool exists;
    }

    // Mappings
    mapping(address => bool) public agents; // Tracks authorized agents
    mapping(address => bool) public blacklisted; // Tracks blacklisted addresses
    mapping(address => bool) public frozenAccounts; // Tracks frozen accounts
    mapping(address => AuditorPermission) public auditorPermissions; // Stores auditor permissions
    mapping(address => DecryptedData) private lastDecryptedData; // Stores last decrypted data per address

    // Custom errors
    error InvalidDecryption();
    error MintConditionNotMet(
        uint256 balance,
        uint256 totalSupply,
        uint256 mintAmount
    );
    error PermissionExpired();
    error UnauthorizedAccess();

    // Events
    event AccountBlacklisted(address indexed user);
    event AccountFrozen(address indexed user);
    event AccountRemovedFromBlacklist(address indexed user);
    event AccountUnfrozen(address indexed user);
    event AllTokensFrozen();
    event AllTokensUnfrozen();
    event ApiDataUpdated(uint256 bankBalance, uint256 chainsSupply);
    event AuditorAddressPermissionUpdated(
        address indexed auditor,
        address indexed targetAddress,
        bool canAccess
    );
    event AuditorPermissionGranted(
        address indexed auditor,
        uint256 expiryTime,
        bool fullAccess,
        address[] authorizedAddresses
    );
    event AuditorPermissionRevoked(address indexed auditor);
    event BatchMintCompleted(
        address[] users,
        uint256[] amounts,
        uint256 totalAmount
    );
    event ConfidentialBurn(bytes encryptedData);
    event ConfidentialMint(bytes encryptedData);
    event ConfidentialTransfer(bytes encryptedData);

    event MainAuditorChanged(
        address indexed oldAuditor,
        address indexed newAuditor
    );

    event TokensRevoked(address indexed user, uint256 amount, address receiver);

    // Initialize contract with token name, symbol and generate encryption keys
    constructor() ERC20P("_tokenName", "_tokenSymbol") Ownable() {
        _tokenName = "CLPD";
        _tokenSymbol = "CLPD";

        bytes memory randomness = Sapphire.randomBytes(64, "CLPD_INIT");

        bytes memory firstHalf = new bytes(32);
        bytes memory secondHalf = new bytes(32);

        for (uint i = 0; i < 32; i++) {
            firstHalf[i] = randomness[i];
            secondHalf[i] = randomness[i + 32];
        }

        ENCRYPTION_SALT = bytes32(firstHalf);
        CONTRACT_SECRET = bytes32(secondHalf);
        mainAuditor = msg.sender;
        receiver = msg.sender;
        canMint = true;
    }

    // Modifiers
    // Checks if addresses are not frozen or blacklisted
    modifier notFrozenOrBlacklisted(address _from, address _to) {
        require(!freezeAll, "All transfers are frozen");
        require(!frozenAccounts[_from], "Sender is frozen");
        require(!frozenAccounts[_to], "Recipient is frozen");
        require(!blacklisted[_from], "Sender is blacklisted");
        require(!blacklisted[_to], "Recipient is blacklisted");
        _;
    }

    // Restricts function access to authorized agents only
    modifier onlyAgent() {
        require(agents[msg.sender], "Only agents can execute this function");
        _;
    }

    // Agent management functions
    function addAgent(address agent) external onlyOwner {
        agents[agent] = true;
    }

    function removeAgent(address agent) external onlyOwner {
        agents[agent] = false;
    }

    // Validates auditor permissions for a specific address
    function checkAuditorPermissions(
        address _auditor,
        address _targetAddress
    ) public view onlyAgent returns (bool) {
        if (_auditor == mainAuditor) {
            return true;
        }
        AuditorPermission storage permission = auditorPermissions[_auditor];
        if (!permission.isActive || block.timestamp > permission.expiryTime) {
            return false;
        }
        if (permission.hasFullAccess) {
            return true;
        }
        return permission.authorizedAddresses[_targetAddress];
    }

    // Auditor management functions
    // Grants permissions to an auditor with specified access level and duration
    function grantAuditorPermission(
        address _auditor,
        uint256 _duration,
        bool _fullAccess,
        address[] calldata _authorizedAddresses
    ) external onlyAgent {
        require(
            msg.sender == mainAuditor,
            "Only main auditor can grant permissions"
        );
        require(_auditor != address(0), "Invalid auditor address");
        require(_duration > 0 && _duration <= 30 days, "Invalid duration");

        AuditorPermission storage permission = auditorPermissions[_auditor];
        permission.expiryTime = block.timestamp + _duration;
        permission.hasFullAccess = _fullAccess;
        if (!_fullAccess) {
            for (uint i = 0; i < _authorizedAddresses.length; i++) {
                permission.authorizedAddresses[_authorizedAddresses[i]] = true;
            }
        }
        emit AuditorPermissionGranted(
            _auditor,
            permission.expiryTime,
            _fullAccess,
            _authorizedAddresses
        );
    }

    // Revokes all permissions from an auditor
    function revokeAuditorPermission(address auditor) external onlyAgent {
        require(
            msg.sender == mainAuditor,
            "Only main auditor can revoke permissions"
        );
        delete auditorPermissions[auditor];
        emit AuditorPermissionRevoked(auditor);
    }

    // Changes the main auditor address
    function setMainAuditor(address _newAuditor) external onlyAgent {
        require(_newAuditor != address(0), "Invalid auditor address");
        address oldAuditor = mainAuditor;
        mainAuditor = _newAuditor;
        emit MainAuditorChanged(oldAuditor, _newAuditor);
    }

    // Updates permission for a specific address that an auditor can access
    function updateAuditorAddressPermission(
        address auditor,
        address targetAddress,
        bool canAccess
    ) external onlyAgent {
        require(
            msg.sender == mainAuditor,
            "Only main auditor can update permissions"
        );
        require(
            !auditorPermissions[auditor].hasFullAccess,
            "Auditor has full access"
        );
        auditorPermissions[auditor].authorizedAddresses[
            targetAddress
        ] = canAccess;
        emit AuditorAddressPermissionUpdated(auditor, targetAddress, canAccess);
    }

    // Decryption functions
    // Processes encrypted transaction data and stores decrypted result
    function processDecryption(
        bytes memory encryptedData
    ) public returns (bool) {
        bytes memory decryptedData = Sapphire.decrypt(
            ENCRYPTION_SALT,
            CONTRACT_SECRET,
            encryptedData,
            abi.encode(address(this))
        );

        (
            address decryptedFrom,
            address decryptedTo,
            uint256 amount,
            string memory action,
            uint256 timestamp
        ) = abi.decode(
                decryptedData,
                (address, address, uint256, string, uint256)
            );

        bool isAuthorized = msg.sender == decryptedFrom ||
            msg.sender == decryptedTo ||
            msg.sender == mainAuditor ||
            checkAuditorPermissions(msg.sender, decryptedFrom) ||
            checkAuditorPermissions(msg.sender, decryptedTo);

        require(isAuthorized, "Not authorized to decrypt this transaction");

        lastDecryptedData[msg.sender] = DecryptedData(
            decryptedFrom,
            decryptedTo,
            amount,
            action,
            timestamp,
            true
        );
        return true;
    }

    // Returns the last decrypted data for the caller
    function viewLastDecryptedData()
        public
        view
        returns (
            address decryptedFrom,
            address decryptedTo,
            uint256 amount,
            string memory action,
            uint256 timestamp
        )
    {
        require(
            lastDecryptedData[msg.sender].exists,
            "No decrypted data available"
        );
        DecryptedData memory data = lastDecryptedData[msg.sender];
        return (data.from, data.to, data.amount, data.action, data.timestamp);
    }

    // Clears decrypted data for the caller
    function clearLastDecryptedData() external onlyOwner {
        delete lastDecryptedData[msg.sender];
    }

    // Encrypts transaction data using Sapphire encryption
    function encryptTransactionData(
        address from,
        address to,
        uint256 amount,
        string memory action
    ) internal view returns (bytes memory) {
        bytes memory plaintext = abi.encode(
            from,
            to,
            amount,
            action,
            block.timestamp
        );

        bytes memory additionalData = abi.encode(address(this));

        bytes memory encryptedData = Sapphire.encrypt(
            ENCRYPTION_SALT,
            CONTRACT_SECRET,
            plaintext,
            additionalData
        );

        return encryptedData;
    }

    // Utility functions
    // Estimates gas cost for a transfer
    function estimateTransferGas(
        address to,
        uint256 amount
    ) external view returns (uint64) {
        uint64 startGas = Sapphire.gasUsed();
        encryptTransactionData(msg.sender, to, amount, "transfer");
        uint64 endGas = Sapphire.gasUsed();
        return endGas - startGas;
    }

    // Updates API data and determines if minting is allowed
    function updateApiData(
        uint256 bankBalance,
        uint256 chainsSupply
    ) external onlyAgent {
        apiDataBank = bankBalance;
        apiDataChains = chainsSupply;

        if (apiDataChains < apiDataBank) {
            canMint = true;
        } else {
            canMint = false;
        }

        emit ApiDataUpdated(bankBalance, chainsSupply);
    }

    // Minting functions
    // Mints tokens to a single user
    function mint(address user, uint256 amount) external onlyAgent {
        require(canMint, "You can not mint");
        require(
            !frozenAccounts[user] && !blacklisted[user],
            "User is frozen or blacklisted"
        );
        require(!freezeAll, "Token minting is frozen");
        pendingMintAmount = amount;
        pendingUser = user;
        mintTokens();
    }

    // Mints tokens to multiple users in a batch
    function mintBatch(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyAgent {
        require(canMint, "You can not mint");
        require(
            users.length == amounts.length,
            "Users and amounts length mismatch"
        );
        require(!freezeAll, "Token minting is frozen");

        for (uint256 i = 0; i < users.length; i++) {
            require(
                !frozenAccounts[users[i]] && !blacklisted[users[i]],
                "User is frozen or blacklisted"
            );
        }

        pendingUsers = users;
        pendingAmounts = amounts;
        mintTokens();
    }

    // Internal function to process pending mints
    function mintTokens() internal {
        uint256 balance = apiDataBank * 10 ** 18;
        // Handle batch minting
        if (pendingUsers.length > 0) {
            uint256 totalMintAmount = 0;
            for (uint256 i = 0; i < pendingAmounts.length; i++) {
                totalMintAmount += pendingAmounts[i];
            }

            // Verify total supply matches expected balance
            if (balance == (apiDataChains + totalMintAmount)) {
                for (uint256 i = 0; i < pendingUsers.length; i++) {
                    _mint(pendingUsers[i], pendingAmounts[i]);
                    bytes memory encryptedData = encryptTransactionData(
                        address(0),
                        pendingUsers[i],
                        pendingAmounts[i],
                        "batchMint"
                    );
                    emit ConfidentialMint(encryptedData);
                }
            } else {
                revert MintConditionNotMet(
                    balance,
                    totalSupply(),
                    pendingMintAmount
                );
            }

            delete pendingUsers;
            delete pendingAmounts;
        }
        // Handle single mint
        else if (pendingMintAmount > 0) {
            if (balance == (apiDataChains + pendingMintAmount)) {
                _mint(pendingUser, pendingMintAmount);
                bytes memory encryptedData = encryptTransactionData(
                    address(0),
                    pendingUser,
                    pendingMintAmount,
                    "mint"
                );
                emit ConfidentialMint(encryptedData);
            } else {
                revert MintConditionNotMet(
                    balance,
                    totalSupply(),
                    pendingMintAmount
                );
            }

            pendingMintAmount = 0;
            pendingUser = address(0);
        }
    }

    // Forces a transfer between accounts (agent only)
    function forceTransfer(
        address from,
        address to,
        uint256 amount
    ) external onlyAgent notFrozenOrBlacklisted(msg.sender, receiver) {
        require(to != address(0), "Recipient cannot be the zero address");
        require(
            balanceOf(from) >= amount,
            "Source address does not have enough tokens"
        );

        bytes memory encryptedData = encryptTransactionData(
            from,
            to,
            amount,
            "forceTransfer"
        );

        _transfer(from, to, amount);

        emit ConfidentialTransfer(encryptedData);
    }

    // Redeems (burns) tokens from an account
    function redeem(
        uint256 amount,
        address recipient
    ) external notFrozenOrBlacklisted(msg.sender, recipient) onlyAgent {
        require(recipient != address(0), "Recipient cannot be zero address");
        require(balanceOf(recipient) >= amount, "Not enough tokens to redeem");

        bytes memory encryptedDataRedeem = encryptTransactionData(
            recipient,
            address(0),
            amount,
            "redeem"
        );

        _burn(recipient, amount);

        emit ConfidentialBurn(encryptedDataRedeem);
    }

    // Account control functions
    function freezeAccount(address user) external onlyAgent {
        frozenAccounts[user] = true;
        emit AccountFrozen(user);
    }

    function unfreezeAccount(address user) external onlyAgent {
        frozenAccounts[user] = false;
        emit AccountUnfrozen(user);
    }

    function freezeAllTokens() external onlyAgent {
        freezeAll = true;
        emit AllTokensFrozen();
    }

    function unfreezeAllTokens() external onlyAgent {
        freezeAll = false;
        emit AllTokensUnfrozen();
    }

    // Blacklist management functions
    function blacklist(address user) external onlyAgent {
        blacklisted[user] = true;
        emit AccountBlacklisted(user);
    }

    function removeFromBlacklist(address user) external onlyAgent {
        blacklisted[user] = false;
        emit AccountRemovedFromBlacklist(user);
    }

    // Revokes tokens from a frozen account
    function revoke(address user, uint256 amount) external onlyAgent {
        require(frozenAccounts[user], "Account is not frozen");

        bytes memory encryptedData = encryptTransactionData(
            user,
            receiver,
            amount,
            "revoke"
        );

        _transfer(user, receiver, amount);

        emit ConfidentialTransfer(encryptedData);
        emit TokensRevoked(user, amount, receiver);
    }

    // Transfer functions
    // Standard transfer with confidential logging
    function transfer(
        address to,
        uint256 amount
    )
        public
        virtual
        override
        notFrozenOrBlacklisted(msg.sender, to)
        returns (bool)
    {
        bytes memory encryptedData = encryptTransactionData(
            msg.sender,
            to,
            amount,
            "transfer"
        );

        bool success = super.transfer(to, amount);
        if (success) {
            emit ConfidentialTransfer(encryptedData);
        }
        return success;
    }

    // Transfer from with confidential logging
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override notFrozenOrBlacklisted(from, to) returns (bool) {
        bytes memory encryptedData = encryptTransactionData(
            from,
            to,
            amount,
            "transferFrom"
        );

        bool success = super.transferFrom(from, to, amount);
        if (success) {
            emit ConfidentialTransfer(encryptedData);
        }
        return success;
    }

    // Sets the receiver address for revoked tokens
    function setReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Invalid receiver address");
        receiver = _receiver;
    }

    // Token metadata functions
    function name() public view override returns (string memory) {
        return _tokenName;
    }

    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
    }

    // Burn functions
    // Burns tokens from caller's account
    function burn(uint256 amount) external onlyAgent {
        require(
            !frozenAccounts[msg.sender] && !blacklisted[msg.sender],
            "Account restricted"
        );

        bytes memory encryptedData = encryptTransactionData(
            msg.sender,
            address(0),
            amount,
            "burn"
        );

        _burn(msg.sender, amount);

        emit ConfidentialBurn(encryptedData);
    }

    // Burns tokens from a specific user's account (internal)
    function burnFrom(address user, uint256 amount) internal onlyAgent {
        bytes memory encryptedData = encryptTransactionData(
            msg.sender,
            address(0),
            amount,
            "burn"
        );
        _burn(user, amount);
        emit ConfidentialBurn(encryptedData);
    }

    // Bridge function to transfer and burn tokens
    function bridgeCLPD(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Not enough tokens to bridge");

        bytes memory encryptedData = encryptTransactionData(
            msg.sender,
            receiver,
            amount,
            "bridge"
        );

        _transfer(msg.sender, receiver, amount);
        _burn(receiver, amount);

        emit ConfidentialTransfer(encryptedData);
    }
}
