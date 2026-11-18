import { CategoryColor } from './types';

export const categoryPalette: CategoryColor[] = [
  {
    id: 'cat_work',
    name: 'Work',
    solid: '#4F46E5', // Indigo
    soft: '#EEF0FD',
    icon: 'briefcase',
  },
  {
    id: 'cat_personal',
    name: 'Personal',
    solid: '#0D9488', // Teal
    soft: '#F0FDFA',
    icon: 'person',
  },
  {
    id: 'cat_health',
    name: 'Health',
    solid: '#059669', // Emerald
    soft: '#ECFDF5',
    icon: 'fitness',
  },
  {
    id: 'cat_learning',
    name: 'Learning',
    solid: '#7C3AED', // Violet
    soft: '#F5F3FF',
    icon: 'book',
  },
  {
    id: 'cat_finance',
    name: 'Finance',
    solid: '#D97706', // Amber
    soft: '#FFFBEB',
    icon: 'wallet',
  },
  {
    id: 'cat_home',
    name: 'Home',
    solid: '#0284C7', // Sky
    soft: '#F0F9FF',
    icon: 'home',
  },
  {
    id: 'cat_social',
    name: 'Social',
    solid: '#DB2777', // Pink
    soft: '#FDF2F8',
    icon: 'people',
  },
  {
    id: 'cat_creative',
    name: 'Creative',
    solid: '#EA580C', // Orange
    soft: '#FFF7ED',
    icon: 'color-palette',
  },
  {
    id: 'cat_mindfulness',
    name: 'Mindfulness',
    solid: '#2563EB', // Blue
    soft: '#EFF6FF',
    icon: 'sparkles',
  },
  {
    id: 'cat_general',
    name: 'General',
    solid: '#475569', // Slate
    soft: '#F1F5F9',
    icon: 'bookmark',
  },
];

export function getCategoryColor(idOrColor?: string, isDark = false): { solid: string; soft: string; icon: string } {
  if (!idOrColor) {
    return {
      solid: isDark ? '#9BA7B6' : '#475569',
      soft: isDark ? 'rgba(155, 167, 182, 0.16)' : '#F1F5F9',
      icon: 'bookmark',
    };
  }

  const match = categoryPalette.find(
    (c) => c.id === idOrColor || c.solid.toLowerCase() === idOrColor.toLowerCase()
  );

  if (match) {
    return {
      solid: match.solid,
      soft: isDark ? `${match.solid}26` : match.soft,
      icon: match.icon,
    };
  }

  // Fallback for custom hex
  return {
    solid: idOrColor,
    soft: isDark ? `${idOrColor}26` : `${idOrColor}18`,
    icon: 'pricetag',
  };
}

