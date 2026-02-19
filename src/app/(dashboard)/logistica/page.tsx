'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Loader2,
  Truck,
  Clock,
  Route,
  CheckCircle2,
  DollarSign,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import {
  getDeliveries,
  getDrivers,
  getLocations,
  assignDriver,
  unassignDriver,
  reorderDriverDeliveries,
  startRoute,
  toggleDeliveryConfirmed,
  togglePhotoConfirmed,
  completeDelivery,
  deleteDelivery,
} from '@/services/logistics/logistics.service';
import { SortableDeliveryCardFull, SortableDeliveryCardCompact, DeliveryCardCompleted } from '@/components/logistics/delivery-card';
import { AddDeliveryModal } from '@/components/logistics/add-delivery-modal';
import { DeliveryDetailModal } from '@/components/logistics/delivery-detail-modal';
import type { Delivery } from '@/types/logistics.types';
import type { Collaborator } from '@/types/collaborators.types';
import type { StockLocation } from '@/types/products.types';

// ============================================
// Coluna Droppable
// ============================================

function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

// ============================================
// Page
// ============================================

export default function LogisticaPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Collaborator[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [globalDeparture, setGlobalDeparture] = useState('');
  const [globalReturn, setGlobalReturn] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDriverId, setFilterDriverId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // ============================================
  // DnD Sensors
  // ============================================

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dels, drvs, locs] = await Promise.all([
        getDeliveries(),
        getDrivers(),
        getLocations(),
      ]);
      setDeliveries(dels);
      setDrivers(drvs);
      setLocations(locs);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // Computed
  // ============================================

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const term = searchTerm.toLowerCase();
      if (term && !(d.client_name || '').toLowerCase().includes(term) && !(d.items_summary || '').toLowerCase().includes(term)) return false;
      if (filterDriverId && d.driver_id !== filterDriverId) return false;
      if (filterDateStart && d.created_at < filterDateStart) return false;
      if (filterDateEnd && d.created_at.slice(0, 10) > filterDateEnd) return false;
      return true;
    });
  }, [deliveries, searchTerm, filterDriverId, filterDateStart, filterDateEnd]);

  const waiting = useMemo(
    () => filteredDeliveries.filter((d) => d.status === 'aguardando' && !d.driver_id),
    [filteredDeliveries]
  );

  const completed = useMemo(
    () => filteredDeliveries.filter((d) => d.status === 'entregue'),
    [filteredDeliveries]
  );

  const emRota = useMemo(
    () => filteredDeliveries.filter((d) => d.status === 'em_rota'),
    [filteredDeliveries]
  );

  const pendentes = useMemo(
    () => filteredDeliveries.filter((d) => d.status === 'aguardando'),
    [filteredDeliveries]
  );

  const vlrEmRota = useMemo(
    () => emRota.reduce((sum, d) => sum + Number(d.total), 0),
    [emRota]
  );

  const getDriverDeliveries = useCallback(
    (driverId: string) =>
      filteredDeliveries
        .filter((d) => d.driver_id === driverId && d.status !== 'entregue')
        .sort((a, b) => (a.route_order ?? 999) - (b.route_order ?? 999)),
    [filteredDeliveries]
  );

  const getLocationName = useCallback(
    (id: string | null) => {
      if (!id) return undefined;
      return locations.find((l) => l.id === id)?.name;
    },
    [locations]
  );

  // ============================================
  // Handlers
  // ============================================

  const handleAssignDriver = async (deliveryId: string, driverId: string) => {
    try {
      await assignDriver(deliveryId, driverId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atribuir motorista');
    }
  };

  const handleMoveCard = async (driverId: string, currentIndex: number, direction: 'up' | 'down') => {
    const driverCards = getDriverDeliveries(driverId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= driverCards.length) return;

    const ids = driverCards.map((d) => d.id);
    [ids[currentIndex], ids[newIndex]] = [ids[newIndex], ids[currentIndex]];

    try {
      await reorderDriverDeliveries(driverId, ids);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reordenar');
    }
  };

  const handleUnassign = async (deliveryId: string) => {
    try {
      await unassignDriver(deliveryId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover atribuição');
    }
  };

  const handleStartRoute = async (driverId: string) => {
    try {
      await startRoute(driverId);
      toast.success('Rota iniciada com sucesso');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar rota');
    }
  };

  const handleToggleDeliveryConfirmed = async (delivery: Delivery) => {
    try {
      await toggleDeliveryConfirmed(delivery.id, delivery.delivery_confirmed);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const handleTogglePhotoConfirmed = async (delivery: Delivery) => {
    try {
      await togglePhotoConfirmed(delivery.id, delivery.photo_confirmed);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const handleComplete = async (deliveryId: string) => {
    try {
      await completeDelivery(deliveryId);
      toast.success('Entrega concluída com sucesso');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir entrega');
    }
  };

  const handleDelete = async (deliveryId: string) => {
    try {
      await deleteDelivery(deliveryId);
      toast.success('Entrega excluída com sucesso');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleOptimize = () => {
    toast.info('Funcionalidade em breve! Integração com Google Maps API para otimização de rotas.');
  };

  // ============================================
  // Drag & Drop
  // ============================================

  const findContainer = (itemId: string): string | null => {
    if (itemId === 'waiting' || itemId === 'completed') return itemId;
    if (itemId.startsWith('driver-')) return itemId;

    if (waiting.some((d) => d.id === itemId)) return 'waiting';
    if (completed.some((d) => d.id === itemId)) return 'completed';

    for (const driver of drivers) {
      const driverDels = getDriverDeliveries(driver.id);
      if (driverDels.some((d) => d.id === itemId)) return `driver-${driver.id}`;
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceContainer = findContainer(activeId);
    const destContainer = findContainer(overId);

    if (!sourceContainer || !destContainer) return;
    if (sourceContainer === 'completed' || destContainer === 'completed') return;

    if (sourceContainer === destContainer) {
      // Reorder within same driver column
      if (sourceContainer === 'waiting') return;

      const driverId = sourceContainer.replace('driver-', '');
      const driverCards = getDriverDeliveries(driverId);
      const oldIndex = driverCards.findIndex((d) => d.id === activeId);
      const newIndex = driverCards.findIndex((d) => d.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newOrder = arrayMove(driverCards.map((d) => d.id), oldIndex, newIndex);

      try {
        await reorderDriverDeliveries(driverId, newOrder);
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao reordenar');
      }
    } else {
      // Cross-column move
      if (destContainer === 'waiting') {
        await handleUnassign(activeId);
      } else {
        const driverId = destContainer.replace('driver-', '');
        await handleAssignDriver(activeId, driverId);
      }
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading && deliveries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Logística
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestão de entregas e rotas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Saida/Retorno Geral */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Saída Geral
            </label>
            <select
              value={globalDeparture}
              onChange={(e) => setGlobalDeparture(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="">Selecionar...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Retorno Geral
            </label>
            <select
              value={globalReturn}
              onChange={(e) => setGlobalReturn(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="">Selecionar...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            ADICIONAR LOGÍSTICA
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">VLR EM ROTA</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(vlrEmRota)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-950">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">PENDENTES</p>
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {pendentes.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
            <Route className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">EM ROTA</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {emRota.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">CONCLUÍDAS</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {completed.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente ou itens..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-3 py-2 text-sm dark:text-gray-200"
            />
          </div>
          <select
            value={filterDriverId}
            onChange={(e) => setFilterDriverId(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Todos os motoristas</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          />
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 pb-4" style={{ minWidth: `${(drivers.length + 2) * 300 + (drivers.length + 1) * 16}px` }}>
            {/* Coluna AGUARDANDO */}
            <div className="w-[300px] shrink-0">
              <div className="mb-3 flex items-center justify-between rounded-lg bg-yellow-50 dark:bg-yellow-950 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                    AGUARDANDO
                  </span>
                </div>
                <span className="rounded-full bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:text-yellow-300">
                  {waiting.length}
                </span>
              </div>
              <DroppableColumn id="waiting" className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                <SortableContext items={waiting.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  {waiting.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
                      <Truck className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Nenhuma entrega aguardando
                      </p>
                    </div>
                  ) : (
                    waiting.map((d) => (
                      <SortableDeliveryCardFull
                        key={d.id}
                        delivery={d}
                        drivers={drivers}
                        onAssignDriver={handleAssignDriver}
                        onDelete={handleDelete}
                        onClick={() => setSelectedDelivery(d)}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>

            {/* Colunas dos Motoristas */}
            {drivers.map((driver) => {
              const driverDeliveries = getDriverDeliveries(driver.id);
              const hasAguardando = driverDeliveries.some((d) => d.status === 'aguardando');

              return (
                <div key={driver.id} className="w-[300px] shrink-0">
                  <div className="mb-3 rounded-lg bg-blue-50 dark:bg-blue-950 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {driver.full_name}
                        </span>
                        <p className="text-[11px] text-blue-500 dark:text-blue-400">
                          Logística
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-200 dark:bg-blue-800 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                        {driverDeliveries.length}
                      </span>
                    </div>

                    {/* Saida/Retorno do driver */}
                    <div className="mt-2 flex gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] uppercase text-blue-500 dark:text-blue-400">Saída</span>
                        <p className="truncate text-[11px] font-medium text-blue-700 dark:text-blue-300">
                          {getLocationName(globalDeparture) || '—'}
                        </p>
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] uppercase text-blue-500 dark:text-blue-400">Retorno</span>
                        <p className="truncate text-[11px] font-medium text-blue-700 dark:text-blue-300">
                          {getLocationName(globalReturn) || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleOptimize}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-blue-200 dark:border-blue-700 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
                      >
                        <Sparkles className="h-3 w-3" />
                        OTIMIZAR SEQUÊNCIA
                      </button>
                      {hasAguardando && (
                        <button
                          onClick={() => handleStartRoute(driver.id)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                        >
                          <Route className="h-3 w-3" />
                          INICIAR ROTA
                        </button>
                      )}
                    </div>
                  </div>

                  <DroppableColumn id={`driver-${driver.id}`} className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                    <SortableContext items={driverDeliveries.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                      {driverDeliveries.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Arraste entregas aqui
                          </p>
                        </div>
                      ) : (
                        driverDeliveries.map((d, i) => (
                          <SortableDeliveryCardCompact
                            key={d.id}
                            delivery={d}
                            index={i}
                            total={driverDeliveries.length}
                            departureLocationName={getLocationName(globalDeparture)}
                            returnLocationName={getLocationName(globalReturn)}
                            onMoveUp={() => handleMoveCard(driver.id, i, 'up')}
                            onMoveDown={() => handleMoveCard(driver.id, i, 'down')}
                            onToggleDeliveryConfirmed={() => handleToggleDeliveryConfirmed(d)}
                            onTogglePhotoConfirmed={() => handleTogglePhotoConfirmed(d)}
                            onComplete={() => handleComplete(d.id)}
                            onUnassign={() => handleUnassign(d.id)}
                            onClick={() => setSelectedDelivery(d)}
                          />
                        ))
                      )}
                    </SortableContext>
                  </DroppableColumn>
                </div>
              );
            })}

            {/* Coluna CONCLUIDAS */}
            <div className="w-[300px] shrink-0">
              <div className="mb-3 flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                    CONCLUÍDAS
                  </span>
                </div>
                <span className="rounded-full bg-green-200 dark:bg-green-800 px-2 py-0.5 text-xs font-bold text-green-700 dark:text-green-300">
                  {completed.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                {completed.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Nenhuma entrega concluída
                    </p>
                  </div>
                ) : (
                  completed.map((d) => (
                    <DeliveryCardCompleted key={d.id} delivery={d} onClick={() => setSelectedDelivery(d)} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeDragId ? (() => {
            const d = deliveries.find((del) => del.id === activeDragId);
            if (!d) return null;
            return (
              <div className="w-[280px] rounded-lg border-2 border-blue-400 bg-white dark:bg-gray-800 p-3 shadow-xl">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{d.client_name}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{d.items_summary}</p>
                <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(d.total)}</p>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>

      {/* Add Modal */}
      {showAddModal && (
        <AddDeliveryModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onUpdated={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
