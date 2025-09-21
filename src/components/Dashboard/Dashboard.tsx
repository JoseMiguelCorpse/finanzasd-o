import React from 'react';
import { useApp } from '../../context/AppContext';
import type { SmartAlert } from '../../types';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, AlertCircle, CheckCircle, Info, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { 
    getDashboardStats, 
    transactions, 
    savingGoals, 
    smartAlerts, 
    markAlertAsRead, 
    currentUser 
  } = useApp();
  
  const stats = getDashboardStats();
  interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: string;
    bgColor: string;
  }

  const recentTransactions = transactions
    .filter(t => t.status === 'approved')
    .slice(0, 5);
  const unreadAlerts = smartAlerts.filter(a => !a.read);

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, bgColor }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`${bgColor} rounded-lg p-6 shadow-sm border border-gray-200`}
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            €{value.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );

  const AlertIcon = ({ type }: { type: SmartAlert['type'] }) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Hola, {currentUser?.name}! 👋
        </h1>
        <p className="text-gray-600">
          Aquí tienes un resumen de tus finanzas
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Ingresos"
          value={stats.totalIncome}
          icon={TrendingUp}
          color="bg-green-500"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Gastos"
          value={stats.totalExpenses}
          icon={TrendingDown}
          color="bg-red-500"
          bgColor="bg-red-50"
        />
        <StatCard
          title="Ahorros"
          value={stats.totalSavings}
          icon={PiggyBank}
          color="bg-blue-500"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Balance"
          value={stats.balance}
          icon={Wallet}
          color={stats.balance >= 0 ? "bg-green-500" : "bg-red-500"}
          bgColor={stats.balance >= 0 ? "bg-green-50" : "bg-red-50"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Transacciones Recientes
            </h2>
          </div>
          <div className="p-6">
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'income' ? 'bg-green-100' :
                        transaction.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <span className="text-sm">
                          {transaction.type === 'income' ? '💰' :
                           transaction.type === 'expense' ? '💸' : '🏦'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(transaction.date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' :
                      transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay transacciones recientes
              </p>
            )}
          </div>
        </motion.div>

        {/* Saving Goals Progress */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Progreso de Metas
            </h2>
          </div>
          <div className="p-6">
            {savingGoals.length > 0 ? (
              <div className="space-y-6">
                {savingGoals.slice(0, 3).map((goal) => {
                  const progress = (goal.current_amount / goal.target_amount) * 100;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {goal.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="bg-blue-600 h-2 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          €{goal.current_amount.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">
                          €{goal.target_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No tienes metas de ahorro aún
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Smart Alerts */}
      {unreadAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Alertas Recientes
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {unreadAlerts.slice(0, 3).map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-lg border ${
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      alert.type === 'success' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <AlertIcon type={alert.type} />
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {alert.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {alert.message}
                        </p>
                      </div>
                      <button
                        onClick={() => markAlertAsRead(alert.id)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Marcar como leída
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
