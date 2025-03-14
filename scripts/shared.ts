import { toMetaMaskSmartAccount, Implementation } from "@metamask-private/delegator-core-viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { randomBytes } from "crypto";
import { createPublicClient, http } from "viem"
import { PrivateKeyAccount } from "viem/accounts"
import { toHex } from "viem/utils"
import { sepolia } from "viem/chains"
import * as dotenv from "dotenv"
import { createBundlerClient, createPaymasterClient } from "viem/account-abstraction";

export const chain = sepolia;

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
export const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:3000";
const ETHERSCAN_BASE_URL = "https://sepolia.etherscan.io";

export const publicClient = getPublicClient();

export const bundlerClient = getBundlerClient();

// Create public client for reading blockchain state
function getPublicClient() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });
  return publicClient;
}

export function getBundlerClient() {
  const paymasterClient = createPaymasterClient({
    transport: http(BUNDLER_URL),
  });
  const bundlerClient = createBundlerClient({
    transport: http(BUNDLER_URL),
    chain,
    paymaster: paymasterClient,
  });
  return bundlerClient;
}

/**
 * Formats a private key to ensure it has the correct format for viem
 * @param key The private key to format
 * @returns A properly formatted private key with 0x prefix
 */
export const formatPrivateKey = (key: string): `0x${string}` => {
  if (key === undefined || key === null || key === "") {
    console.error("PRIVATE_KEY is required in .env file");
    process.exit(1);
  }
    
    // Remove any whitespace
    let formattedKey = key.trim();
    
    // Remove quotes if present
    if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || 
        (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
      formattedKey = formattedKey.slice(1, -1);
      console.log("Removed quotes, new length:", formattedKey.length);
    }
    
    // Add 0x prefix if missing
    if (!formattedKey.startsWith('0x')) {
      formattedKey = `0x${formattedKey}`;
      console.log("Added 0x prefix");
    }
    
    // Ensure it's a valid hex string
    if (!/^0x[0-9a-fA-F]+$/.test(formattedKey)) {
      console.error("Invalid hex format detected!");
      console.error("Contains non-hex characters:", formattedKey.replace(/[0-9a-fA-F]/g, '').substring(2, 10) + '...');
      throw new Error(`Invalid private key format: ${formattedKey.substring(0, 6)}...`);
    }
    
    // Check length - should be 66 characters (0x + 64 hex chars)
    if (formattedKey.length !== 66) {
      console.warn(`Warning: Private key has unusual length: ${formattedKey.length} (expected 66)`);
    }
    
    return formattedKey as `0x${string}`;
  };

// Custom JSON serializer to handle BigInt
export const customJSONStringify = (obj: any) => {
  return JSON.stringify(obj, (_, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
};

/**
 * Create a new MetaMaskSmartAccount representing a Hybrid Delegator Smart
 * Account where the signer is a "burner" account.
 * @resolves to the MetaMaskSmartAccount instance.
 */
export const createMetaMaskAccount = async (account: PrivateKeyAccount) => {
    console.log("\n📝 Creating MetaMask Smart Account... Using account address:", account.address);
    const salt = createSalt();

    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address, [], [], []],
      deploySalt: salt,
      signatory: { account: account },
    });

    console.log("✅ Smart Account address:", smartAccount.address);
    return smartAccount;
  };

// Helper function to generate Etherscan links
export function getEtherscanLink(type: 'address' | 'tx', value: string): string {
  return `${ETHERSCAN_BASE_URL}/${type}/${value}`;
}

// Helper functions
export const createSalt = () => toHex(randomBytes(8));

export const getFeePerGas = async () => {
  // The method for determining fee per gas is dependent on the bundler
  // implementation. For this reason, this is centralised here.
  const pimlicoClient = createPimlicoClient({
    chain,
    transport: http(BUNDLER_URL),
  });

  const { fast } = await pimlicoClient.getUserOperationGasPrice();

  return fast;
};