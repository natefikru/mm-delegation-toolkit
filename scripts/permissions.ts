/**
 * ERC-7715 Permission Utilities
 * 
 * This file contains utilities for creating and managing ERC-7715 permission requests.
 * ERC-7715 is a standard for granting permissions from wallets to dApps.
 */

import { Address } from "abitype";
import { publicClient, getEtherscanLink } from "./shared";
// Define the PermissionRequest type directly in this file to avoid circular dependencies
export type PermissionRequest = {
  chainId: string; // hex-encoding of uint256
  address?: string; // Changed from Address to string to avoid type issues
  expiry: number; // unix timestamp
  signer: {
    type: string; // enum defined by ERCs
    data: Record<string, any>;
  };
  permissions: {
    type: string; // enum defined by ERCs
    data: Record<string, any>;
  }[];
}[];

// Default permission expiry (30 days from now)
const DEFAULT_PERMISSION_EXPIRY = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

/**
 * Creates an ERC-7715 permission request for a delegation
 * @param delegatorAddress The address of the delegator (smart account)
 * @param delegateAddress The address of the delegate
 * @param expiry The expiry timestamp for the permission (unix timestamp)
 * @returns A permission request object conforming to ERC-7715
 */
export function createPermissionRequest(
  delegatorAddress: string,
  delegateAddress: string,
  expiry: number = DEFAULT_PERMISSION_EXPIRY
): PermissionRequest {
  // Get the chain ID from the public client
  const chainIdHex = `0x${publicClient.chain.id.toString(16)}`;
  
  return [{
    chainId: chainIdHex,
    address: delegatorAddress,
    expiry,
    signer: {
      type: "eoa",
      data: {
        address: delegateAddress
      }
    },
    permissions: [
      {
        type: "transaction-execution",
        data: {
          // Allow the delegate to execute transactions on behalf of the delegator
          allowance: "unlimited"
        }
      },
      {
        type: "native-token-transfer",
        data: {
          // Allow the delegate to transfer native tokens (ETH)
          allowance: "unlimited"
        }
      }
    ]
  }];
}

/**
 * Formats a permission request for display
 * @param request The permission request to format
 * @returns A formatted string representation of the permission request
 */
export function formatPermissionRequest(request: PermissionRequest): string {
  const formatted = request.map((req) => {
    const permissionTypes = req.permissions.map((p) => p.type).join(", ");
    const expiry = new Date(req.expiry * 1000).toISOString();
    const delegatorLink = req.address ? getEtherscanLink('address', req.address) : 'N/A';
    const delegateLink = req.signer.data.address ? getEtherscanLink('address', req.signer.data.address) : 'N/A';
    
    return `
    Chain ID: ${req.chainId}
    Delegator: ${req.address}
    Delegator Etherscan: ${delegatorLink}
    Expiry: ${expiry}
    Signer Type: ${req.signer.type}
    Signer Address: ${req.signer.data.address}
    Signer Etherscan: ${delegateLink}
    Permissions: ${permissionTypes}
    `;
  }).join("\n");
  
  return formatted;
}

/**
 * Generates a note about ERC-7715 permissions and on-chain visibility
 * @param request The permission request
 * @returns A string with information about how to track the permission usage
 */
export function getPermissionTrackingInfo(request: PermissionRequest): string {
  if (!request || request.length === 0 || !request[0].address) {
    return "No permission request available to track.";
  }
  
  const delegatorAddress = request[0].address;
  const delegatorLink = getEtherscanLink('address', delegatorAddress);
  
  return `
📝 ERC-7715 Permission Tracking Information:

The permission request itself is not directly stored on-chain. It's a standardized format
for off-chain permission management between wallets and dApps.

To track any transactions executed using this permission:
1. Monitor the delegator's account: ${delegatorLink}
2. Look for transactions initiated by the delegate address: ${request[0].signer.data.address}

When the delegate uses this permission, the transactions will appear in the delegator's
transaction history, but will be initiated by the delegate.

The permission is valid until: ${new Date(request[0].expiry * 1000).toISOString()}
`;
} 