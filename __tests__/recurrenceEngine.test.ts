import { describe, test, expect } from '@jest/globals';
import {
  doesRuleOccurOnDate,
  determineTimePeriod,
  checkIsOverdue,
  buildOccurrencesForDate,
  addCalendarDays,
  differenceInCalendarDays,
  getNthWeekdayOfMonth,
  parseLocalDate,
  formatLocalDate,
  getOccurrencesForSingleTask,
  getOccurrencesForDate,
  getOccurrencesForRange,
  getRecurrenceRuleSummary,
  resolveRecurringEdit,
  resolveRecurringDelete,
} from '../src/services/recurrence';
import { Task, RecurrenceRule, TaskException } from '../src/types';

describe('Recurrence Engine Unit Tests', () => {
  const baseTask: Task = {
    id: 'task_test_1',
    title: 'Morning Workout',
    notes: 'Push day routine',
    date: '2026-03-10',
    start_time: '06:00',
    end_time: '07:00',
    all_day: false,
    category_id: 'cat_health',
    priority: 'high',
    subtasks: [
      { id: 'sub_1', title: 'Warmup', completed: false },
      { id: 'sub_2', title: 'Main sets', completed: false },
    ],
    reminders: [15],
    status: 'pending',
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-01T10:00:00.000Z',
  };

  /* =========================================================================
     1. Date Utilities & DST Handling
  ========================================================================= */
  describe('1. Date Utilities & DST Handling', () => {
    test('local date parsing and formatting are consistent without UTC shift', () => {
      const dateStr = '2026-03-10';
      const parsed = parseLocalDate(dateStr);
      expect(formatLocalDate(parsed)).toBe('2026-03-10');
      expect(parsed.getDate()).toBe(10);
      expect(parsed.getMonth()).toBe(2); // March is month index 2
      expect(parsed.getFullYear()).toBe(2026);
    });

    test('addCalendarDays works across month and year boundaries', () => {
      expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
      expect(addCalendarDays('2026-02-28', 1)).toBe('2026-03-01');
      expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    test('DST transition edge case (spring forward & fall back 2026)', () => {
      // US DST Spring Forward occurs on March 8, 2026 (23-hour day)
      const dayBeforeSpring = '2026-03-07';
      const springSunday = addCalendarDays(dayBeforeSpring, 1);
      const dayAfterSpring = addCalendarDays(springSunday, 1);

      expect(springSunday).toBe('2026-03-08');
      expect(dayAfterSpring).toBe('2026-03-09');
      expect(differenceInCalendarDays(dayAfterSpring, dayBeforeSpring)).toBe(2);

      // US DST Fall Back occurs on November 1, 2026 (25-hour day)
      const dayBeforeFall = '2026-10-31';
      const fallSunday = addCalendarDays(dayBeforeFall, 1);
      const dayAfterFall = addCalendarDays(fallSunday, 1);

      expect(fallSunday).toBe('2026-11-01');
      expect(dayAfterFall).toBe('2026-11-02');
      expect(differenceInCalendarDays(dayAfterFall, dayBeforeFall)).toBe(2);
    });

    test('getNthWeekdayOfMonth finds 2nd Tuesday and last Friday accurately', () => {
      // In March 2026:
      // March 1 is Sunday.
      // 1st Tuesday = March 3
      // 2nd Tuesday = March 10
      expect(getNthWeekdayOfMonth(2026, 3, 2, 2)).toBe(10);

      // Last Friday of March 2026:
      // March 31 is Tuesday. Last Friday is March 27.
      expect(getNthWeekdayOfMonth(2026, 3, 5, -1)).toBe(27);

      // 5th Tuesday in February 2026 (does not exist, returns null)
      expect(getNthWeekdayOfMonth(2026, 2, 2, 5)).toBeNull();
    });
  });

  /* =========================================================================
     2. Daily Recurrence
  ========================================================================= */
  describe('2. Daily Recurrence', () => {
    test('daily recurrence (every day)', () => {
      const rule: RecurrenceRule = {
        id: 'rule_daily_1',
        task_id: baseTask.id,
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(rule, '2026-03-09')).toBe(false); // Before start_date
      expect(doesRuleOccurOnDate(rule, '2026-03-10')).toBe(true);  // On start_date
      expect(doesRuleOccurOnDate(rule, '2026-03-11')).toBe(true);
      expect(doesRuleOccurOnDate(rule, '2026-03-25')).toBe(true);
    });

    test('daily recurrence every 3 days (custom_days / interval > 1)', () => {
      const rule: RecurrenceRule = {
        id: 'rule_daily_3',
        task_id: baseTask.id,
        frequency: 'daily',
        interval: 3,
        start_date: '2026-03-10',
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(rule, '2026-03-10')).toBe(true);  // Day 0
      expect(doesRuleOccurOnDate(rule, '2026-03-11')).toBe(false); // Day 1
      expect(doesRuleOccurOnDate(rule, '2026-03-12')).toBe(false); // Day 2
      expect(doesRuleOccurOnDate(rule, '2026-03-13')).toBe(true);  // Day 3
      expect(doesRuleOccurOnDate(rule, '2026-03-16')).toBe(true);  // Day 6
    });
  });

  /* =========================================================================
     3. Date Range Scheduling
  ========================================================================= */
  describe('3. Date Range Scheduling ("from 10 Mar to 25 Mar, every day")', () => {
    const dateRangeRule: RecurrenceRule = {
      id: 'rule_range_1',
      task_id: baseTask.id,
      frequency: 'date_range',
      interval: 1,
      start_date: '2026-03-10',
      end_type: 'until_date',
      until_date: '2026-03-25',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    };

    test('matches every day within the specified range inclusive', () => {
      expect(doesRuleOccurOnDate(dateRangeRule, '2026-03-09')).toBe(false); // Before range
      expect(doesRuleOccurOnDate(dateRangeRule, '2026-03-10')).toBe(true);  // Start
      expect(doesRuleOccurOnDate(dateRangeRule, '2026-03-17')).toBe(true);  // Mid
      expect(doesRuleOccurOnDate(dateRangeRule, '2026-03-25')).toBe(true);  // End
      expect(doesRuleOccurOnDate(dateRangeRule, '2026-03-26')).toBe(false); // After range
    });

    test('summary format for date range', () => {
      expect(getRecurrenceRuleSummary(dateRangeRule)).toContain('From Mar 10 to Mar 25');
    });
  });

  /* =========================================================================
     4. Weekly on Chosen Weekdays
  ========================================================================= */
  describe('4. Weekly Recurrence on Chosen Weekdays', () => {
    test('every Thursday at 4:00-5:00 PM', () => {
      // 2026-03-12 is Thursday
      const ruleThursday: RecurrenceRule = {
        id: 'rule_thursday',
        task_id: baseTask.id,
        frequency: 'weekly',
        interval: 1,
        weekdays: [4], // 4 = Thursday
        start_date: '2026-03-10', // Tuesday
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(ruleThursday, '2026-03-10')).toBe(false); // Tuesday
      expect(doesRuleOccurOnDate(ruleThursday, '2026-03-11')).toBe(false); // Wednesday
      expect(doesRuleOccurOnDate(ruleThursday, '2026-03-12')).toBe(true);  // Thursday
      expect(doesRuleOccurOnDate(ruleThursday, '2026-03-19')).toBe(true);  // Next Thursday
      expect(doesRuleOccurOnDate(ruleThursday, '2026-03-20')).toBe(false); // Friday
    });

    test('every Mon/Wed/Fri', () => {
      const ruleMonWedFri: RecurrenceRule = {
        id: 'rule_mwf',
        task_id: baseTask.id,
        frequency: 'weekly',
        interval: 1,
        weekdays: [1, 3, 5], // 1=Mon, 3=Wed, 5=Fri
        start_date: '2026-03-09', // Monday
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-09')).toBe(true);  // Mon
      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-10')).toBe(false); // Tue
      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-11')).toBe(true);  // Wed
      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-12')).toBe(false); // Thu
      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-13')).toBe(true);  // Fri
      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-14')).toBe(false); // Sat
      expect(doesRuleOccurOnDate(ruleMonWedFri, '2026-03-15')).toBe(false); // Sun
    });

    test('bi-weekly on Wednesdays (interval: 2)', () => {
      const biWeeklyRule: RecurrenceRule = {
        id: 'rule_biweekly',
        task_id: baseTask.id,
        frequency: 'weekly',
        interval: 2,
        weekdays: [3], // Wednesday
        start_date: '2026-03-11', // Wednesday (Week 0)
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(biWeeklyRule, '2026-03-11')).toBe(true);  // Week 0 Wednesday
      expect(doesRuleOccurOnDate(biWeeklyRule, '2026-03-18')).toBe(false); // Week 1 Wednesday (skipped)
      expect(doesRuleOccurOnDate(biWeeklyRule, '2026-03-25')).toBe(true);  // Week 2 Wednesday
      expect(doesRuleOccurOnDate(biWeeklyRule, '2026-04-01')).toBe(false); // Week 3 Wednesday (skipped)
      expect(doesRuleOccurOnDate(biWeeklyRule, '2026-04-08')).toBe(true);  // Week 4 Wednesday
    });
  });

  /* =========================================================================
     5. Monthly Recurrence
  ========================================================================= */
  describe('5. Monthly Recurrence', () => {
    test('monthly on specific day (e.g. 15th)', () => {
      const ruleMonthlyDay: RecurrenceRule = {
        id: 'rule_month_day',
        task_id: baseTask.id,
        frequency: 'monthly',
        interval: 1,
        month_day: 15,
        start_date: '2026-01-15',
        end_type: 'never',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(ruleMonthlyDay, '2026-01-15')).toBe(true);
      expect(doesRuleOccurOnDate(ruleMonthlyDay, '2026-02-15')).toBe(true);
      expect(doesRuleOccurOnDate(ruleMonthlyDay, '2026-03-14')).toBe(false);
      expect(doesRuleOccurOnDate(ruleMonthlyDay, '2026-03-15')).toBe(true);
    });

    test('monthly on 31st caps safely on shorter months without overflow', () => {
      const ruleMonthly31: RecurrenceRule = {
        id: 'rule_month_31',
        task_id: baseTask.id,
        frequency: 'monthly',
        interval: 1,
        month_day: 31,
        start_date: '2026-01-31',
        end_type: 'never',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      // January has 31 days
      expect(doesRuleOccurOnDate(ruleMonthly31, '2026-01-31')).toBe(true);
      // February 2026 has 28 days -> caps to Feb 28
      expect(doesRuleOccurOnDate(ruleMonthly31, '2026-02-28')).toBe(true);
      expect(doesRuleOccurOnDate(ruleMonthly31, '2026-03-01')).toBe(false);
      // April 2026 has 30 days -> caps to April 30
      expect(doesRuleOccurOnDate(ruleMonthly31, '2026-04-30')).toBe(true);
    });

    test('monthly on 2nd Tuesday of month', () => {
      const ruleNthWeekday: RecurrenceRule = {
        id: 'rule_nth_weekday',
        task_id: baseTask.id,
        frequency: 'monthly',
        interval: 1,
        month_week: 2,
        month_weekday: 2, // Tuesday
        start_date: '2026-01-01',
        end_type: 'never',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      // In March 2026, 2nd Tuesday is March 10
      expect(doesRuleOccurOnDate(ruleNthWeekday, '2026-03-10')).toBe(true);
      expect(doesRuleOccurOnDate(ruleNthWeekday, '2026-03-03')).toBe(false); // 1st Tuesday
      expect(doesRuleOccurOnDate(ruleNthWeekday, '2026-03-17')).toBe(false); // 3rd Tuesday

      // In April 2026, 1st Tuesday is April 7, 2nd Tuesday is April 14
      expect(doesRuleOccurOnDate(ruleNthWeekday, '2026-04-14')).toBe(true);
      expect(doesRuleOccurOnDate(ruleNthWeekday, '2026-04-07')).toBe(false);
    });
  });

  /* =========================================================================
     6. End Conditions (never, until_date, count)
  ========================================================================= */
  describe('6. Recurrence End Conditions', () => {
    test('terminates after N occurrences (count: 4)', () => {
      const ruleCount: RecurrenceRule = {
        id: 'rule_count_4',
        task_id: baseTask.id,
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'count',
        count: 4,
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(ruleCount, '2026-03-10')).toBe(true);  // 1
      expect(doesRuleOccurOnDate(ruleCount, '2026-03-11')).toBe(true);  // 2
      expect(doesRuleOccurOnDate(ruleCount, '2026-03-12')).toBe(true);  // 3
      expect(doesRuleOccurOnDate(ruleCount, '2026-03-13')).toBe(true);  // 4
      expect(doesRuleOccurOnDate(ruleCount, '2026-03-14')).toBe(false); // 5th is outside count!
      expect(doesRuleOccurOnDate(ruleCount, '2026-03-15')).toBe(false);
    });

    test('terminates on until_date', () => {
      const ruleUntil: RecurrenceRule = {
        id: 'rule_until',
        task_id: baseTask.id,
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'until_date',
        until_date: '2026-03-12',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      expect(doesRuleOccurOnDate(ruleUntil, '2026-03-10')).toBe(true);
      expect(doesRuleOccurOnDate(ruleUntil, '2026-03-11')).toBe(true);
      expect(doesRuleOccurOnDate(ruleUntil, '2026-03-12')).toBe(true);
      expect(doesRuleOccurOnDate(ruleUntil, '2026-03-13')).toBe(false);
    });
  });

  /* =========================================================================
     7. Multiple Time Slots per Rule
  ========================================================================= */
  describe('7. Multiple Time Slots per Rule', () => {
    test('produces occurrences for each time slot on matching days', () => {
      const ruleMultiSlot: RecurrenceRule = {
        id: 'rule_multi_slot',
        task_id: baseTask.id,
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'never',
        time_slots: [
          { start_time: '06:00', end_time: '07:00' },
          { start_time: '18:00', end_time: '19:00' },
        ],
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      const occurrences = getOccurrencesForSingleTask(
        baseTask,
        ruleMultiSlot,
        [],
        '2026-03-10'
      );

      expect(occurrences).toHaveLength(2);
      expect(occurrences[0].start_time).toBe('06:00');
      expect(occurrences[0].end_time).toBe('07:00');
      expect(occurrences[0].time_period).toBe('morning');

      expect(occurrences[1].start_time).toBe('18:00');
      expect(occurrences[1].end_time).toBe('19:00');
      expect(occurrences[1].time_period).toBe('evening');
    });
  });

  /* =========================================================================
     8. Per-Occurrence Exceptions (Delete & Edit Single Day)
  ========================================================================= */
  describe('8. Per-Occurrence Exceptions', () => {
    const dailyRule: RecurrenceRule = {
      id: 'rule_daily_ex',
      task_id: baseTask.id,
      frequency: 'daily',
      interval: 1,
      start_date: '2026-03-10',
      end_type: 'never',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    };

    test('single-day deletion: deletes occurrence for 2026-03-11 only without affecting others', () => {
      const deleteException: TaskException = {
        id: 'ex_del_1',
        task_id: baseTask.id,
        occurrence_date: '2026-03-11',
        exception_type: 'deleted',
        created_at: '2026-03-10T00:00:00.000Z',
        updated_at: '2026-03-10T00:00:00.000Z',
      };

      const exceptions = [deleteException];

      // Day 1: normal
      const occ10 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-10');
      expect(occ10).toHaveLength(1);

      // Day 2 (deleted): 0 occurrences
      const occ11 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-11');
      expect(occ11).toHaveLength(0);

      // Day 3: normal
      const occ12 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-12');
      expect(occ12).toHaveLength(1);
    });

    test('single-day modification: overrides title and time for 2026-03-11 only', () => {
      const modifyException: TaskException = {
        id: 'ex_mod_1',
        task_id: baseTask.id,
        occurrence_date: '2026-03-11',
        exception_type: 'modified',
        override_title: 'Special Cardio Session',
        override_start_time: '08:30',
        override_end_time: '09:30',
        created_at: '2026-03-10T00:00:00.000Z',
        updated_at: '2026-03-10T00:00:00.000Z',
      };

      const exceptions = [modifyException];

      // Day 1 (original): Morning Workout at 06:00
      const occ10 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-10');
      expect(occ10[0].title).toBe('Morning Workout');
      expect(occ10[0].start_time).toBe('06:00');

      // Day 2 (modified): Special Cardio Session at 08:30
      const occ11 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-11');
      expect(occ11[0].title).toBe('Special Cardio Session');
      expect(occ11[0].start_time).toBe('08:30');
      expect(occ11[0].has_exception).toBe(true);

      // Day 3 (original): Morning Workout at 06:00
      const occ12 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-12');
      expect(occ12[0].title).toBe('Morning Workout');
      expect(occ12[0].start_time).toBe('06:00');
    });

    test('completion isolation: completing today repeat does not complete other repeats', () => {
      const completionException: TaskException = {
        id: 'ex_comp_1',
        task_id: baseTask.id,
        occurrence_date: '2026-03-11',
        exception_type: 'completed',
        override_status: 'done',
        completed_at: '2026-03-11T07:05:00.000Z',
        created_at: '2026-03-11T07:05:00.000Z',
        updated_at: '2026-03-11T07:05:00.000Z',
      };

      const exceptions = [completionException];

      // Day 1 is pending
      const occ10 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-10');
      expect(occ10[0].status).toBe('pending');

      // Day 2 is completed
      const occ11 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-11');
      expect(occ11[0].status).toBe('done');
      expect(occ11[0].completed_at).toBe('2026-03-11T07:05:00.000Z');

      // Day 3 is pending
      const occ12 = getOccurrencesForSingleTask(baseTask, dailyRule, exceptions, '2026-03-12');
      expect(occ12[0].status).toBe('pending');
    });
  });

  /* =========================================================================
     9. Scope Decisions (This Day / This and Following / All Days)
  ========================================================================= */
  describe('9. Scope Decisions for Editing and Deletion', () => {
    const recurringRule: RecurrenceRule = {
      id: 'rule_scope',
      task_id: baseTask.id,
      frequency: 'daily',
      interval: 1,
      start_date: '2026-03-10',
      end_type: 'never',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    };

    test('resolveRecurringEdit with "this_day" produces add_exception decision', () => {
      const decision = resolveRecurringEdit(
        'this_day',
        baseTask,
        recurringRule,
        '2026-03-15',
        { title: 'Only Today Title' }
      );

      expect(decision.type).toBe('add_exception');
      if (decision.type === 'add_exception') {
        expect(decision.exception.occurrence_date).toBe('2026-03-15');
        expect(decision.exception.override_title).toBe('Only Today Title');
      }
    });

    test('resolveRecurringEdit with "this_and_following" splits recurrence cleanly', () => {
      const decision = resolveRecurringEdit(
        'this_and_following',
        baseTask,
        recurringRule,
        '2026-03-15',
        { title: 'New Series Title', start_time: '08:00' }
      );

      expect(decision.type).toBe('split_recurrence');
      if (decision.type === 'split_recurrence') {
        // Old rule truncated to yesterday (March 14)
        expect(decision.truncatedRule.until_date).toBe('2026-03-14');
        expect(decision.truncatedRule.end_type).toBe('until_date');

        // New task & rule start on March 15 with updated fields
        expect(decision.newTask.date).toBe('2026-03-15');
        expect(decision.newTask.title).toBe('New Series Title');
        expect(decision.newTask.start_time).toBe('08:00');
        expect(decision.newRule.start_date).toBe('2026-03-15');
        expect(decision.deleteExceptionsFromDate).toBe('2026-03-15');
      }
    });

    test('resolveRecurringDelete with "this_and_following" truncates recurrence to yesterday', () => {
      const decision = resolveRecurringDelete(
        'this_and_following',
        baseTask,
        recurringRule,
        '2026-03-15'
      );

      expect(decision.type).toBe('truncate_recurrence');
      if (decision.type === 'truncate_recurrence') {
        expect(decision.truncatedRule.until_date).toBe('2026-03-14');
        expect(decision.deleteExceptionsFromDate).toBe('2026-03-15');
      }
    });

    test('resolveRecurringDelete with "all_days" yields delete_all', () => {
      const decision = resolveRecurringDelete(
        'all_days',
        baseTask,
        recurringRule,
        '2026-03-15'
      );

      expect(decision.type).toBe('delete_all');
      if (decision.type === 'delete_all') {
        expect(decision.taskId).toBe(baseTask.id);
      }
    });
  });

  /* =========================================================================
     10. High Level Occurrence Generation for Range
  ========================================================================= */
  describe('10. High Level Occurrence Generation for Range', () => {
    test('generates occurrences across multiple days sorted by time and priority', () => {
      const taskA: Task = {
        ...baseTask,
        id: 'task_a',
        title: 'Morning Yoga',
        start_time: '07:00',
        priority: 'medium',
      };

      const taskB: Task = {
        ...baseTask,
        id: 'task_b',
        title: 'Evening Run',
        start_time: '18:00',
        priority: 'high',
      };

      const taskC: Task = {
        ...baseTask,
        id: 'task_c',
        title: 'Read Book',
        all_day: true,
        start_time: undefined,
        priority: 'low',
      };

      const dailyRuleA: RecurrenceRule = {
        id: 'rule_a',
        task_id: 'task_a',
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      const dailyRuleB: RecurrenceRule = {
        id: 'rule_b',
        task_id: 'task_b',
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'never',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      const nonRecurringTaskC: Task = {
        ...taskC,
        date: '2026-03-10',
      };

      const occurrences = getOccurrencesForDate(
        [
          { task: taskA, rule: dailyRuleA },
          { task: taskB, rule: dailyRuleB },
          { task: nonRecurringTaskC, rule: null },
        ],
        [],
        '2026-03-10'
      );

      expect(occurrences).toHaveLength(3);
      // All day tasks come first
      expect(occurrences[0].title).toBe('Read Book');
      // Then 07:00 Morning Yoga
      expect(occurrences[1].title).toBe('Morning Yoga');
      // Then 18:00 Evening Run
      expect(occurrences[2].title).toBe('Evening Run');
    });

    test('getOccurrencesForRange collects occurrences across all days in window', () => {
      const rule: RecurrenceRule = {
        id: 'rule_range_test',
        task_id: baseTask.id,
        frequency: 'daily',
        interval: 1,
        start_date: '2026-03-10',
        end_type: 'until_date',
        until_date: '2026-03-13',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      };

      const occurrences = getOccurrencesForRange(
        [{ task: baseTask, rule }],
        [],
        '2026-03-09',
        '2026-03-15'
      );

      // Should only produce occurrences for 10, 11, 12, 13 (4 total)
      expect(occurrences).toHaveLength(4);
      expect(occurrences.map((o) => o.date)).toEqual([
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
      ]);
    });
  });
});
