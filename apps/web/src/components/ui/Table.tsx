import {
  Table as ShadcnTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/primitives/table';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T & string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id?: string }>({
  columns,
  data,
  keyField = 'id' as keyof T & string,
  onRowClick,
}: TableProps<T>) {
  return (
    <ShadcnTable>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
              —
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, idx) => (
            <TableRow
              key={String(row[keyField] ?? idx)}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </ShadcnTable>
  );
}
