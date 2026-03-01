import { Badge as ShadcnBadge } from '@/components/ui/primitives/badge';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

const VARIANT_CLASSES = {
  default: '',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
} as const;

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <ShadcnBadge
      variant={variant === 'default' ? 'secondary' : 'outline'}
      className={cn(VARIANT_CLASSES[variant])}
    >
      {children}
    </ShadcnBadge>
  );
}
