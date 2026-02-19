'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Loader2, Pencil, Trash2, Check, GripVertical, MapPin } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getStockLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  reorderLocations,
} from '@/services/products/stock.service';
import { fetchAddressByCep } from '@/lib/cep';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import type { StockLocation } from '@/types/products.types';

interface StockLocationsManagerProps {
  onClose: () => void;
  onChanged: () => void;
}

interface EditForm {
  name: string;
  cep: string;
  address: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
}

// ============================================
// Sortable Location Item
// ============================================

interface SortableItemProps {
  location: StockLocation;
  isEditing: boolean;
  editForm: EditForm;
  saving: boolean;
  loadingCep: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onDelete: () => void;
  onEditFormChange: (form: EditForm) => void;
  onCepBlur: () => void;
}

function SortableLocationItem({
  location,
  isEditing,
  editForm,
  saving,
  loadingCep,
  onStartEditing,
  onCancelEditing,
  onSave,
  onDelete,
  onEditFormChange,
  onCepBlur,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatAddress = (loc: StockLocation) => {
    const parts = [loc.address, loc.address_number, loc.neighborhood, loc.city, loc.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-3 ${
        isDragging
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg z-10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      {isEditing ? (
        /* Modo Edição Expandido */
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Nome *
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              autoFocus
            />
          </div>

          {/* CEP + Número */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                CEP
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editForm.cep}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatted = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                    onEditFormChange({ ...editForm, cep: formatted });
                  }}
                  onBlur={onCepBlur}
                  placeholder="00000-000"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-gray-100"
                />
                {loadingCep && (
                  <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-blue-500" />
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Número
              </label>
              <input
                type="text"
                value={editForm.address_number}
                onChange={(e) => onEditFormChange({ ...editForm, address_number: e.target.value })}
                placeholder="123"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                UF
              </label>
              <input
                type="text"
                value={editForm.state}
                onChange={(e) => onEditFormChange({ ...editForm, state: e.target.value })}
                placeholder="SP"
                maxLength={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Endereço preenchido pelo CEP */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Endereço
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => onEditFormChange({ ...editForm, address: e.target.value })}
              placeholder="Preenchido pelo CEP..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Bairro
              </label>
              <input
                type="text"
                value={editForm.neighborhood}
                onChange={(e) => onEditFormChange({ ...editForm, neighborhood: e.target.value })}
                placeholder="Preenchido pelo CEP..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Cidade
              </label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => onEditFormChange({ ...editForm, city: e.target.value })}
                placeholder="Preenchido pelo CEP..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onCancelEditing}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving || !editForm.name.trim()}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Salvar
            </button>
          </div>
        </div>
      ) : (
        /* Modo Visualizacao */
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:cursor-grabbing"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {location.name}
            </span>
            {formatAddress(location) && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatAddress(location)}</span>
              </div>
            )}
            {location.cep && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                CEP: {location.cep}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onStartEditing}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-gray-400 hover:text-red-600"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Manager Component
// ============================================

export function StockLocationsManager({ onClose, onChanged }: StockLocationsManagerProps) {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    cep: '',
    address: '',
    address_number: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    locationId: string | null;
    loading: boolean;
  }>({ open: false, locationId: null, loading: false });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStockLocations(false);
      setLocations(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      setError('');
      await createLocation(newName.trim());
      setNewName('');
      await fetchLocations();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (loc: StockLocation) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name,
      cep: loc.cep || '',
      address: loc.address || '',
      address_number: loc.address_number || '',
      neighborhood: loc.neighborhood || '',
      city: loc.city || '',
      state: loc.state || '',
    });
  };

  const handleCepBlur = async () => {
    const digits = editForm.cep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    try {
      setLoadingCep(true);
      const result = await fetchAddressByCep(digits);
      if (result) {
        setEditForm((prev) => ({
          ...prev,
          address: result.logradouro || prev.address,
          neighborhood: result.bairro || prev.neighborhood,
          city: result.localidade || prev.city,
          state: result.uf || prev.state,
        }));
      }
    } finally {
      setLoadingCep(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name.trim()) return;
    try {
      setSaving(true);
      setError('');
      await updateLocation(id, {
        name: editForm.name.trim(),
        cep: editForm.cep.trim() || null,
        address: editForm.address.trim() || null,
        address_number: editForm.address_number.trim() || null,
        neighborhood: editForm.neighborhood.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
      });
      setEditingId(null);
      await fetchLocations();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, locationId: id, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.locationId) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      await deleteLocation(deleteConfirm.locationId);
      toast.success('Local de estoque excluído com sucesso');
      setDeleteConfirm({ open: false, locationId: null, loading: false });
      await fetchLocations();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = locations.findIndex((l) => l.id === active.id);
    const newIndex = locations.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(locations, oldIndex, newIndex);

    // Optimistic update
    setLocations(reordered);

    try {
      await reorderLocations(reordered.map((l) => l.id));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reordenar');
      await fetchLocations();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Locais de Estoque
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do novo local..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            />
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : locations.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum local cadastrado.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={locations.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {locations.map((loc) => (
                    <SortableLocationItem
                      key={loc.id}
                      location={loc}
                      isEditing={editingId === loc.id}
                      editForm={editForm}
                      saving={saving}
                      loadingCep={loadingCep}
                      onStartEditing={() => startEditing(loc)}
                      onCancelEditing={() => setEditingId(null)}
                      onSave={() => handleUpdate(loc.id)}
                      onDelete={() => handleDelete(loc.id)}
                      onEditFormChange={setEditForm}
                      onCepBlur={handleCepBlur}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onCancel={() => setDeleteConfirm({ open: false, locationId: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={deleteConfirm.loading}
        title="Excluir local de estoque"
        message="Excluir este local de estoque?"
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
}
