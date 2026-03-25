import { useState, useEffect, useRef } from 'react';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { useAuthStore } from '@/stores/authStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { X, Camera, AlertCircle } from 'lucide-react';
import type { CustomFood } from '@/types';

interface CustomFoodModalProps {
  onClose: () => void;
  onSaved: (food: CustomFood) => void;
  editFood?: CustomFood | null;
}

export function CustomFoodModal({ onClose, onSaved, editFood }: CustomFoodModalProps) {
  const { user } = useAuthStore();
  const { createCustomFood, updateCustomFood } = useCustomFoodStore();

  const [name, setName] = useState(editFood?.name ?? '');
  const [brand, setBrand] = useState(editFood?.brand ?? '');
  const [calories, setCalories] = useState(editFood ? String(editFood.calories_per_100g) : '');
  const [protein, setProtein] = useState(editFood ? String(editFood.protein_per_100g) : '');
  const [carbs, setCarbs] = useState(editFood ? String(editFood.carbs_per_100g) : '');
  const [fat, setFat] = useState(editFood ? String(editFood.fat_per_100g) : '');
  const [fiber, setFiber] = useState(editFood ? String(editFood.fiber_per_100g) : '');
  const [isVegan, setIsVegan] = useState(editFood?.is_vegan ?? true);
  const [imageUrl, setImageUrl] = useState(editFood?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useBackHandler(true, onClose);
  const { sheetRef, backdropRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDismiss({ onDismiss: onClose });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('custom-food-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setError('No se pudo subir la imagen. Inténtalo de nuevo.');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('custom-food-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'El nombre es obligatorio';
    if (!imageUrl) return 'La foto del producto es obligatoria';
    const cal = parseFloat(calories);
    const prot = parseFloat(protein);
    const carb = parseFloat(carbs);
    const f = parseFloat(fat);
    if (isNaN(cal) || cal < 0) return 'Introduce calorías válidas (>= 0)';
    if (isNaN(prot) || prot < 0) return 'Introduce proteínas válidas (>= 0)';
    if (isNaN(carb) || carb < 0) return 'Introduce carbohidratos válidos (>= 0)';
    if (isNaN(f) || f < 0) return 'Introduce grasas válidas (>= 0)';
    const fib = parseFloat(fiber);
    if (fiber && (isNaN(fib) || fib < 0)) return 'Introduce fibra válida (>= 0)';
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    const foodData = {
      name: name.trim(),
      brand: brand.trim() || null,
      image_url: imageUrl || null,
      calories_per_100g: parseFloat(calories),
      protein_per_100g: parseFloat(protein),
      carbs_per_100g: parseFloat(carbs),
      fat_per_100g: parseFloat(fat),
      fiber_per_100g: parseFloat(fiber) || 0,
      is_vegan: isVegan,
    };

    if (editFood) {
      const { error: updateError } = await updateCustomFood(editFood.id, foodData);
      setSaving(false);
      if (updateError) {
        setError(updateError);
      } else {
        onSaved({ ...editFood, ...foodData, updated_at: new Date().toISOString() });
      }
    } else {
      const { data, error: createError } = await createCustomFood({ ...foodData, user_id: user.id });
      setSaving(false);
      if (createError || !data) {
        setError(createError ?? 'Error desconocido');
      } else {
        onSaved(data);
      }
    }
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-center" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bg-white w-full mt-8 rounded-t-3xl overflow-y-auto pb-24"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="w-10 h-1 bg-surface-300 rounded-full" />
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">
              {editFood ? 'Editar alimento' : 'Crear alimento personalizado'}
            </h3>
            <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100">
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>

          {/* Photo upload */}
          <div>
            <label className="label">Foto del producto *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="Producto" className="w-full h-40 object-contain bg-surface-50 rounded-2xl" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-surface-600 text-xs font-medium px-3 py-1.5 rounded-xl border border-surface-200 flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" /> Cambiar
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-32 border-2 border-dashed border-surface-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-surface-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
              >
                {uploading ? (
                  <><Spinner className="text-brand-500" /> <span className="text-sm">Subiendo...</span></>
                ) : (
                  <><Camera className="w-6 h-6" /> <span className="text-sm font-medium">Tomar o subir foto</span></>
                )}
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ej: Tofu firme ecológico"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="label">Marca (opcional)</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="input"
              placeholder="Ej: Naturgreen"
            />
          </div>

          {/* Macros */}
          <div>
            <label className="label">Información nutricional (por 100g) *</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Calorías (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="input font-mono"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Proteínas (g)</label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="input font-mono"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Carbohidratos (g)</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="input font-mono"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">Grasas (g)</label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="input font-mono"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-surface-500 mb-1 block">Fibra (g) — opcional</label>
              <input
                type="number"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="input font-mono"
                inputMode="decimal"
                placeholder="0"
              />
            </div>
          </div>

          {/* Vegan toggle */}
          <div className="flex items-center justify-between bg-surface-50 rounded-2xl px-4 py-3">
            <span className="text-sm font-medium text-surface-700">Es vegano</span>
            <button
              onClick={() => setIsVegan(!isVegan)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                isVegan ? 'bg-brand-500' : 'bg-surface-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  isVegan ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Spinner className="text-white" /> <span>Guardando...</span></>
            ) : (
              editFood ? 'Guardar cambios' : 'Crear alimento'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
