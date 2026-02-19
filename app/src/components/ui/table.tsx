import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className={cn('w-full', className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-gray-50 dark:bg-gray-900', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800', className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 text-sm', className)} {...props}>
      {children}
    </td>
  );
}

export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortKey?: string;
  currentSort?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
}

export function TableHeaderCell({
  className,
  children,
  sortable,
  sortKey,
  currentSort,
  onSort,
  ...props
}: TableHeaderCellProps) {
  const isActive = currentSort?.key === sortKey;

  if (!sortable || !sortKey) {
    return (
      <th
        className={cn('px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400', className)}
        {...props}
      >
        {children}
      </th>
    );
  }

  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
        isActive && 'text-gray-900 dark:text-gray-100',
        className
      )}
      onClick={() => onSort?.(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive && currentSort ? (
          currentSort.direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </div>
    </th>
  );
}
