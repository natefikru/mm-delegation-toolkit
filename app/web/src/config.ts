import { defineChain } from 'viem';

// Local Anvil chain configuration
export const anvilChain = defineChain({
  id: Number(import.meta.env.VITE_CHAIN_ID || 31337),
  name: 'Anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || 'http://localhost:8545'],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL || 'http://localhost:8545'],
    },
  },
});

// Contract addresses from environment variables or defaults
export const CONTRACT_ADDRESSES = {
  ENTRY_POINT: import.meta.env.VITE_ENTRYPOINT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  DELEGATION_MANAGER: import.meta.env.VITE_DELEGATION_MANAGER_ADDRESS || '0x8a5A12FfE96d64aBA1fEC9aCf3fC41fAf79D799d',
  HYBRID_DELEGATOR: import.meta.env.VITE_HYBRID_DELEGATOR_ADDRESS || '0xb66033E151b0fcb142910220F02298e25C38DaE5',
  MULTISIG_DELEGATOR: import.meta.env.VITE_MULTISIG_DELEGATOR_ADDRESS || '0x1e800d47AA89bf5B66f33ADA692393EFC4Af9940',
};

// Default private key for testing (from Anvil)
export const DEFAULT_PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const; 