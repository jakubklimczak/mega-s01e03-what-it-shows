<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, PROBLEMS, TICKETS_REPO } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const rows = (reports as Report[]).filter((r) => r.mergedInto === ticket).length;
  const groups = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const total = $derived(new Set(groups.flatMap((g) => g.reports.map((r) => r.id))).size);
  const list = (m: Record<string, number>) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{total}</strong> reports in #{ticket} ({rows} rows in the export, {rows - total} repeated) ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const p = g.problem === 'unplaced' ? null : PROBLEMS[g.problem]}
      <tr>
        <td><code>{g.problem}</code>{#if p}<br /><span class="what">{p.title}</span>{/if}</td>
        <td>{g.reports.length}{#if g.problem === 'one-day'}<br /><span class="what">also counted under the cause they are filed under</span>{/if}</td>
        <td>{g.tenants}</td>
        <td class="tags">{list(g.channels)}</td>
        <td class="tags">{list(g.taggedAs)}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if p}<a href="{TICKETS_REPO}/issues/{p.issue}">#{p.issue}</a>{:else}none{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .what { color: var(--muted); font-size: 0.85em; }
  .tags { color: var(--muted); font-size: 0.85em; }
</style>
