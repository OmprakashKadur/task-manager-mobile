import { RecurrenceRule } from '@/types';
import { parseLocalDate } from './dateUtils';

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatOrdinal(n: number): string {
  const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
  const suffixes: Record<string, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th',
  };
  return `${n}${suffixes[pr.select(n)] || 'th'}`;
}

export function getRecurrenceRuleSummary(rule: RecurrenceRule): string {
  const interval = rule.interval || 1;
  let summary = '';

  switch (rule.frequency) {
    case 'daily':
    case 'custom_days':
      summary = interval === 1 ? 'Every day' : `Every ${interval} days`;
      break;

    case 'date_range': {
      const startObj = parseLocalDate(rule.start_date);
      const startStr = `${MONTH_NAMES_SHORT[startObj.getMonth()]} ${startObj.getDate()}`;
      if (rule.until_date) {
        const endObj = parseLocalDate(rule.until_date);
        const endStr = `${MONTH_NAMES_SHORT[endObj.getMonth()]} ${endObj.getDate()}`;
        summary = `From ${startStr} to ${endStr}`;
      } else {
        summary = `From ${startStr} daily`;
      }
      break;
    }

    case 'weekly': {
      const weekdays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [];
      const daysStr = weekdays
        .map((w) => WEEKDAY_NAMES_SHORT[w])
        .join(', ');

      const prefix = interval === 1 ? 'Every' : `Every ${interval} weeks on`;
      summary = weekdays.length > 0 ? `${prefix} ${daysStr}` : (interval === 1 ? 'Weekly' : `Every ${interval} weeks`);
      break;
    }

    case 'monthly': {
      const prefix = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      if (rule.month_week != null && rule.month_weekday != null) {
        const weekName =
          rule.month_week === -1
            ? 'last'
            : formatOrdinal(rule.month_week);
        const dayName = WEEKDAY_NAMES_SHORT[rule.month_weekday];
        summary = `${prefix} on the ${weekName} ${dayName}`;
      } else if (rule.month_day) {
        summary = `${prefix} on the ${formatOrdinal(rule.month_day)}`;
      } else {
        summary = prefix;
      }
      break;
    }

    case 'yearly': {
      const startObj = parseLocalDate(rule.start_date);
      const monthStr = MONTH_NAMES_SHORT[startObj.getMonth()];
      summary = interval === 1
        ? `Yearly on ${monthStr} ${startObj.getDate()}`
        : `Every ${interval} years on ${monthStr} ${startObj.getDate()}`;
      break;
    }

    default:
      summary = 'Repeats';
  }

  // Append end condition summary
  if (rule.end_type === 'until_date' && rule.until_date) {
    const endObj = parseLocalDate(rule.until_date);
    const endStr = `${MONTH_NAMES_SHORT[endObj.getMonth()]} ${endObj.getDate()}, ${endObj.getFullYear()}`;
    summary += ` until ${endStr}`;
  } else if (rule.end_type === 'count' && rule.count) {
    summary += ` (for ${rule.count} times)`;
  }

  return summary;
}

