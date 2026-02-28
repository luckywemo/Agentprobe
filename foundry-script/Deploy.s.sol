// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CampaignVault.sol";

contract DeployCampaignVault is Script {
    // Base Mainnet USDC
    address constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    // Base Sepolia USDC
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = block.chainid == 8453 ? BASE_USDC : BASE_SEPOLIA_USDC;

        vm.startBroadcast(deployerPrivateKey);

        CampaignVault vault = new CampaignVault(usdcAddress);
        
        console.log("CampaignVault deployed to:", address(vault));
        console.log("USDC address:", usdcAddress);
        console.log("Owner:", vault.owner());

        vm.stopBroadcast();
    }
}
