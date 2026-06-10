import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTableControls, TableToolbar, SortTh, Pager } from '@/components/admin/DataTable';

type Row = Record<string, unknown> & { name: string; status: string; count: number };

const ROWS: Row[] = [
  { name: 'alpha@x.com', status: 'active', count: 3 },
  { name: 'beta@x.com', status: 'suspended', count: 9 },
  { name: 'gamma@y.com', status: 'active', count: 1 },
];

/** Minimal harness table exercising the hook + presentational pieces together. */
function Harness({ rows = ROWS, pageSize = 25 }: { rows?: Row[]; pageSize?: number }) {
  const t = useTableControls<Row>(rows, {
    searchKeys: ['name'],
    facetKeys: ['status'],
    pageSize,
  });
  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Search…"
        total={t.total}
        facets={[
          {
            key: 'status',
            label: 'Status',
            options: t.facetOptions.status ?? [],
            value: t.facetValues.status ?? '',
            onChange: (v) => t.setFacet('status', v),
          },
        ]}
      />
      <table>
        <thead>
          <tr>
            <SortTh label="Count" sortKey="count" sort={t.sort} onToggle={t.toggleSort} />
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td data-testid="count">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={t.page} pageCount={t.pageCount} onPage={t.setPage} />
    </div>
  );
}

describe('admin DataTable controls', () => {
  it('filters rows by search text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText('3 results')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search…'), 'beta');
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(screen.getByText('beta@x.com')).toBeInTheDocument();
    expect(screen.queryByText('alpha@x.com')).not.toBeInTheDocument();
  });

  it('filters by a facet value', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText('Filter by Status'), 'suspended');
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(screen.getByText('beta@x.com')).toBeInTheDocument();
  });

  it('sorts by a column and flips direction on second click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const counts = () => screen.getAllByTestId('count').map((c) => c.textContent);

    await user.click(screen.getByRole('button', { name: /Count/i }));
    expect(counts()).toEqual(['1', '3', '9']); // asc

    await user.click(screen.getByRole('button', { name: /Count/i }));
    expect(counts()).toEqual(['9', '3', '1']); // desc
  });

  it('paginates and hides the pager when one page fits', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      name: `user${i}@x.com`,
      status: 'active',
      count: i,
    }));
    render(<Harness rows={many} pageSize={25} />);
    expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();
    expect(screen.getAllByTestId('count')).toHaveLength(25);
  });

  it('shows no pager for a single page', () => {
    render(<Harness />);
    expect(screen.queryByText(/Page 1/)).not.toBeInTheDocument();
  });
});
