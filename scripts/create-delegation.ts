// Create Delegation Script
// This script creates a delegator account, creates a delegation to a delegate account,
// and returns the delegation in a simplified format.

import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createPublicClient, http, PrivateKeyAccount, } from "viem";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";
import { createRootDelegation } from "@metamask-private/delegator-core-viem";
import { sepolia } from "viem/chains";
import { createMetaMaskAccount, createSalt, customJSONStringify } from "./shared";
import { formatPrivateKey } from "./shared";

// Load environment variables
dotenv.config();

// Constants
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:4337";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("PRIVATE_KEY is required in .env file");
  process.exit(1);
}

// Debug private key format (safely)
console.log("Private key type:", typeof PRIVATE_KEY);
console.log("Private key length:", PRIVATE_KEY.length);
console.log("Private key starts with 0x:", PRIVATE_KEY.startsWith('0x'));
console.log("Private key first few chars:", PRIVATE_KEY.substring(0, 6) + '...');
console.log("Private key contains quotes:", PRIVATE_KEY.includes('"') || PRIVATE_KEY.includes("'"));

// Create public client
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Main function
export async function main() {
  try {
    console.log("\n🚀 Starting delegation creation process...");
    
    // Step 1: Check if RPC is running
    console.log("\n📡 Checking if RPC is running...");
    try {
      const blockNumber = await publicClient.getBlockNumber();
      console.log("✅ RPC is running. Current block number:", blockNumber);
    } catch (error) {
      console.error("❌ Error connecting to RPC:", error);
      process.exit(1);
    }
    
    // Step 2: Check if bundler is running
    console.log("\n📡 Checking if bundler is running...");
    try {
      const response = await fetch(BUNDLER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_supportedEntryPoints',
          params: [],
        }),
      });
      
      const data = await response.json();
      console.log("✅ Bundler is running. Supported EntryPoints:", data.result);
    } catch (error) {
      console.error("❌ Error connecting to bundler:", error);
      console.warn("⚠️ Bundler may not be running or accessible");
    }
    
    // Step 3: Create delegator account (user's account)
    console.log("\n📝 Creating delegator account...");
    const delegatorPrivateKey = generatePrivateKey();
    const delegatorOwner = privateKeyToAccount(delegatorPrivateKey);

    console.log(`🔑 Delegator private key: ${delegatorPrivateKey}`);
    console.log(`👤 Delegator owner address: ${delegatorOwner.address}`);

    const delegatorSmartAccount = await createMetaMaskAccount(delegatorOwner);
    
    // Step 4: Create delegate account (merchant's account)
    console.log("\n📝 Creating delegate account...");
    
    try {
      // We've already checked that PRIVATE_KEY is not undefined above
      const formattedPrivateKey = formatPrivateKey(PRIVATE_KEY as string);
      console.log("Successfully formatted private key");
      
      // Try a direct approach with a known good format
      console.log("Attempting to create account with formatted key...");
      const delegateOwner = privateKeyToAccount(formattedPrivateKey);
      console.log(`👤 Delegate owner address: ${delegateOwner.address}`);
      
      // Step 5: Create a simple delegation
      console.log("\n📝 Creating delegation...");
      
      const salt = BigInt(createSalt());

      const delegation = createRootDelegation(
        delegateOwner.address, 
        delegatorSmartAccount.address, 
        [], 
        salt,
      );

      const signature = await delegatorSmartAccount.signDelegation({delegation});

      const signedDelegation = {
        ...delegation,
        signature: signature,
      };
      
      console.log("Delegation details:");
      console.log("- Delegator:", delegation.delegator);
      console.log("- Delegate:", delegation.delegate);
      console.log("- Salt:", delegation.salt.toString());
      
      console.log("\n📄 Delegation in simplified format:");
      console.log(customJSONStringify(signedDelegation));
      
      // Save delegation to file in EIP-7715 format
      const delegationFile = {
        delegations: [signedDelegation]
      };
      
      const delegationPath = "./delegation.json";
      writeFileSync(delegationPath, customJSONStringify(delegationFile));
      console.log(`\n💾 Delegation saved to ${delegationPath}`);
      
      console.log("\n✅ Delegation creation process completed successfully!");
      
      return {
        delegatorOwner,
        delegateOwner,
        delegation
      };
    } catch (error) {
      console.error("❌ Error with private key processing:", error);
      
      // Try an alternative approach - generate a new key for testing
      console.log("\n⚠️ Attempting fallback with a generated key for testing purposes...");
      console.log("⚠️ NOTE: This is only for debugging. You should fix your PRIVATE_KEY in .env");
      
      const fallbackPrivateKey = generatePrivateKey();
      console.log(`Generated fallback key: ${fallbackPrivateKey.substring(0, 6)}...`);
      
      const delegateOwner = privateKeyToAccount(fallbackPrivateKey);
      console.log(`👤 Delegate owner address (fallback): ${delegateOwner.address}`);
      
      throw new Error("Original private key format issue. See logs above for details.");
    }
  } catch (error) {
    console.error("❌ Error in main function:", error);
    throw error;
  }
}

// Execute main function if this script is run directly
if (import.meta.url === new URL(import.meta.url).href) {
  main()
    .then((result) => {
      console.log("\n🎉 Script completed successfully!");
      return result;
    })
    .catch((error) => {
      console.error("\n❌ Error executing script:", error);
      console.error("Stack trace:", error.stack);
      process.exit(1);
    });
}

export default { main }; 