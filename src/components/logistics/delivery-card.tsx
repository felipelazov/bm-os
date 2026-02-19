'use client';

import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Check,
  MapPin,
  Phone,
  CreditCard,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { Delivery } from '@/types/logistics.types';
import type { Collaborator } from '@/types/collaborators.types';

// ============================================
// Card Completo (coluna AGUARDANDO)
// ============================================

interface FullCardProps {
  delivery: Delivery;
  drivers: Collaborator[];
  onAssignDriver: (deliveryId: string, driverId: string) => void;
  onDelete?: (deliveryId: string) => void;
  onClick?: () => void;
}

export function DeliveryCardFull({ delivery, drivers, onAssignDriver, onDelete, onClick }: FullCardProps) {
  const [deleting, setDeleting] = useState(false);

  const address = [
    delivery.client_address,
    delivery.client_address_number,
    delivery.client_neighborhood,
    delivery.client_city,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div onClick={onClick} className={cn("rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm", onClick && "cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors")}>
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {delivery.client_name}
        </h4>
        {!delivery.sale_id && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(true);
              onDelete(delivery.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={deleting}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Excluir entrega manual"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {address && (
        <div className="mt-1 flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{address}</span>
        </div>
      )}

      {delivery.client_phone && (
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Phone className="h-3 w-3 shrink-0" />
          <span>{delivery.client_phone}</span>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
        {delivery.items_summary}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(delivery.total)}
        </span>
        {delivery.payment_method && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <CreditCard className="h-3 w-3" />
            {delivery.payment_method}
          </span>
        )}
      </div>

      {delivery.sale_id && (
        <div className="mt-1">
          <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
            VENDA
          </span>
        </div>
      )}

      <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
        <select
          value=""
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value) onAssignDriver(delivery.id, e.target.value);
          }}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
        >
          <option value="">Atribuir a...</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Wrapper Sortable para FullCard
export function SortableDeliveryCardFull(props: FullCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.delivery.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DeliveryCardFull {...props} />
    </div>
  );
}

// ============================================
// Card Compacto (coluna do Motorista)
// ============================================

interface CompactCardProps {
  delivery: Delivery;
  index: number;
  total: number;
  departureLocationName?: string;
  returnLocationName?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleDeliveryConfirmed: () => void;
  onTogglePhotoConfirmed: () => void;
  onComplete: () => void;
  onUnassign: () => void;
  onClick?: () => void;
}

export function DeliveryCardCompact({
  delivery,
  index,
  total,
  departureLocationName,
  returnLocationName,
  onMoveUp,
  onMoveDown,
  onToggleDeliveryConfirmed,
  onTogglePhotoConfirmed,
  onComplete,
  onUnassign,
  onClick,
}: CompactCardProps) {
  const address = [
    delivery.client_address,
    delivery.client_address_number,
    delivery.client_neighborhood,
  ]
    .filter(Boolean)
    .join(', ');

  const canComplete = delivery.delivery_confirmed && delivery.photo_confirmed;

  return (
    <div onClick={onClick} className={cn(
      'rounded-lg border p-2.5 shadow-sm',
      delivery.status === 'em_rota'
        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
      onClick && 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors'
    )}>
      <div className="flex items-start gap-2">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
        {/* Badges S/R + Cliente */}
        <div className="flex items-center gap-1.5">
          {departureLocationName && (
            <span className="shrink-0 rounded bg-orange-100 dark:bg-orange-900 px-1 py-0.5 text-[9px] font-bold text-orange-700 dark:text-orange-300">
              S
            </span>
          )}
          {returnLocationName && (
            <span className="shrink-0 rounded bg-purple-100 dark:bg-purple-900 px-1 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300">
              R
            </span>
          )}
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {delivery.client_name}
          </span>
        </div>

        {address && (
          <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
            {address}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(delivery.total)}
          </span>
          {delivery.payment_method && (
            <span>| {delivery.payment_method}</span>
          )}
        </div>

        {/* Checkboxes + Complete + Unassign */}
        <div className="mt-2 flex items-center gap-3" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={delivery.delivery_confirmed}
              onChange={onToggleDeliveryConfirmed}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-green-600"
            />
            <span className="text-[11px] text-gray-600 dark:text-gray-400">ENTREGA</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={delivery.photo_confirmed}
              onChange={onTogglePhotoConfirmed}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-green-600"
            />
            <span className="text-[11px] text-gray-600 dark:text-gray-400">FOTO</span>
          </label>

          {canComplete && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 rounded bg-green-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
              CONCLUIR
            </button>
          )}

          <button
            onClick={onUnassign}
            className="ml-auto text-[11px] text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Devolver para Aguardando"
          >
            Remover
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper Sortable para CompactCard
export function SortableDeliveryCardCompact(props: CompactCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.delivery.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DeliveryCardCompact {...props} />
    </div>
  );
}

// ============================================
// Card Concluido (coluna CONCLUIDAS)
// ============================================

interface CompletedCardProps {
  delivery: Delivery;
  onClick?: () => void;
}

export function DeliveryCardCompleted({ delivery, onClick }: CompletedCardProps) {
  return (
    <div onClick={onClick} className={cn("rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-2.5", onClick && "cursor-pointer hover:border-green-300 dark:hover:border-green-600 transition-colors")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {delivery.client_name}
        </span>
        <span className="rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-300">
          ENTREGUE
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {delivery.items_summary}
      </p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="font-medium text-green-600 dark:text-green-400">
          {formatCurrency(delivery.total)}
        </span>
        {delivery.completed_at && (
          <span className="text-gray-400 dark:text-gray-500">
            {new Date(delivery.completed_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
