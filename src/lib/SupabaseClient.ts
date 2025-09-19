import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/database.types";

// Environment variables with fallbacks for development
const projectUrl = import.meta.env.VITE_SUPABASE_URL || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Configuration options for Supabase client
const supabaseConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'User-Agent': 'OSGUI-Desktop-App',
    },
  },
  db: {
    schema: 'public' as const,
  },
};

// Type-safe Supabase client
let MySupabaseClient: SupabaseClient<Database> | null = null;

// Initialize Supabase client with proper error handling
export async function initializeSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  try {
    // Only initialize if both URL and key are provided
    if (!projectUrl || !anonKey) {
      console.warn("Supabase credentials not provided. Analytics features will be disabled.");
      return null;
    }

    // Validate URL format
    const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/;
    if (!urlPattern.test(projectUrl)) {
      console.warn("Invalid Supabase URL format. Expected format: https://your-project.supabase.co");
      return null;
    }

    const client = createClient<Database>(projectUrl, anonKey, supabaseConfig);
    
    // Test the connection
    try {
      await client
        .from('UniversalApplicationUsages')
        .select('count', { count: 'exact', head: true });
      console.info("Supabase client initialized successfully");
    } catch (err) {
      console.warn("Supabase connection test failed:", err);
    }
    
    MySupabaseClient = client;
    return MySupabaseClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
};

// Initialize the client asynchronously
let clientPromise: Promise<void> | null = null;

if (!clientPromise) {
  clientPromise = initializeSupabaseClient().then(client => {
    MySupabaseClient = client;
  }).catch(console.error);
}

// Export utilities
export const isSupabaseEnabled = (): boolean => {
  return MySupabaseClient !== null && projectUrl !== "" && anonKey !== "";
};

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  return MySupabaseClient;
};

// Retry mechanism for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error("Max retries reached. Operation failed.");
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  return null;
};

// Default export for backward compatibility
export default MySupabaseClient;
