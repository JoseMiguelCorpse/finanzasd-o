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

const generateId = () => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
    return (globalThis as any).crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 11)}`;
};

const sortTransactionsByDate = (items: Transaction[]) =>
  [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const sanitizePayload = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Partial<T>;

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>;

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
      setIsLoading(true);
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      let profile = profileData;

      if (profileError || !profile) {
        const fallbackProfile = {
          id: data.user.id,
          email: data.user.email ?? email,
          name: (data.user.user_metadata as any)?.name ?? data.user.email ?? 'Sin nombre',
          avatar: (data.user.user_metadata as any)?.avatar ?? null
        };

        const { data: createdProfile, error: createProfileError } = await supabase
          .from('profiles')
          .upsert(fallbackProfile)
          .select()
          .single();

        if (createProfileError || !createdProfile) {
          console.error('Error creating profile after login:', createProfileError);
          return false;
        }

        profile = createdProfile;
      }

      // Establecer el usuario actual
      setCurrentUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar
      });

      // Cargar los datos del usuario
      await loadUserData(data.user.id);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      clearAll();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        const message =
          error.status === 429
            ? 'Has intentado registrarte demasiadas veces. Por favor, espera antes de volver a intentarlo.'
            : error.message || 'No se pudo completar el registro.';
        return { success: false, message };
      }

      if (!data.user) {
        return {
          success: false,
          message: 'No se pudo crear la cuenta. Intentalo de nuevo en unos minutos.'
        };
      }

      if (data.session) {
        const profilePayload = {
          id: data.user.id,
          email,
          name,
          avatar: (data.user.user_metadata as any)?.avatar ?? null
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profilePayload);

        if (profileError) {
          console.warn('Profile creation deferred until confirmation:', profileError);
        }
      } else {
        console.info('Skipping profile upsert until email confirmation is completed.');
      }

      return {
        success: true,
        message: 'Registro exitoso! Revisa tu email para confirmar tu cuenta.'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error?.message || 'No se pudo completar el registro.'
      };
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

  const markAlertAsRead = async (id: string): Promise<void> => {
    try {
      if (isDemoMode) {
        setSmartAlerts(prev => 
          prev.map(alert => 
            alert.id === id ? { ...alert, read: true } : alert
          )
        );
        return;
      }

      const { error } = await supabase
        .from('smart_alerts')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setSmartAlerts(prev => 
        prev.map(alert => 
          alert.id === id ? { ...alert, read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw error;
    }
  };

  const deleteAlert = async (id: string): Promise<void> => {
    try {
      if (isDemoMode) {
        setSmartAlerts(prev => prev.filter(alert => alert.id !== id));
        return;
      }

      const { error } = await supabase
        .from('smart_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSmartAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id'>): Promise<void> => {
    try {
      if (isDemoMode) {
        const newTransaction: Transaction = {
          id: generateId(),
          user_id: currentUser?.id ?? mockUsers[0].id,
          ...transaction
        };
        setTransactions(prev => sortTransactionsByDate([newTransaction, ...prev]));
        return;
      }

      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      await supabase.from('transactions').insert({
        ...transaction,
        goal_id: transaction.goal_id ?? null,
        user_id: currentUser.id
      });

      await refreshData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<void> => {
    try {
      if (isDemoMode) {
        setTransactions(prev =>
          sortTransactionsByDate(
            prev.map(transaction =>
              transaction.id === id ? { ...transaction, ...updates } : transaction
            )
          )
        );
        return;
      }

      const payload = sanitizePayload({
        ...updates,
        goal_id: updates.goal_id ?? undefined
      });

      await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id);

      await refreshData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    try {
      if (isDemoMode) {
        setTransactions(prev => prev.filter(transaction => transaction.id !== id));
        return;
      }

      await supabase.from('transactions').delete().eq('id', id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const approveTransaction = async (id: string): Promise<void> => {
    await updateTransaction(id, { status: 'approved' });
  };

  const rejectTransaction = async (id: string): Promise<void> => {
    await updateTransaction(id, { status: 'rejected' });
  };

  const addSavingGoal = async (
    goal: Omit<SavingGoal, 'id' | 'user_id' | 'current_amount'>
  ): Promise<void> => {
    try {
      if (isDemoMode) {
        const newGoal: SavingGoal = {
          id: generateId(),
          user_id: currentUser?.id ?? mockUsers[0].id,
          current_amount: 0,
          ...goal,
          deadline: goal.deadline || undefined
        };
        setSavingGoals(prev => [newGoal, ...prev]);
        return;
      }

      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      await supabase.from('saving_goals').insert({
        ...goal,
        user_id: currentUser.id,
        current_amount: 0,
        deadline: goal.deadline || null
      });

      await refreshData();
    } catch (error) {
      console.error('Error adding saving goal:', error);
      throw error;
    }
  };

  const updateSavingGoal = async (id: string, updates: Partial<SavingGoal>): Promise<void> => {
    try {
      if (isDemoMode) {
        setSavingGoals(prev =>
          prev.map(goal => (goal.id === id ? { ...goal, ...updates } : goal))
        );
        return;
      }

      const payload = sanitizePayload({
        ...updates,
        deadline:
          updates.deadline === '' ? null : updates.deadline === undefined ? undefined : updates.deadline
      });

      await supabase.from('saving_goals').update(payload).eq('id', id);
      await refreshData();
    } catch (error) {
      console.error('Error updating saving goal:', error);
      throw error;
    }
  };

  const deleteSavingGoal = async (id: string): Promise<void> => {
    try {
      if (isDemoMode) {
        setSavingGoals(prev => prev.filter(goal => goal.id !== id));
        return;
      }

      await supabase.from('saving_goals').delete().eq('id', id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting saving goal:', error);
      throw error;
    }
  };

  const addRecurringTransaction = async (
    recurring: Omit<RecurringTransaction, 'id' | 'user_id'>
  ): Promise<void> => {
    try {
      if (isDemoMode) {
        const newRecurring: RecurringTransaction = {
          id: generateId(),
          user_id: currentUser?.id ?? mockUsers[0].id,
          ...recurring
        };
        setRecurringTransactions(prev => [newRecurring, ...prev]);
        return;
      }

      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      await supabase
        .from('recurring_transactions')
        .insert({
          ...recurring,
          user_id: currentUser.id
        });

      await refreshData();
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      throw error;
    }
  };

  const updateRecurringTransaction = async (
    id: string,
    updates: Partial<RecurringTransaction>
  ): Promise<void> => {
    try {
      if (isDemoMode) {
        setRecurringTransactions(prev =>
          prev.map(recurring =>
            recurring.id === id ? { ...recurring, ...updates } : recurring
          )
        );
        return;
      }

      const payload = sanitizePayload(updates);

      await supabase
        .from('recurring_transactions')
        .update(payload)
        .eq('id', id);

      await refreshData();
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      throw error;
    }
  };

  const deleteRecurringTransaction = async (id: string): Promise<void> => {
    try {
      if (isDemoMode) {
        setRecurringTransactions(prev => prev.filter(recurring => recurring.id !== id));
        return;
      }

      await supabase.from('recurring_transactions').delete().eq('id', id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      throw error;
    }
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
    addTransaction,
    updateTransaction,
    deleteTransaction,
    approveTransaction,
    rejectTransaction,
    addSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    markAlertAsRead,
    deleteAlert,
    refreshData,
    getDashboardStats,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};