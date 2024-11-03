# CLPD Smart Contract System

A comprehensive token and bridge system built on Ethereum, featuring privacy-focused implementations for Sapphire and Base networks.

## Overview

The CLPD system consists of multiple smart contracts that work together to provide:
- ERC20 token functionality with enhanced privacy features
- Cross-chain bridge capabilities
- Oracle integration for data verification
- Advanced access control and security features

## Core Components

### 1. CLPD Token Contracts
- **CLPD_BaseSepolia.sol**: Implementation for Base Sepolia testnet
- **CLPD_SapphireTestnet.sol**: Implementation for Sapphire testnet
- **CLPD_SapphireMainnet.sol**: Implementation for Sapphire mainnet
- **ROFL_CLPD.sol**: ROFL-integrated implementation with oracle connectivity

Key features:
- ERC20 standard compliance
- Minting and burning capabilities
- Account freezing and blacklisting
- Role-based access control
- Bridge functionality

### 2. Oracle System
**ROFL_Oracle.sol**: Provides secure data feeds for:
- Total supply across chains
- Bank balances
- Chain-specific data validation

### 3. Privacy Layer
**erc20_private.sol**: Enhanced ERC20 implementation with:
- Privacy-preserving transfers
- Confidential balance management
- Secure allowance system

## Security Features

- Role-based access control with owner and agent roles
- Account freezing capabilities
- Blacklisting system
- Global freeze functionality
- Secure bridge operations
- Oracle-validated minting

## Key Functions

### Token Management
```solidity
function mint(address user, uint256 amount)
function mintBatch(address[] users, uint256[] amounts)
function burn(uint256 amount)
function bridgeCLPD(uint256 amount)
```

### Access Control
```solidity
function addAgent(address agent)
function freezeAccount(address user)
function blacklist(address user)
```

### Oracle Integration
```solidity
function verifyValueAPI()
function updateVaultData()
```

## Deployment

### Prerequisites
- Node.js and npm installed
- Foundry toolkit installed
- Access to target network RPC endpoints

### Steps
1. Install dependencies:
```bash
forge install
```

2. Compile contracts:
```bash
forge build
```

3. Deploy to desired network:
```bash
forge script scripts/Deploy<ContractName>.s.sol --rpc-url <RPC_URL> --broadcast
```

## Testing

Run comprehensive test suite:
```bash
# All tests
forge test

# Specific contract tests
forge test -vvvv --match-path test/CLPD_SapphireTestnet.t.sol
forge test -vvvv --match-path test/CLPD_BaseSepolia.t.sol
```

## Networks and Deployments

### Sapphire Testnet
- CLPD Token: [View on Explorer](https://explorer.oasis.io/testnet/sapphire/address/0xE65d126b56b1BF3Dd1f31057ffC1dabD53465b6e)
- CLPD Token ROFL: [View on Explorer](https://explorer.oasis.io/testnet/sapphire/address/0xd28eb2D29964127D102cD0047A1fee319B328Bca)
- Oracle ROFL: [View on Explorer](https://explorer.oasis.io/testnet/sapphire/address/0xEdDa5130fD503445AB7c4520DA7ef1b55Be0372A)

### Base Sepolia
- CLPD Token: [View on Explorer](https://sepolia.basescan.org/address/0x23bbF7198Db6FCC09D0dee02678b7d60176facC6)

## Security Considerations

1. **Access Control**
   - Strict role-based permissions
   - Multi-level security checks

2. **Cross-chain Operations**
   - Oracle-validated data
   - Secure bridge mechanisms

3. **Privacy Features**
   - Confidential transactions
   - Protected user data

## License

MIT License - see LICENSE file for details