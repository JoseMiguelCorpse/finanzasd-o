import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Repeat } from 'lucide-react';
import { RecurringForm } from './RecurringForm';
import { RecurringTransaction } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const RecurringPage: React.FC = () => {
  const { recurringTransactions, deleteRecurringTransaction } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const handleEdit = (recurring: RecurringTransaction) => {
    setEditingRecurring(recurring);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRecurring(null);
  };

  const getTypeIcon = (type: string) => {
    return type === 'expense' ? '💸' : '🏦';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔄 Transacciones Recurrentes</h1>
          <p className="text-gray-600">Automatiza tus gastos y ahorros fijos.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Recurrente
        </button>
      </div>

      {recurringTransactions.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            <AnimatePresence>
              {recurringTransactions.map((recurring) => (
                <motion.div
                  key={recurring.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getTypeIcon(recurring.type)}</div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{recurring.description}</h4>
                        <p className="text-xs text-gray-500">{recurring.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <span className={`text-lg font-semibold ${recurring.type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                        -€{Number(recurring.amount).toFixed(2)}
                      </span>
                      <div className="text-sm text-gray-700">
                        <p>Frecuencia: <span className="font-medium">{recurring.frequency === 'monthly' ? 'Mensual' : 'Anual'}</span></p>
                        <p>Próximo cobro: <span className="font-medium">{format(new Date(recurring.next_due_date), 'dd MMM yyyy', { locale: es })}</span></p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleEdit(recurring)} className="p-1 text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
                        <button onClick={() => deleteRecurringTransaction(recurring.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <Repeat size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900">Sin transacciones recurrentes</h3>
          <p className="mt-2 text-gray-500">Añade gastos fijos como suscripciones o alquiler para automatizar tu contabilidad.</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <RecurringForm
            recurring={editingRecurring}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
