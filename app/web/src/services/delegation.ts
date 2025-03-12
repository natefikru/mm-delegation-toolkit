// Delegation Service
// This service provides functions for creating and redeeming delegations

import * as delegatorCore from "@metamask-private/delegator-core-viem";
const {
  createCaveatBuilder,
  createRootDelegation,
  DelegationFramework,
  Implementation,
  SINGLE_DEFAULT_MODE,
  toMetaMaskSmartAccount,
} = delegatorCore;
import { privateKeyToAccount, generatePrivateKey, type PrivateKeyAccount } from "viem/accounts";
import { 
  createPublicClient, 
  http, 
  toHex, 
  isAddressEqual, 
  parseEther,
  type PublicClient
} from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { DEFAULT_PRIVATE_KEY, anvilChain as localChain } from "../config";
import { logEnvironmentStatus } from "../utils/checkEnv";

// Constants
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://localhost:8545";
const BUNDLER_URL = import.meta.env.VITE_BUNDLER_URL || "http://localhost:8545";

// Validate and get required addresses
const getDelegationManagerAddress = (): `0x${string}` => {
  const addr = import.meta.env.VITE_DELEGATION_MANAGER_ADDRESS;
  if (!addr || !addr.startsWith('0x')) {
    throw new Error('VITE_DELEGATION_MANAGER_ADDRESS is missing or invalid');
  }
  return addr as `0x${string}`;
};

const getEntryPointAddress = (): `0x${string}` => {
  const addr = import.meta.env.VITE_ENTRYPOINT_ADDRESS;
  if (!addr || !addr.startsWith('0x')) {
    throw new Error('VITE_ENTRYPOINT_ADDRESS is missing or invalid');
  }
  return addr as `0x${string}`;
};

const getHybridDelegatorAddress = (): `0x${string}` => {
  const addr = import.meta.env.VITE_HYBRID_DELEGATOR_ADDRESS;
  if (!addr || !addr.startsWith('0x')) {
    throw new Error('VITE_HYBRID_DELEGATOR_ADDRESS is missing or invalid');
  }
  return addr as `0x${string}`;
};

