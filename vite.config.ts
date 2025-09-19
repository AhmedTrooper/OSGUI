import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Exclude node_modules from transformation
        exclude: [/node_modules/],
        // Include TypeScript files
        include: "**/*.{jsx,tsx}",
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@/components": path.resolve(__dirname, "src/components"),
        "@/store": path.resolve(__dirname, "src/store"),
        "@/interfaces": path.resolve(__dirname, "src/interfaces"),
        "@/lib": path.resolve(__dirname, "src/lib"),
        "@/routes": path.resolve(__dirname, "src/routes"),
        "@/ui": path.resolve(__dirname, "src/ui"),
        "@/assets": path.resolve(__dirname, "src/assets"),
        "@/utils": path.resolve(__dirname, "src/utils"),
        "@/hooks": path.resolve(__dirname, "src/hooks"),
        "@/types": path.resolve(__dirname, "src/types"),
      },
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },

    // CSS processing
    css: {
      devSourcemap: command === 'serve',
      modules: {
        localsConvention: 'camelCaseOnly',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },

    // Build optimizations
    build: {
      // Generate sourcemaps for production debugging
      sourcemap: mode === 'development' ? true : 'hidden',
      
      // Reduce bundle size
      minify: 'esbuild',
      
      // Target modern browsers for better performance
      target: 'esnext',
      
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-ui': ['@heroui/react', 'framer-motion'],
            'vendor-icons': ['lucide-react', 'react-icons'],
            'vendor-utils': ['lodash', 'nanoid', 'clsx'],
            'vendor-tauri': ['@tauri-apps/api'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-zustand': ['zustand'],
          },
          // Optimize chunk file names
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name?.includes('vendor')) {
              return 'vendor/[name]-[hash].js';
            }
            return 'chunks/[name]-[hash].js';
          },
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
              return 'images/[name]-[hash][extname]';
            }
            if (/css/i.test(extType ?? '')) {
              return 'styles/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // Optimize dependencies
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },

    // Development server configuration
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**", "**/node_modules/**"],
      },
      // Enable CORS for development
      cors: true,
      // Optimize file serving
      fs: {
        strict: true,
        allow: ['.'],
      },
    },

    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
      host: true,
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@heroui/react',
        'framer-motion',
        'zustand',
        'lodash',
        'nanoid',
        'lucide-react',
      ],
      exclude: [
        '@tauri-apps/api',
        '@tauri-apps/plugin-clipboard-manager',
        '@tauri-apps/plugin-fs',
        '@tauri-apps/plugin-notification',
        '@tauri-apps/plugin-opener',
        '@tauri-apps/plugin-os',
        '@tauri-apps/plugin-shell',
        '@tauri-apps/plugin-sql',
        '@tauri-apps/plugin-store',
      ],
    },

    clearScreen: false,
  };
});
