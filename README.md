# MetaMask Delegation Toolkit

This toolkit provides a set of tools for creating and redeeming delegations using the MetaMask Delegation Framework.

## Prerequisites

- Node.js v18 or higher
- Git
- Foundry (for local development with Anvil)
- pnpm (for running the Alto bundler)

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

3. Set up environment variables:
   ```
   cp .env.example .env
   ```

## Running the Toolkit

### 1. Start Anvil (Local Blockchain)

```
npm run start-anvil
```

This will start a local Anvil blockchain with a 12-second block time.

### 2. Deploy Contracts

```
npm run deploy-contracts
```

This will deploy the EntryPoint contract and other necessary contracts to the local Anvil blockchain. The script will:
- Deploy the EntryPoint contract
- Deploy the DelegationManager contract
- Deploy the DeleGator implementations (MultiSig and Hybrid)
- Update the `.env` file with the deployed contract addresses

### 3. Start the Alto Bundler

```
npm run start-bundler
```

This will set up and run the Pimlico Alto bundler, which is required for processing user operations. The bundler will:
- Clone the Alto bundler repository if it doesn't exist
- Install dependencies and build the bundler
- Start the bundler with the correct configuration
- Update the `.env` file with the bundler URL

### 4. Create a Delegation

```
npm run create-delegation
```

This will create a delegation from a delegator to a delegate and save it to `delegation.json`. The script will:
- Generate a random salt for the delegation
- Create a delegation from the delegator to the delegate
- Sign the delegation with the delegator's private key
- Save the delegation to `delegation.json`

### 5. Redeem a Delegation

```
npm run redeem-delegation
```

This will redeem the delegation by sending a user operation through the Alto bundler. The script will:
- Read the delegation from `delegation.json`
- Verify the delegation data
- Create a smart account for the delegate
- Fund the smart account if necessary
- Create and sign a user operation to transfer ETH
- Send the user operation to the Alto bundler
- Wait for the user operation to be included in a block
- Save the transaction details to `redemption-result.json`

## Full Flow

To run the entire flow in one command:

```
npm run full-flow
```

This will:
1. Start Anvil
2. Deploy contracts
3. Start the Alto bundler
4. Create a delegation
5. Redeem the delegation

## Stopping Services

To stop all running services:

```
npm run kill-all
```

This will stop Anvil and the Alto bundler.

## Configuration

The toolkit uses the following environment variables:

- `RPC_URL`: The URL of the RPC endpoint (default: http://localhost:8545)
- `CHAIN_ID`: The chain ID (default: 31337 for Anvil)
- `PRIVATE_KEY`: The private key to use for transactions
- `ENTRYPOINT_ADDRESS`: The address of the EntryPoint contract
- `DELEGATION_MANAGER_ADDRESS`: The address of the DelegationManager contract
- `HYBRID_DELEGATOR_ADDRESS`: The address of the HybridDelegator contract
- `MULTISIG_DELEGATOR_ADDRESS`: The address of the MultiSigDelegator contract
- `BUNDLER_URL`: The URL of the bundler (default: http://localhost:3000)

## Using the Pimlico Alto Bundler

The toolkit uses the Pimlico Alto bundler for processing user operations. The bundler is configured to work with the local Anvil blockchain and the deployed EntryPoint contract.

The bundler is started with the following parameters:
- EntryPoint address: The address of the deployed EntryPoint contract
- RPC URL: The URL of the local Anvil blockchain
- Executor private key: The private key to use for executing transactions
- Utility private key: The private key to use for utility operations
- Chain ID: The chain ID of the local Anvil blockchain
- Safe mode: Disabled for local development
- Deploy simulations contract: Enabled for local development

## Troubleshooting

### Bundler Issues

If you encounter issues with the bundler, check the logs in `alto-bundler.log`. Common issues include:
- Port 3000 already in use: Stop any other services using port 3000 or change the bundler port
- EntryPoint contract not deployed: Make sure to run `npm run deploy-contracts` before starting the bundler
- Utility private key issues: Make sure the utility private key is correctly set in the bundler configuration

### Contract Deployment Issues

If you encounter issues with contract deployment, make sure Anvil is running and try redeploying the contracts. Common issues include:
- Anvil not running: Start Anvil with `npm run start-anvil`
- Contract size limits: Some contracts may exceed the size limit, but the deployment script will continue

### Delegation Issues

If you encounter issues with delegation creation or redemption, make sure the bundler is running and the contracts are deployed correctly. Common issues include:
- Invalid signature: Make sure the delegator's private key is correctly set
- Insufficient funds: Make sure the delegator has sufficient funds
- Bundler errors: Check the bundler logs for errors

## Advanced Usage

### Custom Delegations

You can create custom delegations by modifying the `create-delegation.ts` script. The script supports:
- Custom delegator and delegate addresses
- Custom delegation parameters
- Custom delegation types (MultiSig or Hybrid)

### Custom User Operations

You can create custom user operations by modifying the `redeem-delegation.ts` script. The script supports:
- Custom callData for the user operation
- Custom gas parameters
- Custom paymaster configuration

### Using with Different Networks

To use the toolkit with different networks, update the `.env` file with the appropriate values:
- Set `RPC_URL` to the URL of the network's RPC endpoint
- Set `CHAIN_ID` to the chain ID of the network
- Deploy the contracts to the network and update the contract addresses
- Configure the bundler for the network

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 