// Contract addresses with validation
const CONTRACT_ADDRESSES = {
  DelegationManager: getDelegationManagerAddress(),
  EntryPoint: getEntryPointAddress(),
  SimpleFactory: import.meta.env.VITE_SIMPLE_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000' as `0x${string}`,
  implementations: {
    Hybrid: getHybridDelegatorAddress()
  },
  caveatEnforcers: {
    AllowedTargets: import.meta.env.VITE_ALLOWED_TARGETS_ENFORCER_ADDRESS || '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ValueLte: import.meta.env.VITE_VALUE_LTE_ENFORCER_ADDRESS || '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
} as const;

// Add validation check for Hybrid implementation
if (!CONTRACT_ADDRESSES.implementations.Hybrid) {
  throw new Error('Hybrid implementation address is undefined');
}

// Helper functions
const createSalt = () => {
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
};

// Create clients
const publicClient = createPublicClient({
  chain: localChain,
  transport: http(RPC_URL),
});

const bundlerClient = createBundlerClient({
  chain: localChain,
  transport: http(BUNDLER_URL),
});

// Environment configuration with validation
const environment: delegatorCore.DeleGatorEnvironment = {
  DelegationManager: CONTRACT_ADDRESSES.DelegationManager,
  EntryPoint: CONTRACT_ADDRESSES.EntryPoint,
  SimpleFactory: CONTRACT_ADDRESSES.SimpleFactory,
  implementations: {
    Hybrid: CONTRACT_ADDRESSES.implementations.Hybrid
  },
  caveatEnforcers: CONTRACT_ADDRESSES.caveatEnforcers
} as const;

// Add validation check for environment
if (!environment.implementations.Hybrid) {
  throw new Error('Hybrid implementation address is missing in environment');
}

// Log environment variables for debugging
console.log('Environment Variables:', {
  VITE_DELEGATION_MANAGER_ADDRESS: import.meta.env.VITE_DELEGATION_MANAGER_ADDRESS,
  VITE_ENTRYPOINT_ADDRESS: import.meta.env.VITE_ENTRYPOINT_ADDRESS,
  VITE_HYBRID_DELEGATOR_ADDRESS: import.meta.env.VITE_HYBRID_DELEGATOR_ADDRESS,
});

// Log the final environment configuration
console.log('Final Environment Configuration:', {
  DelegationManager: environment.DelegationManager,
  EntryPoint: environment.EntryPoint,
  SimpleFactory: environment.SimpleFactory,
  implementations: environment.implementations,
  caveatEnforcers: environment.caveatEnforcers
});

// Import the actual types from delegator-core-viem
import type { 
  SignDelegationParams, 
  DelegationStruct,
  DeleGatorEnvironment
} from "@metamask-private/delegator-core-viem";

// Types for delegation objects
export interface SignedDelegation {
  delegate: `0x${string}`;
  delegator: `0x${string}`;
  caveats: unknown[];
  salt: string;
  signature: string;
}

// Define the type for the MetaMask smart account
export type MetaMaskAccount = ReturnType<typeof toMetaMaskSmartAccount> extends Promise<infer T> ? T : never;

// Update SmartAccount interface to match the actual implementation
export interface SmartAccount {
  address: `0x${string}`;
  environment: DeleGatorEnvironment;
  signDelegation: (params: SignDelegationParams) => Promise<`0x${string}`>;
}

// Define return type for createDelegation function
export interface DelegationResult {
  delegatorAccount: MetaMaskAccount;
  delegateOwner: PrivateKeyAccount;
  signedDelegation: SignedDelegation;
  eip7715Format: { delegations: SignedDelegation[] };
}

/**
 * Creates a delegation from a delegator to a delegate
 * @param delegatorAddress - The address of the delegator
 * @param delegateAddress - The address of the delegate
 * @param delegatorAccount - The MetaMask smart account of the delegator
 * @returns A promise that resolves to a DelegationResult object
 */
export async function createDelegation(
  delegatorAddress: `0x${string}`,
  delegateAddress: `0x${string}`,
  delegatorAccount: MetaMaskAccount
): Promise<DelegationResult> {
  try {
    console.log('Creating delegation from', delegatorAddress, 'to', delegateAddress);
    
    // Validate addresses
    if (!delegatorAddress || !delegatorAddress.startsWith('0x')) {
      throw new Error(`Invalid delegator address: ${delegatorAddress}`);
    }
    
    if (!delegateAddress || !delegateAddress.startsWith('0x')) {
      throw new Error(`Invalid delegate address: ${delegateAddress}`);
    }
    
    // Important: delegatorAccount must be a proper account with signMessage method
    // If you're getting "Cannot read properties of undefined (reading 'signMessage')" error,
    // make sure delegatorAccount is created with privateKeyToAccount() before passing it here
    
    console.log('Using delegator account:', delegatorAccount.address);
    
    // Create delegate account (merchant's account)
    console.log("Creating delegate account...");
    const delegatePrivateKey = generatePrivateKey();
    const delegateOwner = privateKeyToAccount(delegatePrivateKey);

    console.log(`Delegate private key: ${delegatePrivateKey}`);
    console.log(`Delegate owner address: ${delegateOwner.address}`);

    // Create unrestricted delegation
    console.log("\nCreating unrestricted delegation...");
    const caveats = createCaveatBuilder(delegatorAccount.environment);
    
    const delegation = createRootDelegation(
      delegateOwner.address, // delegate
      delegatorAccount.address, // delegator
      caveats,
      BigInt(createSalt()) // salt for unique delegation
    );

    // Sign the delegation
    console.log("Signing delegation...");
    const signature = await delegatorAccount.signDelegation({ delegation });
    
    const signedDelegation: SignedDelegation = {
      ...delegation,
      signature,
      salt: delegation.salt.toString(), // Convert bigint to string for SignedDelegation
    };

    // Format for EIP-7515
    const eip7715Format = {
      delegations: [signedDelegation], // Use array of SignedDelegation as required
    };

    return {
      delegatorAccount,
      delegateOwner,
      signedDelegation,
      eip7715Format,
    };
  } catch (error) {
    console.error("Error creating delegation:", error);
    throw error;
  }
}

/**
 * Creates a MetaMask smart account for a delegator
 * @param delegatorPrivateKey - The private key of the delegator
 * @returns A promise that resolves to a MetaMaskSmartAccount
 */
export async function createDelegatorAccount(
  delegatorPrivateKey: `0x${string}`
): Promise<MetaMaskAccount> {
  if (!delegatorPrivateKey || !delegatorPrivateKey.startsWith('0x')) {
    throw new Error('Invalid delegator private key. Must be a hex string starting with 0x');
  }

  try {
    // Check environment variables first
    const envOk = logEnvironmentStatus();
    if (!envOk) {
      throw new Error('Missing required environment variables. Check the console for details.');
    }

    // Log all addresses for debugging
    console.log('Contract Addresses:', {
      DelegationManager: CONTRACT_ADDRESSES.DelegationManager,
      EntryPoint: CONTRACT_ADDRESSES.EntryPoint,
      SimpleFactory: CONTRACT_ADDRESSES.SimpleFactory,
      HybridImplementation: CONTRACT_ADDRESSES.implementations.Hybrid,
    });

    // Validate all required addresses are available and properly formatted
    const requiredAddresses = {
      DelegationManager: CONTRACT_ADDRESSES.DelegationManager,
      EntryPoint: CONTRACT_ADDRESSES.EntryPoint,
      HybridImplementation: CONTRACT_ADDRESSES.implementations.Hybrid
    };

    for (const [name, address] of Object.entries(requiredAddresses)) {
      if (!address) {
        throw new Error(`${name} address is undefined`);
      }
      if (!address.startsWith('0x')) {
        throw new Error(`${name} address is invalid: ${address}`);
      }
      if (address.length !== 42) {
        throw new Error(`${name} address has invalid length: ${address}`);
      }
    }

    // Log environment for debugging
    console.log('Environment configuration:', {
      DelegationManager: environment.DelegationManager,
      EntryPoint: environment.EntryPoint,
      SimpleFactory: environment.SimpleFactory,
      Hybrid: environment.implementations.Hybrid,
    });

    // Create the delegator owner account from the private key
    const delegatorOwner = privateKeyToAccount(delegatorPrivateKey);
    console.log(`Creating delegator account for address: ${delegatorOwner.address}`);
    
    // Log the parameters being passed to toMetaMaskSmartAccount
    console.log('Creating smart account with params:', {
      implementation: Implementation.Hybrid,
      environment: {
        DelegationManager: CONTRACT_ADDRESSES.DelegationManager,
        EntryPoint: CONTRACT_ADDRESSES.EntryPoint,
        SimpleFactory: CONTRACT_ADDRESSES.SimpleFactory,
        implementations: {
          Hybrid: CONTRACT_ADDRESSES.implementations.Hybrid
        },
        caveatEnforcers: CONTRACT_ADDRESSES.caveatEnforcers
      }
    });

    // Add detailed logging for the entire environment object
    console.log('Full environment object being passed:', JSON.stringify({
      DelegationManager: CONTRACT_ADDRESSES.DelegationManager,
      EntryPoint: CONTRACT_ADDRESSES.EntryPoint,
      SimpleFactory: CONTRACT_ADDRESSES.SimpleFactory,
      implementations: CONTRACT_ADDRESSES.implementations,
      caveatEnforcers: CONTRACT_ADDRESSES.caveatEnforcers
    }, null, 2));

    // Add detailed logging for implementation address
    console.log('Hybrid Implementation Address:', environment.implementations.Hybrid);
    console.log('Full implementations object:', environment.implementations);

    // Create the MetaMask smart account
    const delegatorAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [
        delegatorOwner.address,
        [],
        [],
        []
      ],
      deploySalt: createSalt(),
      signatory: { account: delegatorOwner },
    });
    
    if (!delegatorAccount || !delegatorAccount.address) {
      throw new Error('Failed to create delegator account: Account creation returned undefined');
    }
    
    console.log(`Delegator account created with address: ${delegatorAccount.address}`);
    return delegatorAccount;
  } catch (error) {
    console.error('Error in createDelegatorAccount:', error);
    if (error instanceof Error) {
      // Enhance error message with more context
      throw new Error(`Failed to create MetaMask smart account: ${error.message}\nPlease ensure all required environment variables are set and valid.`);
    }
    throw new Error(`Failed to create MetaMask smart account: Unknown error occurred`);
  }
}

