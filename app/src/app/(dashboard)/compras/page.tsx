import { getLatestEdition, formatWeekRange } from '@/lib/newsletter-data';
import { NewsletterItem } from '@/components/compras/newsletter-item';

export default function NewsletterPage() {
  const edition = getLatestEdition();
  const weekRange = formatWeekRange(edition.weekStart, edition.weekEnd);

  // Agrupar matérias por dia
  const groupedByDay = edition.items.reduce<Record<string, typeof edition.items>>((acc, item) => {
    if (!acc[item.publishedAt]) acc[item.publishedAt] = [];
    acc[item.publishedAt].push(item);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedByDay).sort();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Newsletter Semanal de Compras
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Semana de {weekRange}
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Matérias', value: edition.items.length },
          { label: 'Alta', value: edition.items.filter((i) => i.impact === 'alta').length, color: 'text-red-600 dark:text-red-400' },
          { label: 'Baixa', value: edition.items.filter((i) => i.impact === 'baixa').length, color: 'text-green-600 dark:text-green-400' },
          { label: 'Estável', value: edition.items.filter((i) => i.impact === 'estavel').length, color: 'text-gray-600 dark:text-gray-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
            <p className={`text-2xl font-bold ${stat.color || 'text-gray-900 dark:text-gray-100'}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Matérias agrupadas por dia */}
      {sortedDays.map((day) => {
        const dayDate = new Date(day + 'T12:00:00');
        const dayLabel = dayDate.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });

        return (
          <div key={day}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 capitalize">
                {dayLabel}
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="space-y-4">
              {groupedByDay[day].map((item, idx) => (
                <NewsletterItem
                  key={item.id}
                  item={item}
                  index={edition.items.indexOf(item) + 1}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
        Informações compiladas de fontes públicas. Caráter exclusivamente informativo.
      </p>
    </div>
  );
}
