import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'

export type DataColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Makes the column sortable. Nulls always sort last. */
  sortValue?: (row: T) => string | number | null
  className?: string
}

type SortState = { key: string; direction: 'asc' | 'desc' }

type DataTableProps<T> = {
  rows: readonly T[]
  columns: readonly DataColumn<T>[]
  rowKey: (row: T) => string
  /** Accessible table name. */
  caption: string
  /** Text matched by the search box; omit to hide search. */
  searchText?: (row: T) => string
  searchPlaceholder?: string
  initialSort?: SortState
  /** Shown when there are no rows at all. */
  empty: ReactNode
  toolbar?: ReactNode
}

function compare(
  a: string | number | null,
  b: string | number | null,
  direction: SortState['direction'],
) {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  const order =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b))
  return direction === 'asc' ? order : -order
}

/** Searchable, sortable dashboard table that scrolls sideways on phones. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  searchText,
  searchPlaceholder = 'Search…',
  initialSort,
  empty,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | undefined>(initialSort)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered =
      needle && searchText
        ? rows.filter((row) => searchText(row).toLowerCase().includes(needle))
        : [...rows]
    const column = sort && columns.find((item) => item.key === sort.key)
    const sortValue = column?.sortValue
    if (!sort || !sortValue) return filtered
    return filtered.toSorted((a, b) =>
      compare(sortValue(a), sortValue(b), sort.direction),
    )
  }, [rows, columns, query, searchText, sort])

  if (rows.length === 0) return <div>{empty}</div>

  return (
    <div className="min-w-0">
      {(searchText || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {searchText && (
            <label className="relative block w-full max-w-xs">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>
          )}
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={`px-4 py-3 ${column.className ?? ''}`}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort({
                            key: column.key,
                            direction:
                              active && sort.direction === 'asc'
                                ? 'desc'
                                : 'asc',
                          })
                        }
                        className="inline-flex items-center gap-1 rounded hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none dark:hover:text-white"
                      >
                        {column.header}
                        {active &&
                          (sort.direction === 'asc' ? (
                            <ArrowUp size={12} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={12} aria-hidden="true" />
                          ))}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                className="text-slate-700 hover:bg-slate-50/60 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-middle ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No matches for “{query}”.
          </p>
        )}
      </div>
    </div>
  )
}
