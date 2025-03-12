// Test file to verify viem types
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// This should use the types from the root project's node_modules
export function testViemTypes() {
  // Create a test account
  const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as `0x${string}`);
  
  // Create a public client
  const client = createPublicClient({
    transport: http('https://example.com')
  });
  
  console.log('Account address:', account.address);
  console.log('Client:', client);
  
  return { account, client };
} 