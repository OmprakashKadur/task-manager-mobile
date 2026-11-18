import { describe, test, expect } from '@jest/globals';
import {
  computeTimelineLayout,
  parseTimeToMinutes,
} from '../src/services/plannerLayout';
import { TaskOccurrence } from '../src/types';

function createMockOccurrence(
  id: string,
  startTime: string,
  endTime?: string,
  title: string = 'Test Task'
): TaskOccurrence {
  return {
    id,
    task_id: `task_${id}`,
    title,
    date: '2026-11-18',
    start_time: startTime,
    end_time: endTime,
    all_day: false,
    category_id: 'work',
    priority: 'medium',
    subtasks: [],
    reminders: [],
    status: 'pending',
    is_recurring: false,
    has_exception: false,
    time_period: 'morning',
    is_overdue: false,
  };
}

describe('Planner Timeline Overlap Layout', () => {
  test('parseTimeToMinutes correctly converts HH:mm to minutes', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('01:30')).toBe(90);
    expect(parseTimeToMinutes('09:45')).toBe(585);
    expect(parseTimeToMinutes('16:20')).toBe(980);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
    expect(parseTimeToMinutes(undefined)).toBe(0);
  });

  test('single event gets full width (totalColumns = 1, columnIndex = 0)', () => {
    const occ = createMockOccurrence('1', '10:00', '11:00');
    const layout = computeTimelineLayout([occ]);

    expect(layout).toHaveLength(1);
    expect(layout[0].columnIndex).toBe(0);
    expect(layout[0].totalColumns).toBe(1);
    expect(layout[0].startMins).toBe(600);
    expect(layout[0].endMins).toBe(660);
  });

  test('two non-overlapping events each get full width (totalColumns = 1)', () => {
    const occ1 = createMockOccurrence('1', '09:00', '10:00');
    const occ2 = createMockOccurrence('2', '10:00', '11:00'); // Touches at 10:00, does not overlap
    const layout = computeTimelineLayout([occ1, occ2]);

    expect(layout).toHaveLength(2);
    expect(layout[0].columnIndex).toBe(0);
    expect(layout[0].totalColumns).toBe(1);
    expect(layout[1].columnIndex).toBe(0);
    expect(layout[1].totalColumns).toBe(1);
  });

  test('two simultaneously overlapping events are split into 2 columns (50% width)', () => {
    const occ1 = createMockOccurrence('1', '14:00', '15:00', 'Design Review');
    const occ2 = createMockOccurrence('2', '14:00', '15:00', 'Team Sync');
    const layout = computeTimelineLayout([occ1, occ2]);

    expect(layout).toHaveLength(2);
    expect(layout[0].totalColumns).toBe(2);
    expect(layout[1].totalColumns).toBe(2);
    expect(layout[0].columnIndex).toBe(0);
    expect(layout[1].columnIndex).toBe(1);
  });

  test('partial overlap allocates distinct columns within the cluster', () => {
    const occ1 = createMockOccurrence('1', '10:00', '11:30');
    const occ2 = createMockOccurrence('2', '10:45', '12:00');
    const layout = computeTimelineLayout([occ1, occ2]);

    expect(layout).toHaveLength(2);
    expect(layout[0].totalColumns).toBe(2);
    expect(layout[1].totalColumns).toBe(2);
    expect(layout[0].columnIndex).toBe(0);
    expect(layout[1].columnIndex).toBe(1);
  });

  test('column reuse: sequential tasks share a column alongside a longer task', () => {
    // Task 1: 10:00 - 12:00 (spans 2 hours)
    // Task 2: 10:00 - 11:00
    // Task 3: 11:00 - 12:00
    const occ1 = createMockOccurrence('1', '10:00', '12:00');
    const occ2 = createMockOccurrence('2', '10:00', '11:00');
    const occ3 = createMockOccurrence('3', '11:00', '12:00');

    const layout = computeTimelineLayout([occ1, occ2, occ3]);

    expect(layout).toHaveLength(3);
    // All 3 belong to a 2-column cluster
    expect(layout[0].totalColumns).toBe(2);
    expect(layout[1].totalColumns).toBe(2);
    expect(layout[2].totalColumns).toBe(2);

    // occ1 (10:00-12:00) gets column 0
    expect(layout[0].occurrence.id).toBe('1');
    expect(layout[0].columnIndex).toBe(0);

    // occ2 (10:00-11:00) gets column 1
    expect(layout[1].occurrence.id).toBe('2');
    expect(layout[1].columnIndex).toBe(1);

    // occ3 (11:00-12:00) reuses column 1 because occ2 ended at 11:00
    expect(layout[2].occurrence.id).toBe('3');
    expect(layout[2].columnIndex).toBe(1);
  });

  test('three simultaneous tasks get 3 columns', () => {
    const occ1 = createMockOccurrence('1', '15:00', '16:00');
    const occ2 = createMockOccurrence('2', '15:00', '16:00');
    const occ3 = createMockOccurrence('3', '15:00', '16:00');

    const layout = computeTimelineLayout([occ1, occ2, occ3]);

    expect(layout).toHaveLength(3);
    expect(layout[0].totalColumns).toBe(3);
    expect(layout[1].totalColumns).toBe(3);
    expect(layout[2].totalColumns).toBe(3);
    expect(layout.map((l) => l.columnIndex).sort()).toEqual([0, 1, 2]);
  });

  test('minimum visual duration of 25 minutes enforced for 0m / short events', () => {
    const occ = createMockOccurrence('1', '13:00', '13:05');
    const layout = computeTimelineLayout([occ]);

    expect(layout[0].startMins).toBe(780);
    expect(layout[0].endMins).toBe(805); // 780 + 25
  });
});