/**
 * Redeems a delegation to execute a transaction
 * @param params - Object containing the delegation, recipient address, and amount
 * @returns A promise that resolves to an object with success status, message, and transaction hash
 */
export async function redeemDelegation(params: {
  delegation: SignedDelegation;
  recipientAddress: string;
  amount: string;
}): Promise<{
  success: boolean;
  message: string;
  transactionHash: string;
}> {
  const { delegation, recipientAddress, amount } = params;
  
  if (!delegation) {
    throw new Error("Delegation is required");
  }

  console.log("Redeeming delegation...");
  
  // Create redeemer account (delegate's account)
  console.log("\nCreating redeemer account...");
  const redeemerOwner = privateKeyToAccount(DEFAULT_PRIVATE_KEY);
  console.log(`Redeemer owner address: ${redeemerOwner.address}`);

  const redeemerAccount = await toMetaMaskSmartAccount({
    client: publicClient as PublicClient,
    implementation: Implementation.Hybrid,
    deployParams: [redeemerOwner.address, [], [], []],
    deploySalt: createSalt(),
    environment: {
      DelegationManager: CONTRACT_ADDRESSES.DelegationManager,
      EntryPoint: CONTRACT_ADDRESSES.EntryPoint,
      SimpleFactory: CONTRACT_ADDRESSES.SimpleFactory,
      implementations: {
        Hybrid: CONTRACT_ADDRESSES.implementations.Hybrid
      },
      caveatEnforcers: {
        AllowedTargets: CONTRACT_ADDRESSES.caveatEnforcers.AllowedTargets,
        ValueLte: CONTRACT_ADDRESSES.caveatEnforcers.ValueLte
      }
    },
    signatory: { account: redeemerOwner },
  });

  console.log(`Redeemer account address: ${redeemerAccount.address}`);

  // Verify that the redeemer is the delegate
  if (!isAddressEqual(redeemerOwner.address, delegation.delegate)) {
    throw new Error(
      `Redeemer account address not equal to delegate. Redeemer: ${redeemerOwner.address}, delegate: ${delegation.delegate}`
    );
  }

  // Create a delegation chain
  const delegationChain = [delegation];

  // Define the execution (transfer ETH to recipient address)
  // In a real application, this would be the actual transaction
  const executions = [
    {
      target: recipientAddress as `0x${string}`,
      value: parseEther(amount),
      callData: "0x" as `0x${string}`, // Empty calldata for a simple transfer
    },
  ];

  console.log("\nBuilding redemption transaction...");
  // Build the redemption transaction
  const redeemDelegationCalldata = DelegationFramework.encode.redeemDelegations(
    [delegationChain] as unknown as DelegationStruct[][],
    [SINGLE_DEFAULT_MODE],
    [executions]
  );

  // Create the calls array
  const calls = [
    {
      to: redeemerAccount.address,
      data: redeemDelegationCalldata,
    },
  ];

  // Send the user operation
  console.log("Sending user operation...");
  try {
    // Following the example from the MetaMask documentation
    const userOperationHash = await bundlerClient.sendUserOperation({
      account: redeemerAccount,
      calls,
    });

    console.log(`User operation hash: ${userOperationHash}`);

    // Wait for the user operation receipt
    console.log("Waiting for user operation receipt...");
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOperationHash,
    });

    console.log("\nTransaction executed successfully!");
    
    return {
      success: true,
      message: `Successfully executed transaction using delegation`,
      transactionHash: receipt.receipt.transactionHash,
    };
  } catch (error) {
    console.error("Error sending user operation:", error);
    throw error;
  }
}