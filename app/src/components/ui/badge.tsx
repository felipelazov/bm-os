import { cn } from '@/lib/utils';

const colorMap = {
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
};

export interface BadgeProps {
  color?: keyof typeof colorMap;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function Badge({ color = 'gray', children, className, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[color],
        pulse && 'animate-pulse',
        className
      )}
    >
      {children}
    </span>
  );
}
