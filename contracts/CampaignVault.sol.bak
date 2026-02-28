// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CampaignVault
/// @notice Holds USDC deposits for testing campaigns and pays agents for validated submissions
/// @dev Only the contract owner (backend wallet) can trigger payouts after offchain validation
contract CampaignVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    struct Campaign {
        address founder;
        uint256 balance;
        uint256 rewardPerTask;
        bool active;
    }

    uint256 public nextCampaignId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(bytes32 => bool) public paidSubmissions;

    // --- Events ---
    event CampaignCreated(
        uint256 indexed id,
        address indexed founder,
        uint256 deposit,
        uint256 rewardPerTask
    );

    event Payout(
        uint256 indexed campaignId,
        address indexed agent,
        uint256 amount,
        bytes32 submissionId
    );

    event CampaignClosed(uint256 indexed id, uint256 refunded);

    // --- Constructor ---
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    // --- Campaign Management ---

    /// @notice Create a new campaign and deposit USDC
    /// @param deposit Amount of USDC to deposit (6 decimals)
    /// @param rewardPerTask USDC reward per validated task (6 decimals)
    /// @return campaignId The ID of the created campaign
    function createCampaign(
        uint256 deposit,
        uint256 rewardPerTask
    ) external returns (uint256 campaignId) {
        require(deposit > 0, "Deposit must be > 0");
        require(rewardPerTask > 0, "Reward must be > 0");
        require(deposit >= rewardPerTask, "Deposit must cover >= 1 task");

        usdc.safeTransferFrom(msg.sender, address(this), deposit);

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            founder: msg.sender,
            balance: deposit,
            rewardPerTask: rewardPerTask,
            active: true
        });

        emit CampaignCreated(campaignId, msg.sender, deposit, rewardPerTask);
    }

    /// @notice Pay an agent for a validated task submission
    /// @dev Only callable by the contract owner (backend)
    /// @param campaignId The campaign ID
    /// @param agent The agent's wallet address
    /// @param submissionId Unique hash for this submission (prevents double-pay)
    function payout(
        uint256 campaignId,
        address agent,
        bytes32 submissionId
    ) external onlyOwner {
        require(agent != address(0), "Invalid agent address");
        
        Campaign storage c = campaigns[campaignId];
        require(c.active, "Campaign not active");
        require(c.balance >= c.rewardPerTask, "Insufficient campaign balance");
        require(!paidSubmissions[submissionId], "Submission already paid");

        paidSubmissions[submissionId] = true;
        c.balance -= c.rewardPerTask;

        usdc.safeTransfer(agent, c.rewardPerTask);

        emit Payout(campaignId, agent, c.rewardPerTask, submissionId);
    }

    /// @notice Close a campaign and refund remaining USDC to the founder
    /// @param campaignId The campaign ID to close
    function closeCampaign(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        require(msg.sender == c.founder, "Only founder can close");
        require(c.active, "Campaign already closed");

        c.active = false;
        uint256 refund = c.balance;
        c.balance = 0;

        if (refund > 0) {
            usdc.safeTransfer(c.founder, refund);
        }

        emit CampaignClosed(campaignId, refund);
    }

    // --- View Functions ---

    /// @notice Get campaign details
    function getCampaign(uint256 campaignId) external view returns (
        address founder,
        uint256 balance,
        uint256 rewardPerTask,
        bool active
    ) {
        Campaign storage c = campaigns[campaignId];
        return (c.founder, c.balance, c.rewardPerTask, c.active);
    }

    /// @notice Check if a submission has been paid
    function isSubmissionPaid(bytes32 submissionId) external view returns (bool) {
        return paidSubmissions[submissionId];
    }
}
