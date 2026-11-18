import { TaskOccurrence } from '@/types';

export interface PositionedOccurrence {
  occurrence: TaskOccurrence;
  startMins: number;
  endMins: number;
  top: number;
  height: number;
  columnIndex: number;
  totalColumns: number;
}

/**
 * Converts HH:mm (or HH:mm:ss) string to minutes from midnight
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((v) => parseInt(v, 10));
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h * 60 + m;
}

interface LayoutItem {
  occ: TaskOccurrence;
  startMins: number;
  endMins: number;
  top: number;
  height: number;
}

/**
 * Computes non-overlapping layout positions (columns) for timed occurrences on an hourly timeline grid.
 *
 * Algorithm:
 * 1. Calculate visual start & end minutes (minimum 25m duration for readability).
 * 2. Sort by start time ascending, then by duration descending.
 * 3. Group overlapping occurrences into connected clusters.
 * 4. Within each cluster, greedily assign column indices so overlapping events sit side-by-side.
 */
export function computeTimelineLayout(
  occurrences: TaskOccurrence[],
  hourHeight: number = 68
): PositionedOccurrence[] {
  if (!occurrences || occurrences.length === 0) {
    return [];
  }

  // 1. Prepare items with minute timestamps & visual dimensions
  const items: LayoutItem[] = occurrences.map((occ) => {
    const startMins = parseTimeToMinutes(occ.start_time);
    const parsedEnd = occ.end_time ? parseTimeToMinutes(occ.end_time) : startMins + 45;
    // Enforce minimum visual duration of 25 minutes
    const endMins = Math.max(parsedEnd, startMins + 25);
    const durationMins = endMins - startMins;

    const top = (startMins / 60) * hourHeight;
    const height = Math.max((durationMins / 60) * hourHeight - 4, 34);

    return {
      occ,
      startMins,
      endMins,
      top,
      height,
    };
  });

  // 2. Sort items: earlier start times first; longer duration first if same start
  items.sort((a, b) => {
    if (a.startMins !== b.startMins) {
      return a.startMins - b.startMins;
    }
    const durA = a.endMins - a.startMins;
    const durB = b.endMins - b.startMins;
    if (durA !== durB) {
      return durB - durA;
    }
    return String(a.occ.id).localeCompare(String(b.occ.id));
  });

  // 3. Partition into clusters of overlapping events
  const clusters: LayoutItem[][] = [];
  let currentCluster: LayoutItem[] = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMins;
    } else if (item.startMins < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMins);
    } else {
      // Start fresh cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMins;
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. Assign columns within each cluster using greedy interval coloring
  const result: PositionedOccurrence[] = [];

  for (const cluster of clusters) {
    // Array of column end-times
    const columnEnds: number[] = [];
    const assignments: { item: LayoutItem; col: number }[] = [];

    for (const item of cluster) {
      let placedCol = -1;

      // Find the first column where this event starts at or after the previous event in that column ended
      for (let c = 0; c < columnEnds.length; c++) {
        if (item.startMins >= columnEnds[c]) {
          placedCol = c;
          columnEnds[c] = item.endMins;
          break;
        }
      }

      // If no existing column is free, add a new column
      if (placedCol === -1) {
        placedCol = columnEnds.length;
        columnEnds.push(item.endMins);
      }

      assignments.push({ item, col: placedCol });
    }

    const totalColumns = Math.max(columnEnds.length, 1);

    for (const { item, col } of assignments) {
      result.push({
        occurrence: item.occ,
        startMins: item.startMins,
        endMins: item.endMins,
        top: item.top,
        height: item.height,
        columnIndex: col,
        totalColumns,
      });
    }
  }

  return result;
}
