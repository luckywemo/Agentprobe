// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CampaignVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract CampaignVaultTest is Test {
    CampaignVault public vault;
    MockUSDC public usdc;

    address public owner = address(this);
    address public founder = address(0x1111);
    address public agent1 = address(0x2222);
    address public agent2 = address(0x3333);

    uint256 constant DEPOSIT = 1_000_000; // 1 USDC (6 decimals)
    uint256 constant REWARD = 1_000;      // 0.001 USDC

    function setUp() public {
        usdc = new MockUSDC();
        vault = new CampaignVault(address(usdc));

        // Fund founder
        usdc.mint(founder, 10_000_000); // 10 USDC

        // Approve vault to spend founder's USDC
        vm.prank(founder);
        usdc.approve(address(vault), type(uint256).max);
    }

    // --- Campaign Creation ---

    function testCreateCampaign() public {
        vm.prank(founder);
        uint256 id = vault.createCampaign(DEPOSIT, REWARD);

        assertEq(id, 0);
        (address f, uint256 balance, uint256 reward, bool active) = vault.getCampaign(0);
        assertEq(f, founder);
        assertEq(balance, DEPOSIT);
        assertEq(reward, REWARD);
        assertTrue(active);
        assertEq(usdc.balanceOf(address(vault)), DEPOSIT);
    }

    function testCreateMultipleCampaigns() public {
        vm.startPrank(founder);
        uint256 id1 = vault.createCampaign(DEPOSIT, REWARD);
        uint256 id2 = vault.createCampaign(DEPOSIT, REWARD);
        vm.stopPrank();

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(vault.nextCampaignId(), 2);
    }

    function testRevertCreateZeroDeposit() public {
        vm.prank(founder);
        vm.expectRevert("Deposit must be > 0");
        vault.createCampaign(0, REWARD);
    }

    function testRevertCreateZeroReward() public {
        vm.prank(founder);
        vm.expectRevert("Reward must be > 0");
        vault.createCampaign(DEPOSIT, 0);
    }

    function testRevertCreateDepositLessThanReward() public {
        vm.prank(founder);
        vm.expectRevert("Deposit must cover >= 1 task");
        vault.createCampaign(500, 1000);
    }

    // --- Payouts ---

    function testPayout() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        bytes32 subId = keccak256("submission-1");
        vault.payout(0, agent1, subId);

        assertEq(usdc.balanceOf(agent1), REWARD);
        (, uint256 balance,,) = vault.getCampaign(0);
        assertEq(balance, DEPOSIT - REWARD);
        assertTrue(vault.isSubmissionPaid(subId));
    }

    function testPayoutMultipleAgents() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        vault.payout(0, agent1, keccak256("sub-1"));
        vault.payout(0, agent2, keccak256("sub-2"));

        assertEq(usdc.balanceOf(agent1), REWARD);
        assertEq(usdc.balanceOf(agent2), REWARD);
        (, uint256 balance,,) = vault.getCampaign(0);
        assertEq(balance, DEPOSIT - REWARD * 2);
    }

    function testRevertPayoutNonOwner() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        vm.prank(agent1);
        vm.expectRevert();
        vault.payout(0, agent1, keccak256("sub-1"));
    }

    function testRevertPayoutDoublePay() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        bytes32 subId = keccak256("sub-1");
        vault.payout(0, agent1, subId);

        vm.expectRevert("Submission already paid");
        vault.payout(0, agent1, subId);
    }

    function testRevertPayoutInactiveCampaign() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        vm.prank(founder);
        vault.closeCampaign(0);

        vm.expectRevert("Campaign not active");
        vault.payout(0, agent1, keccak256("sub-1"));
    }

    function testRevertPayoutInsufficientBalance() public {
        vm.prank(founder);
        vault.createCampaign(REWARD, REWARD); // exactly 1 task worth

        vault.payout(0, agent1, keccak256("sub-1"));

        vm.expectRevert("Insufficient campaign balance");
        vault.payout(0, agent2, keccak256("sub-2"));
    }

    // --- Close Campaign ---

    function testCloseCampaign() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        uint256 balanceBefore = usdc.balanceOf(founder);

        vm.prank(founder);
        vault.closeCampaign(0);

        (,, , bool active) = vault.getCampaign(0);
        assertFalse(active);
        assertEq(usdc.balanceOf(founder), balanceBefore + DEPOSIT);
    }

    function testCloseCampaignAfterPayouts() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        // Pay 2 agents
        vault.payout(0, agent1, keccak256("sub-1"));
        vault.payout(0, agent2, keccak256("sub-2"));

        uint256 balanceBefore = usdc.balanceOf(founder);
        uint256 expectedRefund = DEPOSIT - REWARD * 2;

        vm.prank(founder);
        vault.closeCampaign(0);

        assertEq(usdc.balanceOf(founder), balanceBefore + expectedRefund);
    }

    function testRevertCloseNonFounder() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        vm.prank(agent1);
        vm.expectRevert("Only founder can close");
        vault.closeCampaign(0);
    }

    function testRevertCloseAlreadyClosed() public {
        vm.prank(founder);
        vault.createCampaign(DEPOSIT, REWARD);

        vm.prank(founder);
        vault.closeCampaign(0);

        vm.prank(founder);
        vm.expectRevert("Campaign already closed");
        vault.closeCampaign(0);
    }
}
