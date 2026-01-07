import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          user_id: string | null;
          username: string;
          email: string;
          password_hash: string;
          first_name: string;
          last_name: string;
          role: 'admin' | 'user';
          is_active: boolean;
          created_at: string;
          last_login: string | null;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          username: string;
          email: string;
          password_hash: string;
          first_name: string;
          last_name: string;
          role?: 'admin' | 'user';
          is_active?: boolean;
          created_at?: string;
          last_login?: string;
          created_by?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          email?: string;
          password_hash?: string;
          first_name?: string;
          last_name?: string;
          role?: 'admin' | 'user';
          is_active?: boolean;
          created_at?: string;
          last_login?: string;
          created_by?: string;
          updated_at?: string;
        };
      };
      instant_reports: {
        Row: {
          id: string;
          report_id: string | null;
          report_name: string;
          query_text: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id?: string;
          report_name: string;
          query_text: string;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          report_name?: string;
          query_text?: string;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
