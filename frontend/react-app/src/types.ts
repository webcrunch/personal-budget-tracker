export interface Category {
  id: number;
  name: string;
  isFixed?: boolean;
}

export interface ExpenseItem {
  id?: number;
  name: string;
  price: number;
  discount: number;
  finalPrice: number;
  categoryId?: number | null;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  categoryId: number;
  isFixed?: boolean;
  isPending?: boolean;
  category?: Category;
  items?: ExpenseItem[];
}