import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [sveltekit()],
    
    // Make env variables available
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL)
    },
    
    server: {
      host: '0.0.0.0',
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '.loca.lt'  // Allow all localtunnel subdomains
      ]
    }
  }
});