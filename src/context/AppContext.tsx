import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Transaction, SavingGoal, RecurringTransaction, SmartAlert, DashboardStats } from '../types';
import { supabase } from '../lib/supabase';
import { 
  mockUsers, 
  mockTransactions, 
  mockSavingGoals, 
  mockRecurringTransactions, 
  mockSmartAlerts, 
  demoCredentials 
} from '../utils/mockData';

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  transactions: Transaction[];
  savingGoals: SavingGoal[];
  recurringTransactions: RecurringTransaction[];
  smartAlerts: SmartAlert[];
  
  addTransaction: (transaction: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string) => Promise<void>;
  
  addSavingGoal: (goal: Omit<SavingGoal, 'id' | 'user_id' | 'current_amount'>) => Promise<void>;
  updateSavingGoal: (id: string, updates: Partial<SavingGoal>) => Promise<void>;
  deleteSavingGoal: (id: string) => Promise<void>;
  
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, 'id' | 'user_id'>) => Promise<void>;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  
  markAlertAsRead: (id: string) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  
  refreshData: () => Promise<void>;
  getDashboardStats: () => DashboardStats;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);

  const isAuthenticated = !!currentUser;

  // Función unificada para limpiar datos
  const clearData = () => {
    setTransactions([]);
    setSavingGoals([]);
    setRecurringTransactions([]);
    setSmartAlerts([]);
  };

  // Función unificada para limpiar el almacenamiento
  const clearStorage = () => {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('finanzasduo.session');
    sessionStorage.clear();
  };

  // Función para limpiar completamente el estado
  const clearAll = () => {
    setCurrentUser(null);
    setIsDemoMode(false);
    clearData();
    clearStorage();
  };

  // Función para cerrar sesión
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      clearAll();
      await supabase.auth.refreshSession();
    } catch (error) {
      console.error('Error during logout:', error);
      clearAll(); // Forzar limpieza incluso si hay error
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      clearAll(); // Limpiar estado antes de iniciar sesión

      if (email === demoCredentials.email && password === demoCredentials.password) {
        setIsLoading(true);
        setTimeout(() => {
          setCurrentUser(mockUsers[0]);
          setIsDemoMode(true);
          setTransactions(mockTransactions);
          setSavingGoals(mockSavingGoals);
          setRecurringTransactions(mockRecurringTransactions);
          setSmartAlerts(mockSmartAlerts);
          setIsLoading(false);
        }, 500);
        return true;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        console.error('Login error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Login error:', error);
      clearAll();
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, 
        password, 
        options: { 
          data: { name } 
        }
      });
      if (error) throw error;
      return !!data.user;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const [transactionsRes, goalsRes, recurringRes, alertsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('saving_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('recurring_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('smart_alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (transactionsRes.error || goalsRes.error || recurringRes.error || alertsRes.error) {
        throw new Error('Error loading user data');
      }

      setTransactions(transactionsRes.data || []);
      setSavingGoals(goalsRes.data || []);
      setRecurringTransactions(recurringRes.data || []);
      setSmartAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Error loading user data:', error);
      clearData();
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          clearAll();
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          throw new Error('Profile not found');
        }

        setCurrentUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar
        });
        await loadUserData(session.user.id);
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAll();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearAll();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!currentUser) return;

    try {
      if (isDemoMode) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Implementación del resto de las funciones del contexto...
  const refreshData = async () => {
    if (currentUser && !isDemoMode) {
      await loadUserData(currentUser.id);
    }
  };

  const getDashboardStats = (): DashboardStats => {
    const approvedTransactions = transactions.filter(t => t.status === 'approved');
    const totalIncome = approvedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = approvedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSavings = approvedTransactions
      .filter(t => t.type === 'saving')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpenses - totalSavings;
    return { totalIncome, totalExpenses, totalSavings, balance };
  };

  const contextValue: AppContextType = {
    currentUser,
    isAuthenticated,
    isDemoMode,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    transactions,
    savingGoals,
    recurringTransactions,
    smartAlerts,
    addTransaction: async () => {},
    updateTransaction: async () => {},
    deleteTransaction: async () => {},
    approveTransaction: async () => {},
    rejectTransaction: async () => {},
    addSavingGoal: async () => {},
    updateSavingGoal: async () => {},
    deleteSavingGoal: async () => {},
    addRecurringTransaction: async () => {},
    updateRecurringTransaction: async () => {},
    deleteRecurringTransaction: async () => {},
    markAlertAsRead: async () => {},
    deleteAlert: async () => {},
    refreshData,
    getDashboardStats,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};