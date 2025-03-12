import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from './wagmi.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import { createDelegation, createDelegatorAccount, redeemDelegation, type DelegationResult, type MetaMaskAccount } from './services/delegation';
import { privateKeyToAccount } from 'viem/accounts';
import { DEFAULT_PRIVATE_KEY, CONTRACT_ADDRESSES } from './config';
import ConnectionStatus from './components/ConnectionStatus';
import { logEnvironmentStatus } from './utils/checkEnv';

// Create a client for React Query
const queryClient = new QueryClient();

function DelegationDemo() {
  const [loading, setLoading] = useState(false);
  const [delegationResult, setDelegationResult] = useState<DelegationResult | null>(null);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    transactionHash: string;
  } | null>(null);
  const [delegateAddress, setDelegateAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('0.01');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [delegatorAccount, setDelegatorAccount] = useState<string | null>(null);
  const [delegateAccount, setDelegateAccount] = useState<string | null>(null);
  const [delegatorSmartAccount, setDelegatorSmartAccount] = useState<MetaMaskAccount | null>(null);

  // Initialize with default accounts
  useEffect(() => {
    try {
      // Validate the private key
      if (!DEFAULT_PRIVATE_KEY || typeof DEFAULT_PRIVATE_KEY !== 'string' || !DEFAULT_PRIVATE_KEY.startsWith('0x')) {
        console.error('Invalid private key format in useEffect');
        return;
      }
      
      const delegatorOwner = privateKeyToAccount(DEFAULT_PRIVATE_KEY as `0x${string}`);
      console.log('Initialized delegator owner with address:', delegatorOwner.address);
      setDelegatorAccount(delegatorOwner.address);
      
      // For demo purposes, we'll use the same account as both delegator and delegate
      setDelegateAccount(delegatorOwner.address);
      
      // We'll initialize the smart account only when the user clicks the button
      // This ensures all environment variables are properly loaded
      console.log('Smart account will be initialized when creating delegation');
    } catch (err) {
      console.error('Error initializing accounts:', err);
    }
  }, []);

  const handleCreateDelegation = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check environment variables first
      const envOk = logEnvironmentStatus();
      if (!envOk) {
        throw new Error('Missing required environment variables. Check the console for details.');
      }
      
      // Use the delegate address from input or default to the delegate account
      const targetDelegateAddress = delegateAddress || delegateAccount;
      
      if (!targetDelegateAddress) {
        throw new Error('No delegate address provided');
      }
      
      if (!delegatorAccount) {
        throw new Error('No delegator account available');
      }

      console.log('Using private key:', DEFAULT_PRIVATE_KEY);
      
      // Validate the private key
      if (!DEFAULT_PRIVATE_KEY || typeof DEFAULT_PRIVATE_KEY !== 'string' || !DEFAULT_PRIVATE_KEY.startsWith('0x')) {
        throw new Error('Invalid private key format. Must be a hex string starting with 0x');
      }

      // First, create a delegator smart account if we don't have one yet
      let smartAccount: MetaMaskAccount;
      try {
        console.log('Creating delegator smart account...');
        
        smartAccount = delegatorSmartAccount || await createDelegatorAccount(DEFAULT_PRIVATE_KEY as `0x${string}`);
        if (!delegatorSmartAccount) {
          setDelegatorSmartAccount(smartAccount);
        }
        console.log('Created delegator smart account:', smartAccount.address);
      } catch (err) {
        console.error('Error creating delegator smart account:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to create delegator account: ${errorMessage}`);
      }
      
      // Now create the delegation using the smart account
      try {
        console.log('Creating delegation with parameters:', {
          delegatorAddress: smartAccount.address,
          delegateAddress: targetDelegateAddress,
        });
        
        const result = await createDelegation(
          smartAccount.address,
          targetDelegateAddress as `0x${string}`,
          smartAccount
        );
        
        setDelegationResult(result);
        console.log('Delegation created successfully:', result);
      } catch (err) {
        console.error('Error in createDelegation:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to create delegation: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Error in handleCreateDelegation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemDelegation = async () => {
    if (!delegationResult) {
      setError('No delegation to redeem');
      return;
    }

    if (!recipientAddress) {
      setError('Please enter a recipient address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await redeemDelegation({
        delegation: delegationResult.signedDelegation,
        recipientAddress,
        amount: transferAmount
      });
      setRedeemResult(result);
      console.log('Delegation redeemed:', result);
    } catch (err) {
      console.error('Error redeeming delegation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delegation-demo">
      <h2>MetaMask Delegation Demo</h2>
      
      <div className="info-panel">
        <h3>Contract Addresses</h3>
        <div className="address-list">
          <div className="address-item">
            <span className="label">EntryPoint:</span>
            <span className="address">{CONTRACT_ADDRESSES.ENTRY_POINT}</span>
          </div>
          <div className="address-item">
            <span className="label">DelegationManager:</span>
            <span className="address">{CONTRACT_ADDRESSES.DELEGATION_MANAGER}</span>
          </div>
          <div className="address-item">
            <span className="label">HybridDelegator:</span>
            <span className="address">{CONTRACT_ADDRESSES.HYBRID_DELEGATOR}</span>
          </div>
        </div>
      </div>
      
      <div className="account-panel">
        <div className="account-box">
          <h3>Delegator</h3>
          <p className="account-address">{delegatorAccount || 'Loading...'}</p>
          <p className="account-description">This is the account that will grant permission to the delegate.</p>
        </div>
        
        <div className="arrow">→</div>
        
        <div className="account-box">
          <h3>Delegate</h3>
          <p className="account-address">{delegateAccount || 'Loading...'}</p>
          <p className="account-description">This is the account that will receive permission to act on behalf of the delegator.</p>
        </div>
      </div>
      
      <div className="card">
        <h3>Step 1: Create Delegation</h3>
        <p>Create an unrestricted delegation from the delegator to the delegate.</p>
        
        <div className="input-group">
          <label htmlFor="delegateAddress">Custom Delegate Address (optional):</label>
          <input
            id="delegateAddress"
            type="text"
            value={delegateAddress}
            onChange={(e) => setDelegateAddress(e.target.value)}
            placeholder="0x..."
          />
          <small>Leave empty to use the default delegate address</small>
        </div>
        
        <button
          onClick={handleCreateDelegation}
          disabled={loading}
          className="primary-button"
        >
          {loading ? 'Creating...' : 'Request Permission (Create Delegation)'}
        </button>
        
        {delegationResult && (
          <div className="result">
            <h4>Delegation Created Successfully!</h4>
            <p>Delegator: {delegationResult.delegatorAccount.address}</p>
            <p>Delegate: {delegationResult.signedDelegation.delegate}</p>
            <details>
              <summary>View EIP-7715 Format</summary>
              <pre>{JSON.stringify(delegationResult.eip7715Format, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
      
      <div className="card">
        <h3>Step 2: Redeem Delegation</h3>
        <p>Redeem the delegation to execute a transaction on behalf of the delegator.</p>
        
        <div className="input-group">
          <label htmlFor="recipientAddress">Recipient Address:</label>
          <input
            id="recipientAddress"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="transferAmount">Amount (ETH):</label>
          <input
            id="transferAmount"
            type="text"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
          />
        </div>
        
        <button
          onClick={handleRedeemDelegation}
          disabled={loading || !delegationResult}
          className="primary-button"
        >
          {loading ? 'Redeeming...' : 'Redeem Delegation (Execute Transaction)'}
        </button>
        
        {redeemResult && (
          <div className="result">
            <h4>Delegation Redeemed Successfully!</h4>
            <p>{redeemResult.message}</p>
            <p>
              In a real implementation, this would transfer {transferAmount} ETH to {recipientAddress}
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="error">
          <p>Error: {error}</p>
        </div>
      )}
      
      <div className="workflow-diagram">
        <h3>Delegation Workflow</h3>
        <div className="workflow-steps">
          <div className="workflow-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Create Delegation</h4>
              <p>Delegator creates and signs a delegation for the delegate</p>
            </div>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Return EIP-7715 Format</h4>
              <p>Delegation is formatted according to EIP-7715</p>
            </div>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Redeem Delegation</h4>
              <p>Delegate uses the delegation to execute transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="app">
          <header>
            <h1>MetaMask Delegation Toolkit Demo</h1>
            <p className="subtitle">A demonstration of EIP-7710 and EIP-7715 delegation</p>
            <ConnectionStatus />
          </header>
          <main>
            <DelegationDemo />
          </main>
          <footer>
            <p>Built with MetaMask Delegation Toolkit</p>
            <p>
              <a href="https://docs.gator.metamask.io/" target="_blank" rel="noopener noreferrer">Documentation</a> |
              <a href="https://eips.ethereum.org/EIPS/eip-7710" target="_blank" rel="noopener noreferrer">EIP-7710</a> |
              <a href="https://eips.ethereum.org/EIPS/eip-7715" target="_blank" rel="noopener noreferrer">EIP-7715</a>
            </p>
          </footer>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
