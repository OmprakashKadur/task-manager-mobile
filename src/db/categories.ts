import { getDatabase } from './database';
import { Category } from '@/types';

export function getAllCategories(): Category[] {
  const db = getDatabase();
  const rows = db.getAllSync<{
    id: string;
    name: string;
    color: string;
    icon: string;
    is_default: number;
    sort_order: number;
  }>('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    is_default: r.is_default === 1,
    sort_order: r.sort_order,
  }));
}

export function getCategoryById(id: string): Category | null {
  const db = getDatabase();
  const r = db.getFirstSync<{
    id: string;
    name: string;
    color: string;
    icon: string;
    is_default: number;
    sort_order: number;
  }>('SELECT * FROM categories WHERE id = ?', [id]);

  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    is_default: r.is_default === 1,
    sort_order: r.sort_order,
  };
}

export function insertCategory(cat: Omit<Category, 'is_default'> & { is_default?: boolean }): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO categories (id, name, color, icon, is_default, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      cat.id,
      cat.name,
      cat.color,
      cat.icon,
      cat.is_default ? 1 : 0,
      cat.sort_order ?? 0,
    ]
  );
}

export function updateCategory(cat: Category): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE categories
     SET name = ?, color = ?, icon = ?, sort_order = ?
     WHERE id = ?`,
    [cat.name, cat.color, cat.icon, cat.sort_order, cat.id]
  );
}

export function deleteCategory(id: string): boolean {
  const db = getDatabase();
  // Check if any tasks use this category
  const taskCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tasks WHERE category_id = ?',
    [id]
  )?.count ?? 0;

  if (taskCount > 0) {
    return false; // Cannot delete category in use
  }

  db.runSync('DELETE FROM categories WHERE id = ?', [id]);
  return true;
}

