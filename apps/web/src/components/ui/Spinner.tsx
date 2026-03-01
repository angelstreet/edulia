import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', SIZE_MAP[size])}
      role="status"
      aria-label="Loading"
    />
  );
}
