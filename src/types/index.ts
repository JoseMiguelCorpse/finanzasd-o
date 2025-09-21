export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense' | 'saving';
  date: string;
  goal_id?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SavingGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  is_shared: boolean;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  type: 'expense' | 'saving';
  frequency: 'monthly' | 'yearly';
  day_of_month: number;
  start_date: string;
  next_due_date: string;
  is_shared: boolean;
}

export interface SmartAlert {
  id: string;
  user_id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  balance: number;
}
