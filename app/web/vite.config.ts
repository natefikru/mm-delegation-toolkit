import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from root directory
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '../../'), '')
  
  // Process env vars to have VITE_ prefix
  const processedEnv = Object.entries(rootEnv).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[`VITE_${key}`] = value
    return acc
  }, {})

  return {
    plugins: [react()],
    define: {
      // Make env variables available to the client
      'import.meta.env': { ...processedEnv }
    }
  }
})
