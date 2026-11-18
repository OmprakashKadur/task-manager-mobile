import { PriorityToken } from './types';

export const priorityTokens: Record<'high' | 'medium' | 'low', PriorityToken> = {
  high: {
    value: 'high',
    label: 'High',
    solid: '#E11D48', // Rose-600
    soft: '#FFF1F2',
    icon: 'flag',
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    solid: '#D97706', // Amber-600
    soft: '#FFFBEB',
    icon: 'flag-outline',
  },
  low: {
    value: 'low',
    label: 'Low',
    solid: '#059669', // Emerald-600
    soft: '#ECFDF5',
    icon: 'flag-outline',
  },
};

export function getPriorityToken(priority: 'high' | 'medium' | 'low', isDark = false): PriorityToken {
  const token = priorityTokens[priority] || priorityTokens.medium;
  return {
    ...token,
    soft: isDark ? `${token.solid}26` : token.soft,
  };
}

