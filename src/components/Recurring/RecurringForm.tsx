import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { RecurringTransaction } from '../../types';
import { format } from 'date-fns';

export const RecurringForm: React.FC<{ recurring: RecurringTransaction | null, onClose: () => void }> = ({ recurring, onClose }) => {
  const { addRecurringTransaction, updateRecurringTransaction } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense' as 'expense' | 'saving',
    frequency: 'monthly' as 'monthly' | 'yearly',
    day_of_month: '1',
    start_date: new Date().toISOString().split('T')[0],
    is_shared: false,
  });

  useEffect(() => {
    if (recurring) {
      setFormData({
        description: recurring.description,
        amount: recurring.amount.toString(),
        category: recurring.category,
        type: recurring.type,
        frequency: recurring.frequency,
        day_of_month: recurring.day_of_month?.toString() || '1',
        start_date: recurring.start_date.split('T')[0],
        is_shared: recurring.is_shared,
      });
    }
  }, [recurring]);

  const categories = {
    expense: ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Compras', 'Salud', 'Vivienda', 'Suscripciones'],
    saving: ['Emergencias', 'Vacaciones', 'Inversión', 'Educación', 'Objetivo específico']
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { start_date, day_of_month, frequency } = formData;
      const startDate = new Date(start_date);
      const nextDueDate = new Date(startDate);
      
      if (frequency === 'monthly') {
        nextDueDate.setMonth(new Date().getMonth());
        nextDueDate.setDate(parseInt(day_of_month));
        if (nextDueDate < new Date()) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
      } else { // yearly
        nextDueDate.setFullYear(new Date().getFullYear());
        if (nextDueDate < new Date()) {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        }
      }

      const recurringData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        type: formData.type,
        frequency: formData.frequency,
        day_of_month: parseInt(formData.day_of_month),
        start_date: new Date(formData.start_date).toISOString(),
        next_due_date: format(nextDueDate, 'yyyy-MM-dd'),
        is_shared: formData.is_shared,
      };

      if (recurring) {
        await updateRecurringTransaction(recurring.id, recurringData);
      } else {
        await addRecurringTransaction(recurringData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      const message = error instanceof Error ? error.message : 'No se pudo guardar la transaccion recurrente.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {recurring ? 'Editar Transacción Recurrente' : 'Nueva Transacción Recurrente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <input type="text" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} placeholder="Ej: Suscripción Netflix" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'expense' | 'saving', category: '' }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="expense">Gasto</option>
                <option value="saving">Ahorro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (€) *</label>
              <input type="number" step="0.01" min="0" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} placeholder="12.99" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar categoría</option>
              {categories[formData.type].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia *</label>
              <select value={formData.frequency} onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as 'monthly' | 'yearly' }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            {formData.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Día del Mes *</label>
                <input type="number" min="1" max="31" value={formData.day_of_month} onChange={e => setFormData(p => ({...p, day_of_month: e.target.value}))} placeholder="15" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_shared}
                onChange={(e) => setFormData(prev => ({ ...prev, is_shared: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Transacción recurrente compartida</span>
            </label>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={isLoading} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Save size={16} className="mr-2" />}
              {recurring ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
