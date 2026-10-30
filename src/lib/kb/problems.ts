// What #4471 actually holds, problem by problem. Builds on causes.ts and does not change it.
//
// causes.ts places a report by its tenant and channel. That is right for the two month/day bugs.
// It cannot see a report whose body describes something else: the desk read five reports as a
// one-day move (desk-notes.json), not a month/day flip. Those get their own row and their own
// ticket here. Counts follow the desk's view: those reports also stay counted where they are
// filed, under their cause.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

// Where the tickets for these problems live.
export const TICKETS_REPO = 'https://github.com/jakubklimczak/mega-s01e03-what-it-shows';

export type Problem ='parser' | 'hint' | 'one-day' | 'unplaced';

export const PROBLEMS: Record<Exclude<Problem, 'unplaced'>, { title: string; issue: number }> = {
  parser: { title: 'Shared date parser reads day-first dates month first', issue: 1 },
  hint: { title: 'booking-v3 form hint asks day-first tenants for MM/DD/YYYY', issue: 2 },
  'one-day': { title: 'Invites land one day off (a whole-day shift, not a flip)', issue: 3 },
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

// One id, one report (the export repeats some), then one group per problem, largest first.
export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  // The desk's view: a report counts where it is filed, by cause (causes.ts). A report the desk
  // read as a one-day move stays counted under its cause, and also gets the one-day row.
  for (const r of merged) {
    const c: Problem = causeOf(r, tenantOf(r)) ?? 'unplaced';
    by.set(c, [...(by.get(c) ?? []), r]);
    if (problemOf(r, tenantOf(r), oneDayMove) === 'one-day') by.set('one-day', [...(by.get('one-day') ?? []), r]);
  }
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: tally(rs, (r) => r.channel),
        taggedAs: tally(rs, (r) => r.meta.intakeTag),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
