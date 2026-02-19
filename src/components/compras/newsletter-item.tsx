import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NewsletterItem as NewsletterItemType, NewsletterImpact } from '@/lib/newsletter-data';

const impactConfig: Record<NewsletterImpact, { icon: typeof TrendingUp; label: string; badge: string; border: string }> = {
  alta: {
    icon: TrendingUp,
    label: 'Alta',
    badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    border: 'border-l-red-500',
  },
  baixa: {
    icon: TrendingDown,
    label: 'Baixa',
    badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    border: 'border-l-green-500',
  },
  estavel: {
    icon: Minus,
    label: 'Estavel',
    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    border: 'border-l-gray-400',
  },
};

interface NewsletterItemProps {
  item: NewsletterItemType;
  index: number;
}

export function NewsletterItem({ item, index }: NewsletterItemProps) {
  const config = impactConfig[item.impact];
  const Icon = config.icon;

  return (
    <article className={cn('border-l-4 rounded-r-lg bg-white dark:bg-gray-800 p-5 shadow-sm', config.border)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {index}
        </span>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', config.badge)}>
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
        <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
          {item.category}
        </span>
      </div>

      <a
        href={item.articleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group"
      >
        <h3 className="mb-2 text-base font-bold leading-snug text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.title}
        </h3>
      </a>

      <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {item.summary}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
        <span className="font-medium">{item.source}</span>
        <a
          href={item.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Ler matéria <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
