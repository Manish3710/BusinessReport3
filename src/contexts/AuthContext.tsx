import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { activityLogger } from '../services/activityLogger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedUserId = localStorage.getItem('userId');

        if (storedUser && storedUserId) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (supabaseError) {
        console.error('Database error:', supabaseError);
        setError('Failed to authenticate. Please try again.');
        setIsLoading(false);
        return false;
      }

      if (!data) {
        setError('Invalid username or password.');
        setIsLoading(false);
        return false;
      }

      if (password !== data.password_hash) {
        setError('Invalid username or password.');
        setIsLoading(false);
        return false;
      }

      if (!data.is_active) {
        setError('User account is deactivated. Please contact administrator.');
        setIsLoading(false);
        return false;
      }

      const appUser: User = {
        id: data.id,
        username: data.username,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role as 'admin' | 'user',
        isActive: data.is_active,
        createdAt: data.created_at,
        lastLogin: new Date().toISOString()
      };

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      setUser(appUser);
      localStorage.setItem('user', JSON.stringify(appUser));
      localStorage.setItem('userId', data.user_id);

      await activityLogger.logLogin(data.user_id, data.username);

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await activityLogger.logLogout();
    } catch (error) {
      console.error('Error logging logout activity:', error);
    }
    setUser(null);
    setError('');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Starting registration for:', userData.username);

      if (!userData.password || userData.password.trim() === '') {
        const errorMsg = 'Password is required.';
        console.error('Password is missing');
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', userData.username)
        .maybeSingle();

      if (existingUsername) {
        const errorMsg = 'Username already exists. Please choose a different username.';
        console.error('Username already exists');
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingEmail) {
        const errorMsg = 'Email already exists. Please use a different email.';
        console.error('Email already exists');
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      const { data: existingUsers } = await supabase
        .from('users')
        .select('user_id')
        .order('created_at', { ascending: false });

      let maxId = 0;
      if (existingUsers && existingUsers.length > 0) {
        existingUsers.forEach(user => {
          const userId = user.user_id;
          const numericPart = userId.replace(/^(USR|USER)/, '');
          const idNum = parseInt(numericPart) || 0;
          if (idNum > maxId) {
            maxId = idNum;
          }
        });
      }
      const newUserId = `USR${String(maxId + 1).padStart(4, '0')}`;

      console.log('Generated user_id:', newUserId);

      const insertData = {
        user_id: newUserId,
        username: userData.username.trim(),
        email: userData.email.trim(),
        password_hash: userData.password,
        first_name: userData.firstName.trim(),
        last_name: userData.lastName.trim(),
        role: userData.role || 'user',
        is_active: true
      };

      console.log('Inserting user data:', { ...insertData, password_hash: '***' });

      const { data: insertedData, error: insertError } = await supabase
        .from('users')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Registration insert error:', insertError);
        console.error('Error code:', insertError.code);
        console.error('Error details:', insertError.details);
        console.error('Error hint:', insertError.hint);

        let errorMsg = 'Registration failed. Please try again.';
        if (insertError.message.includes('unique') || insertError.code === '23505') {
          errorMsg = 'Username or email already exists.';
        } else if (insertError.message.includes('null value')) {
          errorMsg = 'All fields are required. Please fill out the form completely.';
        } else {
          errorMsg = `Registration failed: ${insertError.message}`;
        }

        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      console.log('Registration successful:', insertedData);
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      console.error('Registration exception:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      const errorMsg = `Registration failed: ${error?.message || 'Unknown error'}`;
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const clearError = () => {
    setError('');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};