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
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  
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

  useEffect(() => {
    setIsLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              avatar: profile.avatar
            });
            setIsDemoMode(false);
            await loadUserData(session.user.id);
          } else {
            console.error("Profile not found for authenticated user. Signing out.");
            await supabase.auth.signOut();
            setCurrentUser(null);
            clearData();
          }
        } else {
          setCurrentUser(null);
          setIsDemoMode(false);
          clearData();
        }
      } catch (error) {
        console.error("Error in onAuthStateChange:", error);
        setCurrentUser(null);
        clearData();
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [transactionsRes, goalsRes, recurringRes, alertsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('saving_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('recurring_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('smart_alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      setTransactions(transactionsRes.data || []);
      setSavingGoals(goalsRes.data || []);
      setRecurringTransactions(recurringRes.data || []);
      setSmartAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Error loading user data:', error);
      clearData();
    }
  };

  const clearData = () => {
    setTransactions([]);
    setSavingGoals([]);
    setRecurringTransactions([]);
    setSmartAlerts([]);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
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
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      return false;
    }
    return true;
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name } }
    });
    if (error) {
      console.error('Registration error:', error);
      throw error;
    }
    return !!data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };
  
  const addSmartAlert = async (alertData: Omit<SmartAlert, 'id' | 'user_id' | 'created_at' | 'read'>) => {
    if (!currentUser) return;
    if (isDemoMode) {
      const newAlert: SmartAlert = { ...alertData, id: crypto.randomUUID(), user_id: currentUser.id, created_at: new Date().toISOString(), read: false };
      setSmartAlerts(prev => [newAlert, ...prev]);
      return;
    }
    try {
      const { data, error } = await supabase.from('smart_alerts').insert([{ ...alertData, user_id: currentUser.id }]).select().single();
      if (error) throw error;
      setSmartAlerts(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error adding smart alert:', error);
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id'>) => {
    if (!currentUser) return;
    if (isDemoMode) {
      const newTransaction: Transaction = { ...transactionData, id: crypto.randomUUID(), user_id: currentUser.id };
      setTransactions(prev => [newTransaction, ...prev]);
      return;
    }
    try {
      const { data: newTransaction, error } = await supabase.from('transactions').insert([{ ...transactionData, user_id: currentUser.id }]).select().single();
      if (error) throw error;
      
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);

      if (newTransaction.type === 'saving' && newTransaction.goal_id && newTransaction.status === 'approved') {
        const goal = savingGoals.find(g => g.id === newTransaction.goal_id);
        if (goal) {
          await updateSavingGoal(newTransaction.goal_id, { current_amount: Number(goal.current_amount) + Number(newTransaction.amount) });
        }
      }

      if (newTransaction.type === 'expense' && newTransaction.status === 'approved') {
        const historicExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'approved');
        if (historicExpenses.length > 5) {
          const avgExpense = historicExpenses.reduce((sum, t) => sum + Number(t.amount), 0) / historicExpenses.length;
          if (Number(newTransaction.amount) > avgExpense * 2 && Number(newTransaction.amount) > 100) {
            await addSmartAlert({
              type: 'warning',
              title: 'Gasto elevado detectado',
              message: `Has realizado un gasto de €${Number(newTransaction.amount).toFixed(2)} en "${newTransaction.description}", que es significativamente más alto que tu promedio.`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (isDemoMode) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return;
    }
    try {
      const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === id ? data : t));
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (isDemoMode) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      return;
    }
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const approveTransaction = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction || transaction.status !== 'pending') return;
    
    try {
      const { data: updatedTransaction, error: transactionError } = await supabase.from('transactions').update({ status: 'approved' }).eq('id', id).select().single();
      if (transactionError) throw transactionError;

      setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));

      if (updatedTransaction.type === 'saving' && updatedTransaction.goal_id) {
        const goal = savingGoals.find(g => g.id === updatedTransaction.goal_id);
        if (goal) {
          const newCurrentAmount = Number(goal.current_amount) + Number(updatedTransaction.amount);
          const { data: updatedGoal, error: goalError } = await supabase.from('saving_goals').update({ current_amount: newCurrentAmount }).eq('id', goal.id).select().single();
          if (goalError) throw goalError;

          setSavingGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));

          if (Number(goal.current_amount) < Number(goal.target_amount) && newCurrentAmount >= Number(goal.target_amount)) {
            await addSmartAlert({
              type: 'success',
              title: '¡Meta de ahorro alcanzada!',
              message: `¡Felicidades! Has completado tu meta "${updatedGoal.name}".`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      await refreshData();
    }
  };

  const rejectTransaction = async (id: string) => {
    await updateTransaction(id, { status: 'rejected' });
  };

  const addSavingGoal = async (goalData: Omit<SavingGoal, 'id' | 'user_id' | 'current_amount'>) => {
    if (!currentUser) return;
    if (isDemoMode) {
      const newGoal: SavingGoal = { ...goalData, id: crypto.randomUUID(), user_id: currentUser.id, current_amount: 0 };
      setSavingGoals(prev => [newGoal, ...prev]);
      return;
    }
    try {
      const { data, error } = await supabase.from('saving_goals').insert([{ ...goalData, user_id: currentUser.id, current_amount: 0 }]).select().single();
      if (error) throw error;
      setSavingGoals(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error adding saving goal:', error);
      throw error;
    }
  };

  const updateSavingGoal = async (id: string, updates: Partial<SavingGoal>) => {
    if (isDemoMode) {
      setSavingGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
      return;
    }
    try {
      const { data, error } = await supabase.from('saving_goals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setSavingGoals(prev => prev.map(g => g.id === id ? data : g));
    } catch (error) {
      console.error('Error updating saving goal:', error);
      throw error;
    }
  };

  const deleteSavingGoal = async (id: string) => {
    if (isDemoMode) {
      setSavingGoals(prev => prev.filter(g => g.id !== id));
      return;
    }
    try {
      const { error } = await supabase.from('saving_goals').delete().eq('id', id);
      if (error) throw error;
      setSavingGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting saving goal:', error);
      throw error;
    }
  };

  const addRecurringTransaction = async (recurringData: Omit<RecurringTransaction, 'id' | 'user_id'>) => {
    if (!currentUser) return;
    if (isDemoMode) {
      const newRecurring: RecurringTransaction = { ...recurringData, id: crypto.randomUUID(), user_id: currentUser.id };
      setRecurringTransactions(prev => [newRecurring, ...prev]);
      return;
    }
    try {
      const { data, error } = await supabase.from('recurring_transactions').insert([{ ...recurringData, user_id: currentUser.id }]).select().single();
      if (error) throw error;
      setRecurringTransactions(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      throw error;
    }
  };

  const updateRecurringTransaction = async (id: string, updates: Partial<RecurringTransaction>) => {
    if (isDemoMode) {
      setRecurringTransactions(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      return;
    }
    try {
      const { data, error } = await supabase.from('recurring_transactions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setRecurringTransactions(prev => prev.map(r => r.id === id ? data : r));
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      throw error;
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    if (isDemoMode) {
      setRecurringTransactions(prev => prev.filter(r => r.id !== id));
      return;
    }
    try {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
      if (error) throw error;
      setRecurringTransactions(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      throw error;
    }
  };

  const markAlertAsRead = async (id: string) => {
    if (isDemoMode) {
      setSmartAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
      return;
    }
    try {
      const { error } = await supabase.from('smart_alerts').update({ read: true }).eq('id', id);
      if (error) throw error;
      setSmartAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    if (isDemoMode) {
      setSmartAlerts(prev => prev.filter(a => a.id !== id));
      return;
    }
    try {
      const { error } = await supabase.from('smart_alerts').delete().eq('id', id);
      if (error) throw error;
      setSmartAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  };

  const refreshData = async () => {
    if (currentUser && !isDemoMode) {
      await loadUserData(currentUser.id);
    }
  };

  const getDashboardStats = (): DashboardStats => {
    const approvedTransactions = transactions.filter(t => t.status === 'approved');
    const totalIncome = approvedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = approvedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSavings = approvedTransactions.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpenses - totalSavings;
    return { totalIncome, totalExpenses, totalSavings, balance };
  };

  const contextValue: AppContextType = {
    currentUser, isAuthenticated, isDemoMode, isLoading,
    login, register, logout,
    transactions, savingGoals, recurringTransactions, smartAlerts,
    addTransaction, updateTransaction, deleteTransaction, approveTransaction, rejectTransaction,
    addSavingGoal, updateSavingGoal, deleteSavingGoal,
    addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction,
    markAlertAsRead, deleteAlert,
    refreshData, getDashboardStats
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
