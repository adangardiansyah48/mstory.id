"use client";

import { Check, ChevronRight, Clock, Users } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { AddonIcon, CategoryIcon } from "@/components/ui/icons";
import {
  type Addon,
  type Category,
  type Package,
  type SubCategory,
} from "@/lib/types";

interface Step1Props {
  categories: Category[];
  subCategories: SubCategory[];
  packages: Package[];
  addons: Addon[];
  selection: {
    category: Category | null;
    subCategory: SubCategory | null;
    selectedPackage: Package | null;
    addons: Addon[];
  };
  setSelection: (sel: {
    category: Category | null;
    subCategory: SubCategory | null;
    selectedPackage: Package | null;
    addons: Addon[];
  }) => void;
}

const selectedClass =
  "border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm";
const unselectedClass =
  "border-white/50 bg-white/60 backdrop-blur-md hover:border-[var(--brand)] hover:bg-white/85";

export function Step1Category({
  categories,
  subCategories,
  packages,
  addons,
  selection,
  setSelection,
}: Step1Props) {
  const subtotal =
    (selection.selectedPackage?.price || 0) +
    selection.addons.reduce((sum, a) => sum + a.price, 0);

  function selectCategory(category: Category) {
    setSelection({
      ...selection,
      category,
      subCategory: null,
      selectedPackage: null,
    });
  }

  function selectSubCategory(subCategory: SubCategory) {
    setSelection({
      ...selection,
      subCategory,
      selectedPackage: null,
    });
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          1. Pilih Kategori Event
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all",
                selection.category?.id === cat.id
                  ? selectedClass
                  : unselectedClass,
              )}
            >
              <CategoryIcon
                name={cat.name}
                className={cn(
                  "h-6 w-6",
                  selection.category?.id === cat.id
                    ? "text-[var(--brand)]"
                    : "text-[var(--muted)]",
                )}
              />
              <span className="text-xs font-semibold leading-tight text-[var(--ink)] sm:text-sm">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selection.category && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            2. Pilih Jenis Paket
          </h3>
          <div className="mt-3 space-y-2">
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => selectSubCategory(sub)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left transition-all",
                  selection.subCategory?.id === sub.id
                    ? selectedClass
                    : unselectedClass,
                )}
              >
                <span className="text-sm font-medium text-[var(--ink)]">
                  {sub.name}
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-[var(--muted-3)]",
                    selection.subCategory?.id === sub.id &&
                      "text-[var(--brand)]",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {selection.subCategory && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            3. Pilih Paket {selection.subCategory.name}
          </h3>
          <div className="mt-3 space-y-3">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() =>
                  setSelection({ ...selection, selectedPackage: pkg })
                }
                className={cn(
                  "w-full rounded-2xl border-2 p-4 text-left transition-all",
                  selection.selectedPackage?.id === pkg.id
                    ? cn(selectedClass, "ring-2 ring-[var(--brand)]/20")
                    : unselectedClass,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--ink)]">
                      {pkg.name}
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                      {pkg.duration_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pkg.duration_hours} jam
                        </span>
                      )}
                      {pkg.crew_info && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {pkg.crew_info}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-sans text-sm font-bold text-[var(--ink)]">
                    {formatCurrency(pkg.price)}
                  </span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
                  {pkg.inclusions}
                </p>
                {selection.selectedPackage?.id === pkg.id && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                    <Check className="h-3.5 w-3.5" /> Dipilih
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {selection.selectedPackage && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            4. Add-on Tambahan (Opsional)
          </h3>
          <div className="mt-3 space-y-3">
            {addons.map((addon) => {
              const isSelected = selection.addons.some(
                (a) => a.id === addon.id,
              );
              return (
                <button
                  key={addon.id}
                  onClick={() =>
                    setSelection({
                      ...selection,
                      addons: isSelected
                        ? selection.addons.filter((a) => a.id !== addon.id)
                        : [...selection.addons, addon],
                    })
                  }
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                    isSelected ? selectedClass : unselectedClass,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AddonIcon
                      name={addon.name}
                      className="h-5 w-5 shrink-0 text-[var(--muted)]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {addon.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatCurrency(addon.price)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--muted-4)] bg-white",
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="animate-fade-in flex items-center justify-between rounded-2xl px-5 py-4 glass">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Estimasi Subtotal
        </span>
        <span className="font-sans text-lg font-bold text-[var(--ink)]">
          {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
}