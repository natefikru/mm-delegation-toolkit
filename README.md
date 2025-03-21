# MetaMask Delegation Toolkit

This toolkit provides a set of tools for creating and redeeming delegations using the MetaMask Delegation Framework. It allows you to create smart account delegations where one account (the delegate) can perform actions on behalf of another account (the delegator).

## Overview

The MetaMask Delegation Toolkit demonstrates how to use the MetaMask Delegation Framework with Account Abstraction (ERC-4337) to create and execute delegations. The toolkit uses the Sepolia testnet by default and includes scripts for:

1. Creating a delegation from a delegator to a delegate
2. Executing actions on behalf of the delegator using the delegation
3. Managing permissions using the ERC-7715 standard

## Prerequisites

- Node.js v18 or higher
- A private key with some Sepolia ETH (for the delegate account)
- Access to a Sepolia RPC endpoint
- Access to a bundler service (Pimlico is used by default)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/mm-delegation-toolkit.git
   cd mm-delegation-toolkit
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following variables:
   ```
   RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   CHAIN_ID=11155111
   PRIVATE_KEY=YOUR_PRIVATE_KEY
   BUNDLER_URL=https://api.pimlico.io/v2/11155111/rpc?apikey=YOUR_PIMLICO_API_KEY
   ```

## Scripts

The toolkit includes the following scripts:

### create-delegation.ts

This script demonstrates how to create a delegation from a delegator to a delegate and execute an action on behalf of the delegator.

The script performs the following steps:
1. Checks if the RPC and bundler services are running
2. Creates a new random delegator account
3. Creates a MetaMask smart account for the delegator
4. Uses your private key to create a delegate account
5. Creates a MetaMask smart account for the delegate
6. Creates and signs a delegation from the delegator to the delegate
7. Executes an action on behalf of the delegator using the delegation

To run the script:
```
npm run create-delegation
```

### shared.ts

This file contains shared utilities used by the other scripts, including:
- Client setup for interacting with the blockchain and bundler
- Helper functions for creating MetaMask smart accounts
- Utilities for formatting private keys and handling BigInt values
- Functions for generating salts and calculating gas fees

### permissions.ts

This file contains utilities for creating and managing ERC-7715 permission requests, which provide a standardized format for off-chain permission management between wallets and dApps.

## How It Works

### Delegation Process

1. **Create Delegator Account**: A new random account is created to serve as the delegator.

2. **Create Smart Accounts**: Both the delegator and delegate get MetaMask smart accounts created for them. These are counterfactual accounts that may not be deployed on-chain yet.

3. **Create Delegation**: A delegation is created from the delegator to the delegate with specific caveats (restrictions). In the example, the delegation only allows transferring 0 ETH to the zero address.

4. **Execute Delegation**: The delegate executes an action on behalf of the delegator. If the delegator's smart account is not deployed yet, it will be deployed as part of this process.

### Technical Details

- **Smart Accounts**: The toolkit uses MetaMask's Hybrid implementation of smart accounts, which supports the delegation framework.

- **Caveats**: Delegations can include caveats that restrict what the delegate can do. The example uses `allowedTargets` and `valueLte` caveats.

- **Account Abstraction**: The toolkit uses ERC-4337 (Account Abstraction) to execute user operations through a bundler.

- **Bundler**: The bundler is responsible for submitting user operations to the blockchain. The toolkit uses Pimlico's bundler service by default.

## Common Issues and Troubleshooting

### UserOperation Reverted During Simulation

If you see an error like `UserOperation reverted during simulation with reason: 0x3db6791c`, it could be due to:

1. **Insufficient Funds**: The delegator or delegate account may not have enough ETH to cover gas costs.
2. **Invalid Delegation**: The delegation may have expired or have invalid caveats.
3. **Bundler Issues**: The bundler may be rejecting the user operation due to gas price or other issues.


### Empty Error Code: 0x

When executing delegations, you may encounter an error with an empty reason code (`0x`) during user operation simulation. This error appears as:

```
UserOperationExecutionError: Execution reverted with reason: UserOperation reverted during simulation with reason: 0x.
```

This error can occur for several reasons:

1. **Gas Estimation Issues**: The bundler may be unable to properly estimate the gas required for the operation.
2. **Smart Account Deployment**: If the delegator account is not yet deployed, the deployment process might be failing.
3. **Paymaster Configuration**: Issues with the paymaster configuration or insufficient funds in the paymaster.
4. **Delegation Framework Compatibility**: The delegation parameters might not be compatible with the current version of the framework.

To troubleshoot this issue:

1. Check that your delegator and delegate accounts have sufficient ETH.
2. Verify that the bundler service is properly configured and accessible.
3. Try simplifying the execution by reducing the complexity of the calls being made.
4. Check the console logs for additional error details that might provide more context.

The toolkit includes error handling to provide more information when this error occurs, but due to the nature of the empty reason code, additional debugging may be required.

### EIP-7715 Permissions Integration

While the toolkit includes code for EIP-7715 permissions in `permissions.ts`, this functionality is not fully integrated into the main delegation flow in the current version. The EIP-7715 standard provides a standardized format for off-chain permission management between wallets and dApps, which complements the on-chain delegation capabilities.

To use the EIP-7715 permissions functionality:

1. Import the permission utilities from `permissions.ts`:
   ```typescript
   import { createPermissionRequest } from "./permissions";
   ```

2. Create a permission request before or alongside your delegation:
   ```typescript
   const permissionRequest = await createPermissionRequest(
     delegateAccount,
     delegatorAccount.address,
     "Your dApp name",
     ["requested:permission:type"]
   );
   ```

3. Handle the permission request in your application flow, typically by presenting it to the user for approval.

Future versions of this toolkit will more tightly integrate the EIP-7715 permissions with the delegation flow to provide a complete permissions management solution.

### Connection Issues

If you have trouble connecting to the RPC or bundler:

1. **Check RPC URL**: Ensure your RPC URL is correct and the service is available.
2. **Check Bundler URL**: Ensure your bundler URL is correct and the service is available.
3. **API Keys**: If using services that require API keys, ensure they are valid.

## Extending the Toolkit

### Custom Delegations

You can modify the `createDelegation` function in `create-delegation.ts` to create delegations with different caveats:

```typescript
const caveats = createCaveatBuilder(delegatorAccount.environment)
  .addCaveat("allowedTargets", [yourTargetAddress])
  .addCaveat("valueLte", maxEthValue);
```

### Custom Executions

You can modify the `executions` array in `executeOnBehalfOfDelegator` to perform different actions:

```typescript
const executions: ExecutionStruct[] = [
  {
    target: yourContractAddress,
    value: ethAmount,
    callData: yourContractCalldata,
  },
];
```

## Resources

- [MetaMask Delegation Framework Documentation](https://docs.metamask.io/delegation/)
- [ERC-4337 (Account Abstraction) Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [ERC-7715 Permission Standard](https://eips.ethereum.org/EIPS/eip-7715)
- [Pimlico Bundler Documentation](https://docs.pimlico.io/)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 