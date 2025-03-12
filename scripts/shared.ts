import { Implementation } from "@metamask-private/delegator-core-viem/dist";
import { toMetaMaskSmartAccount } from "@metamask-private/delegator-core-viem/dist";
import { randomBytes } from "crypto";
import { PrivateKeyAccount } from "viem/accounts";
import { toHex } from "viem/utils";
import { publicClient } from "./create-delegation";

/**
 * Formats a private key to ensure it has the correct format for viem
 * @param key The private key to format
 * @returns A properly formatted private key with 0x prefix
 */
export const formatPrivateKey = (key: string): `0x${string}` => {
    console.log("Formatting private key...");
    
    // Remove any whitespace
    let formattedKey = key.trim();
    console.log("After trim, length:", formattedKey.length);
    
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
    
    console.log("Final key format check:");
    console.log("- Length:", formattedKey.length);
    console.log("- Starts with 0x:", formattedKey.startsWith('0x'));
    console.log("- First few chars:", formattedKey.substring(0, 6) + '...');
    
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

  // Helper functions
export const createSalt = () => toHex(randomBytes(8));

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
    return await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address, [], [], []],
      deploySalt: createSalt(),
      signatory: { account: account },
    });
  };