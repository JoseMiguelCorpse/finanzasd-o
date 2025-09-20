import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Target } from 'lucide-react';
import { GoalForm } from './GoalForm';
import { SavingGoal } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const GoalsPage: React.FC = () => {
  const { savingGoals, deleteSavingGoal } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);

  const handleEdit = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingGoal(null);
  };
  
  const GoalCard = ({ goal }: { goal: SavingGoal }) => {
    const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleEdit(goal)} className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
              <button onClick={() => deleteSavingGoal(goal.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
            </div>
          </div>
          {goal.deadline && (
            <p className="text-sm text-gray-500 mt-1">
              Fecha límite: {format(new Date(goal.deadline), 'dd MMM yyyy', { locale: es })}
            </p>
          )}
          <div className="my-4">
            <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
              <span>Progreso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <motion.div 
                className="bg-blue-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>€{Number(goal.current_amount).toFixed(2)}</span>
              <span>€{Number(goal.target_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎯 Metas de Ahorro</h1>
          <p className="text-gray-600">Define y sigue el progreso de tus objetivos financieros.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Meta
        </button>
      </div>

      {savingGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {savingGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <Target size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900">Aún no tienes metas</h3>
          <p className="mt-2 text-gray-500">Crea tu primera meta de ahorro para empezar a planificar tu futuro.</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <GoalForm
            goal={editingGoal}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
