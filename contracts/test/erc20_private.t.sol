// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC20Private} from "../src/ERC20Private.sol";

/**
 * To run this contract, copy and paste this command in the terminal:
 * forge test -vvvv --match-path test/erc20_private.t.sol
 */

contract ERC20PrivateTest is Test {
    ERC20Private private token;
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    function setUp() public {
        vm.prank(owner);
        token = new ERC20Private();
    }

    // ---------------------------------------------- Initial Setup tests ----------------------------------------------   
    function testInitialSetup() public {
        assertEq(token.totalSupply(), 0, "Initial supply should be 0");
        assertEq(token.owner(), owner, "Owner should be set correctly");
    }

    // ---------------------------------------------- Minting tests ----------------------------------------------   
    function testMinting() public {
        vm.startPrank(owner);
        
        uint256 mintAmount = 1000;
        token.mint(user1, mintAmount);
        
        assertEq(token.balanceOf(user1), mintAmount, "Balance should match minted amount");
        assertEq(token.totalSupply(), mintAmount, "Total supply should match minted amount");
        
        vm.stopPrank();
    }

    function testMintByNonOwner() public {
        vm.startPrank(user1);
        
        uint256 mintAmount = 1000;
        vm.expectRevert("Ownable: caller is not the owner");
        token.mint(user1, mintAmount);
        
        assertEq(token.balanceOf(user1), 0, "Non-owner should not be able to mint");
        assertEq(token.totalSupply(), 0, "Total supply should remain unchanged");
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Transfer tests ----------------------------------------------   
    function testTransferBetweenUsers() public {
        // Setup initial balance
        vm.prank(owner);
        token.mint(user1, 1000);
        
        uint256 transferAmount = 500;
        uint256 initialBalanceUser1 = token.balanceOf(user1);
        uint256 initialBalanceUser2 = token.balanceOf(user2);
        
        // Perform transfer
        vm.prank(user1);
        token.transfer(user2, transferAmount);
        
        // Verify balances
        assertEq(token.balanceOf(user1), initialBalanceUser1 - transferAmount, "Sender balance should decrease");
        assertEq(token.balanceOf(user2), initialBalanceUser2 + transferAmount, "Receiver balance should increase");
    }

    function testTransferInsufficientBalance() public {
        vm.startPrank(user1);
        
        uint256 transferAmount = 500;
        vm.expectRevert("ERC20: transfer amount exceeds balance");
        token.transfer(user2, transferAmount);
        
        assertEq(token.balanceOf(user1), 0, "Balance should remain unchanged");
        assertEq(token.balanceOf(user2), 0, "Recipient should not receive tokens");
        
        vm.stopPrank();
    }

    // ---------------------------------------------- Approval tests ----------------------------------------------   
    function testApproveAndTransferFrom() public {
        // Setup initial balance
        vm.prank(owner);
        token.mint(user1, 1000);
        
        uint256 approvalAmount = 500;
        
        // Approve spending
        vm.prank(user1);
        token.approve(user2, approvalAmount);
        
        // Transfer using allowance
        vm.prank(user2);
        token.transferFrom(user1, user2, approvalAmount);
        
        assertEq(token.balanceOf(user1), 500, "Sender balance should decrease");
        assertEq(token.balanceOf(user2), 500, "Receiver balance should increase");
        assertEq(token.allowance(user1, user2), 0, "Allowance should be consumed");
    }
}