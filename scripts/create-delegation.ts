import { 
  type DelegationStruct,
  type ExecutionStruct,
  type Call,
  MetaMaskSmartAccount,
  Implementation,
  DelegationFramework,
  createCaveatBuilder, 
  createRootDelegation, 
  SINGLE_DEFAULT_MODE,
} from "@metamask-private/delegator-core-viem";
import {
  type Address,
  type Hex,
  zeroAddress,
  createPublicClient,
  http,
  isAddressEqual,
  parseEther
} from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { 
  createMetaMaskAccount, 
  createSalt, 
  formatPrivateKey, 
  bundlerClient, 
  getFeePerGas,
  publicClient
} from "./shared";
import { createPermissionRequest } from "./permissions";
// Load environment variables
dotenv.config();

// Constants
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:4337";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function checkIfRPCIsRunning() {
    // Check if RPC is running
    console.log("\n📡 Checking if RPC is running...");
    try {
      const blockNumber = await publicClient.getBlockNumber();
      console.log("✅ RPC is running. Current block number:", blockNumber);
      return true;
    } catch (error) {
      console.error("❌ Error connecting to RPC:", error);
      process.exit(1);
    }
}


async function checkIfBundlerIsRunning() {
    // Check if bundler is running
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
      
      console.log("✅ Bundler is running.");
      return true;
    } catch (error) {
      console.error("❌ Error connecting to bundler:", error);
      console.warn("⚠️ Bundler may not be running or accessible");
      return false;
    }
}

async function createDelegator(){
    // Create a delegator account, brand new account
    console.log("\n📝 Creating delegator account...");
    const delegatorPrivateKey = generatePrivateKey();
    const delegatorOwner = privateKeyToAccount(delegatorPrivateKey);
    console.log("✅ Delegator EOA account created. Address:", delegatorOwner.address);
    return delegatorOwner;
}

/**
 * Create and sign a root delegation, from the delegatorAccount, to the
 * delegateAddress, with no restrictions (no caveats).
 * @param delegatorAccount - The MetaMaskSmartAccount that is creating the delegation.
 * @param delegateAddress - The address of the recipient of the delegation.
 * @resolves to the signed delegation.
 */
export const createDelegation = async (
  delegatorAccount: MetaMaskSmartAccount<Implementation>,
  delegateAddress: Address
): Promise<DelegationStruct> => {
  console.log("\n📝 Creating delegation...");

  // These caveats are allowing only a transfer of 0 ether to the zero address.
  // Not a very useful operation, but it demonstrates how caveats that can be
  // applied to a delegation.
  // const caveats = createCaveatBuilder(delegatorAccount.environment)
  //   .addCaveat("allowedTargets", [zeroAddress])
  //   .addCaveat("valueLte", 0n);
  
  // Creating a delegation with no caveats, allowing the delegate to perform any action
  // on behalf of the delegator
  const delegation = createRootDelegation(
    delegateAddress,
    delegatorAccount.address,
    [],
    // The salt is used to create a unique delegation for each call.
    BigInt(createSalt())
  );

  const signature = await delegatorAccount.signDelegation({ delegation });

  const delegationWithSignature = {
    ...delegation,
    signature,
  };

  console.log("Delegation created:", delegationWithSignature);

  console.log("✅ Delegation creation complete");
  return delegationWithSignature;
};

/**
 * Redeem the delegation, executing a transfer of 0.001 ETH from the delegator to the redeemer.
 * If the Delegator is not deployed, a Call will be inserted to deploy the account
 * before redeeming the delegation.
 * @param redeemerAccount - The MetaMaskSmartAccount redeeming the delegation.
 * Must be the `delegate` on the delegation.
 * @param delegateAddress - The address of the delegate (not used in function body, kept for API compatibility).
 * @param delegation - The delegation being redeemed.
 * @param delegatorFactoryArgs - The factoryArgs for the delegator account, if
 * the account is not deployed.
 * @resolves to the UserOperationHash, once it has been settled on chain.
 */
export const executeOnBehalfOfDelegator = async (
  redeemerAccount: MetaMaskSmartAccount<Implementation>,
  delegation: DelegationStruct,
  delegatorFactoryArgs?: { factory: Address; factoryData: Hex }
) => {
  console.log("\n📝 Executing delegation on behalf of delegator...");

  console.log("Redeemer account address:", redeemerAccount.address);
  console.log("Delegate address:", delegation.delegate);

  if (!isAddressEqual(redeemerAccount.address, delegation.delegate)) {
    throw new Error(
      `Redeemer account address not equal to delegate. Redeemer: ${redeemerAccount.address}, delegate: ${delegation.delegate}`
    );
  }

  const delegationChain = [delegation];

  // The action that the redeemer is executing on behalf of the delegator.
  // This execution transfers 0.001 ETH from the delegator to the redeemer
  const executions: ExecutionStruct[] = [
    {
      target: redeemerAccount.address,
      value: parseEther("0.001"),
      callData: "0x",
    },
  ];

  // Create the calldata for redeeming the delegation
  const redeemDelegationCalldata = DelegationFramework.encode.redeemDelegations(
    [delegationChain],
    [SINGLE_DEFAULT_MODE],
    [executions]
  );

  // The call to the delegation framework to redeem the delegation
  const calls: Call[] = [
    {
      to: delegation.delegator, // Target the delegator's account for the delegation redemption
      data: redeemDelegationCalldata,
    },
  ];

  // The delegate is submitting the user operation, so may be deployed via initcode. If the delegator
  // is not yet on-chain, it must be deployed before redeeming the delegation. If factory
  // args are provided, an additional call is inserted into the calls array that is encoded
  // for the user operation.
  if (delegatorFactoryArgs) {
    const { factory, factoryData } = delegatorFactoryArgs;

    calls.unshift({
      to: factory,
      data: factoryData,
    });
  }

  const feePerGas = await getFeePerGas();

  console.log("\n📝 Sending UserOperation...");
  // This ends up throwing an error with code 0x0796d945
  const userOperationHash = await bundlerClient.sendUserOperation({
    account: redeemerAccount,
    calls,
    ...feePerGas,
  });

  console.log("✅ Delegation execution submitted");
  return userOperationHash;
};

async function main() {
  // Check if required services are running
  await checkIfRPCIsRunning()
  await checkIfBundlerIsRunning()

  // Create delegator account and smart account
  const delegatorOwner = await createDelegator()
  const delegatorSmartAccount = await createMetaMaskAccount(delegatorOwner)
  console.log("Delegator smart account address:", delegatorSmartAccount.address)

  // Create delegate account from private key
  const delegateOwner = privateKeyToAccount(formatPrivateKey(PRIVATE_KEY as string))
  console.log("\n📝 Delegate EOA account address:", delegateOwner.address)
  const delegateSmartAccount = await createMetaMaskAccount(delegateOwner)
  console.log("Delegate smart account address:", delegateSmartAccount.address)

  // Create and sign delegation
  const signedDelegation = await createDelegation(
    delegatorSmartAccount, 
    delegateSmartAccount.address
  )

  const { factory, factoryData } = await delegatorSmartAccount.getFactoryArgs();

  const factoryArgs =
    factory && factoryData ? { factory, factoryData } : undefined;

  // Execute delegation on behalf of delegator
  const userOperationHash = await executeOnBehalfOfDelegator(
    delegateSmartAccount,
    signedDelegation,
    factoryArgs
  )

  // Wait for user operation receipt
  const userOperationReceipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOperationHash,
  })

  console.log("✅ User operation:", userOperationReceipt)
  return
}

main(); 