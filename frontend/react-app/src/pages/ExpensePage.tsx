import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Expense, Category } from '../types';
import { ExpenseForm } from '../components/ExpenseForm';
import { ExpenseList } from '../components/ExpenseList';

const ExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadData = async () => {
    try {
      const [expData, catData] = await Promise.all([
        api.expenses.getAll(),
        api.categories.getAll()
      ]);
      setExpenses(expData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Kunde inte läsa in data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="view-container">
      <ExpenseForm 
        categories={categories} 
        onExpenseAdded={loadData} 
      />

      <ExpenseList 
        expenses={expenses} 
        categories={categories} 
        onDataChanged={loadData} 
      />
    </div>
  );
};

export default ExpensePage;