// Redeem Delegation Script
// This script redeems a delegation by sending a user operation through the Pimlico Alto bundler.

import { DelegationFramework, SINGLE_DEFAULT_MODE, type DeleGatorEnvironment } from "@metamask-private/delegator-core-viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, isAddressEqual, zeroAddress } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { sepolia } from "viem/chains";
import { createMetaMaskAccount } from "./shared";

// Load environment variables
dotenv.config();

// Constants
const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:3000";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ENTRYPOINT_ADDRESS = process.env.ENTRYPOINT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const DELEGATION_MANAGER_ADDRESS = process.env.DELEGATION_MANAGER_ADDRESS || "0xE539562BB7bDa922a9b14f7b1B389a8a53404C1D";
const HYBRID_DELEGATOR_ADDRESS = process.env.HYBRID_DELEGATOR_ADDRESS || "0xdCD4044B3305bB1DB237a45a32F30f7703Fc2556";
const SIMPLE_FACTORY_ADDRESS = process.env.SIMPLE_FACTORY_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const ALLOWED_TARGETS_ENFORCER_ADDRESS = process.env.ALLOWED_TARGETS_ENFORCER_ADDRESS || "0x0000000000000000000000000000000000000000";
const VALUE_LTE_ENFORCER_ADDRESS = process.env.VALUE_LTE_ENFORCER_ADDRESS || "0x0000000000000000000000000000000000000000";

// Enable debug mode for more verbose output
const DEBUG = process.env.DEBUG_MODE === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    console.log("[DEBUG]", ...args);
  }
}

if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY is required in .env file");
  process.exit(1);
}

// Custom JSON serializer to handle BigInt
const customJSONStringify = (obj: any) => {
  return JSON.stringify(obj, (_, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
};

// Create bundler client for sending user operations
export const bundlerClient = createBundlerClient({
  chain: sepolia,
  transport: http(BUNDLER_URL),
});

// Define the environment with explicit contract addresses
// This is critical for the toolkit to work properly
const environment: DeleGatorEnvironment = {
  DelegationManager: DELEGATION_MANAGER_ADDRESS as `0x${string}`,
  EntryPoint: ENTRYPOINT_ADDRESS as `0x${string}`,
  SimpleFactory: SIMPLE_FACTORY_ADDRESS as `0x${string}`,
  implementations: {
    Hybrid: HYBRID_DELEGATOR_ADDRESS as `0x${string}`
  },
  caveatEnforcers: {
    AllowedTargets: ALLOWED_TARGETS_ENFORCER_ADDRESS as `0x${string}`,
    ValueLte: VALUE_LTE_ENFORCER_ADDRESS as `0x${string}`
  }
};

const main = async () => {
  console.log("🚀 Starting redemption process...");
  
  // Log environment variables for debugging
  console.log("\n🔍 Environment configuration:");
  console.log(`EntryPoint: ${ENTRYPOINT_ADDRESS}`);
  console.log(`DelegationManager: ${DELEGATION_MANAGER_ADDRESS}`);
  console.log(`HybridDelegator: ${HYBRID_DELEGATOR_ADDRESS}`);
  console.log(`SimpleFactory: ${SIMPLE_FACTORY_ADDRESS}`);
  console.log(`AllowedTargets Enforcer: ${ALLOWED_TARGETS_ENFORCER_ADDRESS}`);
  console.log(`ValueLte Enforcer: ${VALUE_LTE_ENFORCER_ADDRESS}`);
  debug("Full environment object:", environment);

  // Step 1: Load delegation from file
  console.log("\n📂 Loading delegation from file...");
  let delegation;
  try {
    const delegationFile = readFileSync("./delegation.json", "utf8");
    const delegationData = JSON.parse(delegationFile);
    
    if (!delegationData.delegations || delegationData.delegations.length === 0) {
      console.error("❌ No delegations found in delegation.json");
      process.exit(1);
    }
    
    delegation = delegationData.delegations[0];
    console.log("✅ Delegation loaded successfully");
    debug("Delegation:", customJSONStringify(delegation));
  } catch (error) {
    console.error("❌ Error loading delegation:", error);
    process.exit(1);
  }

  // Step 2: Create delegate owner account
  console.log("\n👤 Creating delegate owner account...");
  const delegateOwner = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log(`🔑 Delegate owner address: ${delegateOwner.address}`);

  // Step 3: Create the delegate smart account
  console.log("\n🏦 Creating delegate smart account...");
  try {
    const delegateSmartAccount = await createMetaMaskAccount(delegateOwner);


    console.log(`✅ Delegate smart account created successfully!`);
    console.log(`📄 Delegate smart account address: ${delegateOwner.address}`);

    // Step 4: Verify that the delegate account matches the delegate in the delegation
    if (!isAddressEqual(delegateOwner.address, delegation.delegate)) {
      console.error(`❌ Delegate account address not equal to delegate in delegation. Account: ${delegateOwner.address}, delegation delegate: ${delegation.delegate}`);
      process.exit(1);
    }

    // Step 5: Create a delegation chain
    const delegationChain = [delegation];

    // Step 6: Define the execution (simple zero value transfer to zero address)
    console.log("\n💰 Setting up execution (zero value transfer to zero address)");
    
    const executions = [
      {
        target: zeroAddress,
        value: 0n,
        callData: "0x" as `0x${string}`,
      },
    ];

    // Step 7: Build the redemption transaction
    console.log("\n🔧 Building redemption transaction...");
    
    const redeemDelegationCalldata = DelegationFramework.encode.redeemDelegations(
      [delegationChain],
      [SINGLE_DEFAULT_MODE],
      [executions]
    );

    // Create the calls array
    const calls = [
      {
        to: delegateOwner.address,
        data: redeemDelegationCalldata,
      },
    ];

    // Step 8: Send the user operation
    console.log("\n📤 Sending user operation...");
    const userOperationHash = await bundlerClient.sendUserOperation({
      account: delegateSmartAccount,
      calls,
    });

    console.log(`📝 User operation hash: ${userOperationHash}`);

    // Step 9: Wait for the user operation receipt
    console.log("\n⏳ Waiting for user operation receipt...");
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOperationHash,
    });

    console.log("\n✅ Transaction executed successfully!");
    console.log(`📄 Transaction hash: ${receipt.receipt.transactionHash}`);
    
    // Save the result to a file
    const resultPath = "./redemption-result.json";
    writeFileSync(
      resultPath, 
      customJSONStringify({
        success: true,
        userOperationHash,
        transactionHash: receipt.receipt.transactionHash,
        receipt
      })
    );
    
    console.log(`\n💾 Redemption result saved to ${resultPath}`);
    
    return receipt;
  } catch (error: any) {
    console.error("❌ Error creating delegate smart account or sending user operation:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

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