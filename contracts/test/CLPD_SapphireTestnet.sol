// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "../lib/forge-std/src/Test.sol";
import {CLPD} from "../src/CLPD_SapphireTesnet.sol";

/**
 * To run this contract, copy and paste this command in the terminal:
 * forge test -vvvv --match-path test/CLPD_SapphireTesnet.t.sol
 * 
 * You can view the deployed contract at:
 * https://explorer.oasis.io/testnet/sapphire/address/0xE65d126b56b1BF3Dd1f31057ffC1dabD53465b6e
 */

contract CLPDSapphireTest is Test {
    CLPD public clpd;
    address public owner = address(1);
    address public mainAuditor = address(2);
    address public regularAuditor = address(3);
    address public agent = address(4);
    address public user1 = address(5);
    address public user2 = address(6);

    function setUp() public {
        vm.startPrank(owner);
        clpd = new CLPD();
        clpd.addAgent(agent);
        vm.stopPrank();
    }

    // ---------------------------------------------- Initial Setup tests ----------------------------------------------   
    function testInitialSetup() public {
        assertEq(clpd.name(), "CLPD");
        assertEq(clpd.symbol(), "CLPD");
        assertEq(clpd.mainAuditor(), owner);
        assertEq(clpd.receiver(), owner);
        assertFalse(clpd.freezeAll());
    }

    // ---------------------------------------------- Agent Management tests ----------------------------------------------   
    function testAgentFunctionality() public {
        vm.startPrank(owner);
        address newAgent = address(7);
        
        clpd.addAgent(newAgent);
        assertTrue(clpd.agents(newAgent));
        
        clpd.removeAgent(newAgent);
        assertFalse(clpd.agents(newAgent));
        vm.stopPrank();
    }

    function testNonOwnerAddAgent() public {
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        clpd.addAgent(user2);
    }

    // ---------------------------------------------- Auditor Management tests ----------------------------------------------   
    function testMainAuditorChange() public {
        vm.startPrank(owner);
        
        address newMainAuditor = address(8);
        address oldMainAuditor = clpd.mainAuditor();
        
        clpd.setMainAuditor(newMainAuditor);
        
        assertEq(clpd.mainAuditor(), newMainAuditor);
        assertTrue(clpd.checkAuditorPermissions(newMainAuditor, address(0)));
        
        vm.expectEmit(true, true, false, false);
        emit CLPD.MainAuditorChanged(oldMainAuditor, newMainAuditor);
        
        vm.stopPrank();
    }

    function testAuditorPermissionLifecycle() public {
        vm.startPrank(mainAuditor);
        
        // Grant permission
        address[] memory authorizedAddresses = new address[](2);
        authorizedAddresses[0] = user1;
        authorizedAddresses[1] = user2;
        
        clpd.grantAuditorPermission(regularAuditor, 30 days, false, authorizedAddresses);
        
        // Verify permissions
        assertTrue(clpd.checkAuditorPermissions(regularAuditor, user1));
        assertTrue(clpd.checkAuditorPermissions(regularAuditor, user2));
        assertFalse(clpd.checkAuditorPermissions(regularAuditor, address(9)));
        
        // Revoke permission
        clpd.revokeAuditorPermission(regularAuditor);
        assertFalse(clpd.checkAuditorPermissions(regularAuditor, user1));
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Account Control tests ----------------------------------------------   
    function testFreezeAndUnfreezeAccount() public {
        vm.startPrank(agent);
        
        // Freeze account
        clpd.freezeAccount(user1);
        assertTrue(clpd.frozenAccounts(user1));
        
        // Try transfer from frozen account
        vm.expectRevert("Sender is frozen");
        vm.prank(user1);
        clpd.transfer(user2, 100);
        
        // Unfreeze account
        clpd.unfreezeAccount(user1);
        assertFalse(clpd.frozenAccounts(user1));
        
        vm.stopPrank();
    }

    function testFreezeAllTokens() public {
        vm.startPrank(agent);
        
        clpd.freezeAllTokens();
        assertTrue(clpd.freezeAll());
        
        vm.expectRevert("All transfers are frozen");
        vm.prank(user1);
        clpd.transfer(user2, 100);
        
        clpd.unfreezeAllTokens();
        assertFalse(clpd.freezeAll());
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Blacklist tests ----------------------------------------------   
    function testBlacklistFunctionality() public {
        vm.startPrank(agent);
        
        clpd.blacklist(user1);
        assertTrue(clpd.blacklisted(user1));
        
        vm.expectRevert("Sender is blacklisted");
        vm.prank(user1);
        clpd.transfer(user2, 100);
        
        clpd.removeFromBlacklist(user1);
        assertFalse(clpd.blacklisted(user1));
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Encryption tests ----------------------------------------------   
    function testEncryptedOperations() public {
        vm.startPrank(agent);
        uint256 amount = 1000;
        
        // Test mint encryption
        clpd.mint(user1, amount);
        vm.expectEmit(true, true, true, true);
        emit CLPD.ConfidentialMint(bytes(""));
        
        // Test transfer encryption
        vm.prank(user1);
        clpd.transfer(user2, amount/2);
        vm.expectEmit(true, true, true, true);
        emit CLPD.ConfidentialTransfer(bytes(""));
        
        // Test burn encryption
        clpd.burn(amount/2);
        vm.expectEmit(true, true, true, true);
        emit CLPD.ConfidentialBurn(bytes(""));
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Bridge tests ----------------------------------------------   
    function testBridgeCLPD() public {
        vm.startPrank(agent);
        uint256 amount = 1000;
        
        clpd.mint(user1, amount);
        uint256 initialBalance = clpd.balanceOf(user1);
        
        vm.prank(user1);
        clpd.bridgeCLPD(amount/2);
        
        assertEq(clpd.balanceOf(user1), initialBalance - amount/2);
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Batch Operations tests ----------------------------------------------   
    function testBatchMint() public {
        vm.startPrank(agent);
        
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000;
        amounts[1] = 2000;
        
        clpd.mintBatch(users, amounts);
        
        assertEq(clpd.balanceOf(user1), 1000);
        assertEq(clpd.balanceOf(user2), 2000);
        
        vm.stopPrank();
    }
    // ---------------------------------------------- Decryption tests ----------------------------------------------   
    function testDecryptionAccess() public {
        vm.startPrank(owner);
        clpd.setMainAuditor(mainAuditor);
        
        // Setup regular auditor with limited access
        address[] memory authorizedAddresses = new address[](1);
        authorizedAddresses[0] = user1;
        clpd.grantAuditorPermission(regularAuditor, 30 days, false, authorizedAddresses);
        vm.stopPrank();

        // Perform a transfer to generate encrypted data
        vm.startPrank(agent);
        uint256 amount = 1000;
        clpd.mint(user1, amount);
        vm.stopPrank();

        vm.prank(user1);
        clpd.transfer(user2, 500);

        // Main auditor should be able to decrypt all transactions
        vm.startPrank(mainAuditor);
        (
            address decryptedFrom,
            address decryptedTo,
            uint256 decryptedAmount,
            string memory action,
            uint256 timestamp
        ) = clpd.viewLastDecryptedData();

        assertEq(decryptedFrom, user1, "From address should match");
        assertEq(decryptedTo, user2, "To address should match");
        assertEq(decryptedAmount, 500, "Amount should match");
        assertEq(action, "transfer", "Action should be transfer");
        assertTrue(timestamp > 0, "Timestamp should be set");
        vm.stopPrank();

        // Regular auditor should only see authorized addresses
        vm.startPrank(regularAuditor);
        (decryptedFrom, decryptedTo, decryptedAmount, action, timestamp) = 
            clpd.viewLastDecryptedData();
        
        assertEq(decryptedFrom, user1, "Should see data for authorized address");
        vm.stopPrank();

        // Non-auditor should not be able to decrypt
        vm.prank(user2);
        vm.expectRevert("Not authorized to decrypt");
        clpd.viewLastDecryptedData();
    }

    function testDecryptionWithExpiredPermission() public {
        vm.startPrank(owner);
        clpd.setMainAuditor(mainAuditor);
        
        // Setup regular auditor with short expiry
        address[] memory authorizedAddresses = new address[](1);
        authorizedAddresses[0] = user1;
        clpd.grantAuditorPermission(regularAuditor, 1 days, false, authorizedAddresses);
        vm.stopPrank();

        // Generate some encrypted data
        vm.startPrank(agent);
        clpd.mint(user1, 1000);
        vm.stopPrank();

        // Advance time beyond permission expiry
        vm.warp(block.timestamp + 2 days);

        // Regular auditor should not be able to decrypt after expiry
        vm.startPrank(regularAuditor);
        vm.expectRevert("Permission expired");
        clpd.viewLastDecryptedData();
        vm.stopPrank();
    }

    function testDecryptionAcrossOperations() public {
        vm.startPrank(owner);
        clpd.setMainAuditor(mainAuditor);
        vm.stopPrank();

        // Test mint decryption
        vm.startPrank(agent);
        clpd.mint(user1, 1000);
        vm.stopPrank();

        vm.startPrank(mainAuditor);
        (address decryptedFrom, address decryptedTo, uint256 decryptedAmount, string memory action, uint256 timestamp) = clpd.viewLastDecryptedData();
        assertEq(action, "mint", "Should decrypt mint operation");
        vm.stopPrank();

        // Test burn decryption
        vm.startPrank(agent);
        clpd.burn(500);
        vm.stopPrank();

        vm.startPrank(mainAuditor);
        (decryptedFrom, decryptedTo, decryptedAmount, action, timestamp) = clpd.viewLastDecryptedData();
        assertEq(action, "burn", "Should decrypt burn operation");
        vm.stopPrank();

        // Test bridge decryption
        vm.startPrank(user1);
        clpd.bridgeCLPD(200);
        vm.stopPrank();

        vm.startPrank(mainAuditor);
        (decryptedFrom, decryptedTo, decryptedAmount, action, timestamp) = clpd.viewLastDecryptedData();
        assertEq(action, "bridge", "Should decrypt bridge operation");
        vm.stopPrank();
    }
}