const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting deployment of CampaignVault...");

    // Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    const network = hre.network.name;
    let usdcAddress;

    if (network === "base-mainnet") {
        usdcAddress = BASE_USDC;
    } else if (network === "base-sepolia") {
        usdcAddress = BASE_SEPOLIA_USDC;
    } else {
        // Default to a mock or Sepolia for other networks/localhost
        console.log("⚠️  Non-Base network detected. Defaulting to Base Sepolia USDC address.");
        usdcAddress = BASE_SEPOLIA_USDC;
    }

    console.log(`📡 Network: ${network}`);
    console.log(`💎 USDC Address: ${usdcAddress}`);

    const CampaignVault = await hre.ethers.getContractFactory("CampaignVault");
    const vault = await CampaignVault.deploy(usdcAddress);

    await vault.waitForDeployment();

    const vaultAddress = await vault.getAddress();

    console.log("\n✅ CampaignVault deployed to:", vaultAddress);
    console.log("🔗 View on Explorer:", `${hre.network.config.browserURL}/address/${vaultAddress}`);

    console.log("\nNext Steps:");
    console.log(`1. Update NEXT_PUBLIC_CAMPAIGN_VAULT_ADDRESS in .env.local with: ${vaultAddress}`);
    console.log("2. Verify the contract using: npx hardhat verify --network " + network + " " + vaultAddress + " " + usdcAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
