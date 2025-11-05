import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/database.types";

const projectUrl = import.meta.env.VITE_SUPABASE_URL || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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

let MySupabaseClient: SupabaseClient<Database> | null = null;

export async function initializeSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  try {
    if (!projectUrl || !anonKey) {
      console.warn("Supabase credentials not provided. Analytics features will be disabled.");
      return null;
    }

    const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/;
    if (!urlPattern.test(projectUrl)) {
      console.warn("Invalid Supabase URL format. Expected format: https://your-project.supabase.co");
      return null;
    }

    const client = createClient<Database>(projectUrl, anonKey, supabaseConfig);
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

let clientPromise: Promise<void> | null = null;

if (!clientPromise) {
  clientPromise = initializeSupabaseClient().then(client => {
    MySupabaseClient = client;
  }).catch(console.error);
}

export const isSupabaseEnabled = (): boolean => {
  return MySupabaseClient !== null && projectUrl !== "" && anonKey !== "";
};

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  return MySupabaseClient;
};

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
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  return null;
};

export default MySupabaseClient;
