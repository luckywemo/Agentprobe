import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CampaignVault", function () {
    async function deployVaultFixture() {
        const [owner, founder, agent1, agent2] = await ethers.getSigners();

        // Deploy Mock USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        const usdc = await MockUSDC.deploy();

        // Deploy CampaignVault
        const CampaignVault = await ethers.getContractFactory("CampaignVault");
        const vault = await CampaignVault.deploy(await usdc.getAddress());

        // Mint USDC to founder
        const DEPOSIT_AMOUNT = ethers.parseUnits("10", 6); // 10 USDC
        await usdc.mint(founder.address, DEPOSIT_AMOUNT);
        await usdc.connect(founder).approve(await vault.getAddress(), ethers.MaxUint256);

        return { vault, usdc, owner, founder, agent1, agent2 };
    }

    describe("Deployment", function () {
        it("Should set the correct USDC address", async function () {
            const { vault, usdc } = await loadFixture(deployVaultFixture);
            expect(await vault.usdc()).to.equal(await usdc.getAddress());
        });

        it("Should set the correct owner", async function () {
            const { vault, owner } = await loadFixture(deployVaultFixture);
            expect(await vault.owner()).to.equal(owner.address);
        });
    });

    describe("Campaign Creation", function () {
        it("Should create a campaign successfully", async function () {
            const { vault, usdc, founder } = await loadFixture(deployVaultFixture);
            const deposit = ethers.parseUnits("1", 6);
            const reward = ethers.parseUnits("0.001", 6);

            await expect(vault.connect(founder).createCampaign(deposit, reward))
                .to.emit(vault, "CampaignCreated")
                .withArgs(0, founder.address, deposit, reward);

            const campaign = await vault.getCampaign(0);
            expect(campaign.founder).to.equal(founder.address);
            expect(campaign.balance).to.equal(deposit);
            expect(campaign.rewardPerTask).to.equal(reward);
            expect(campaign.active).to.be.true;

            expect(await usdc.balanceOf(await vault.getAddress())).to.equal(deposit);
        });

        it("Should fail if deposit is zero", async function () {
            const { vault, founder } = await loadFixture(deployVaultFixture);
            await expect(vault.connect(founder).createCampaign(0, 100))
                .to.be.revertedWith("Deposit must be > 0");
        });
    });

    describe("Payouts", function () {
        it("Should process payout correctly", async function () {
            const { vault, usdc, founder, agent1 } = await loadFixture(deployVaultFixture);
            const deposit = ethers.parseUnits("1", 6);
            const reward = ethers.parseUnits("0.001", 6);
            await vault.connect(founder).createCampaign(deposit, reward);

            const submissionId = ethers.keccak256(ethers.toUtf8Bytes("submission-1"));

            await expect(vault.payout(0, agent1.address, submissionId))
                .to.emit(vault, "Payout")
                .withArgs(0, agent1.address, reward, submissionId);

            expect(await usdc.balanceOf(agent1.address)).to.equal(reward);
            const campaign = await vault.getCampaign(0);
            expect(campaign.balance).to.equal(deposit - reward);
            expect(await vault.isSubmissionPaid(submissionId)).to.be.true;
        });

        it("Should fail payout if not owner", async function () {
            const { vault, founder, agent1 } = await loadFixture(deployVaultFixture);
            const deposit = ethers.parseUnits("1", 6);
            const reward = ethers.parseUnits("0.001", 6);
            await vault.connect(founder).createCampaign(deposit, reward);

            const submissionId = ethers.keccak256(ethers.toUtf8Bytes("sub-1"));
            await expect(vault.connect(founder).payout(0, agent1.address, submissionId))
                .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });

        it("Should fail if double paying", async function () {
            const { vault, founder, agent1 } = await loadFixture(deployVaultFixture);
            await vault.connect(founder).createCampaign(ethers.parseUnits("1", 6), ethers.parseUnits("0.001", 6));

            const submissionId = ethers.keccak256(ethers.toUtf8Bytes("sub-1"));
            await vault.payout(0, agent1.address, submissionId);

            await expect(vault.payout(0, agent1.address, submissionId))
                .to.be.revertedWith("Submission already paid");
        });
    });

    describe("Closing Campaign", function () {
        it("Should close campaign and refund founder", async function () {
            const { vault, usdc, founder } = await loadFixture(deployVaultFixture);
            const deposit = ethers.parseUnits("1", 6);
            await vault.connect(founder).createCampaign(deposit, ethers.parseUnits("0.001", 6));

            const initialFounderBalance = await usdc.balanceOf(founder.address);

            await expect(vault.connect(founder).closeCampaign(0))
                .to.emit(vault, "CampaignClosed")
                .withArgs(0, deposit);

            const campaign = await vault.getCampaign(0);
            expect(campaign.active).to.be.false;
            expect(campaign.balance).to.equal(0);
            expect(await usdc.balanceOf(founder.address)).to.equal(initialFounderBalance + deposit);
        });

        it("Should fail if not founder", async function () {
            const { vault, founder, agent1 } = await loadFixture(deployVaultFixture);
            await vault.connect(founder).createCampaign(ethers.parseUnits("1", 6), ethers.parseUnits("0.001", 6));

            await expect(vault.connect(agent1).closeCampaign(0))
                .to.be.revertedWith("Only founder can close");
        });
    });
});
