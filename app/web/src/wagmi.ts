import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { anvilChain } from './config'
import { injected } from 'wagmi/connectors'

// Configure wagmi client
export const config = createConfig({
  chains: [anvilChain, mainnet, sepolia],
  transports: {
    [anvilChain.id]: http(anvilChain.rpcUrls.default.http[0]),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [
    injected()
  ],
}) 