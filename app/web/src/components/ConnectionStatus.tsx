import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { anvilChain } from '../config';

/**
 * ConnectionStatus component displays the current connection status
 * and provides buttons to connect/disconnect from the wallet
 */
function ConnectionStatus() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="connection-status">
      {isConnected ? (
        <div>
          <p>Connected to {anvilChain.name}</p>
          <p>Address: {address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      ) : (
        <div>
          <p>Not connected</p>
          <button onClick={() => connect({ connector: connectors[0] })}>
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus; 