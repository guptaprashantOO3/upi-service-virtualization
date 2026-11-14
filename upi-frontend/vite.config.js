import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const orchestratorTarget = env.VITE_ORCHESTRATOR_URL || 'http://localhost:8080'
  const virtualNetworkTarget = env.VITE_VIRTUAL_NETWORK_URL || 'http://localhost:8081'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: orchestratorTarget,
          changeOrigin: true,
          secure: false,
        },
        '/virtual': {
          target: virtualNetworkTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
