import { digitsOnly } from '../services/filterSettingsStorage'
import './FilterPanel.css'

function MultiGroup({ label, options, selectedIds, onChange, getLabel, getValue }) {
  const toggle = (id) => {
    const v = Number(id)
    if (!Number.isFinite(v)) return
    const set = new Set(selectedIds)
    if (set.has(v)) set.delete(v)
    else set.add(v)
    onChange([...set])
  }

  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className="filter-group__chips">
        {options.map((opt) => {
          const id = getValue(opt)
          const on = selectedIds.includes(id)
          return (
            <button
              key={id}
              type="button"
              className={on ? 'chip chip--on' : 'chip'}
              aria-pressed={on}
              onClick={() => toggle(id)}
            >
              {getLabel(opt)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function FilterPanel({
  lookups,
  brandIds,
  colorIds,
  sizeIds,
  seasonIds,
  clothingTypeIds,
  minPrice,
  maxPrice,
  search,
  onBrandIds,
  onColorIds,
  onSizeIds,
  onSeasonIds,
  onClothingTypeIds,
  onMinPrice,
  onMaxPrice,
  onSearch,
  onReset,
}) {
  const { brands, colors, sizes, seasons, clothingTypes } = lookups

  return (
    <aside className="filter-panel" aria-label="Фільтри каталогу">
      <div className="filter-panel__head">
        <h2 className="filter-panel__title">Фільтри</h2>
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          Скинути
        </button>
      </div>

      <label className="filter-field">
        <span className="filter-field__label">Пошук за назвою</span>
        <input
          className="input"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Наприклад: джинси"
          autoComplete="off"
        />
      </label>

      <div className="filter-row">
        <label className="filter-field">
          <span className="filter-field__label">Ціна від (₴)</span>
          <input
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minPrice}
            onChange={(e) => onMinPrice(digitsOnly(e.target.value))}
            placeholder="0"
          />
        </label>
        <label className="filter-field">
          <span className="filter-field__label">Ціна до (₴)</span>
          <input
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxPrice}
            onChange={(e) => onMaxPrice(digitsOnly(e.target.value))}
            placeholder="999999"
          />
        </label>
      </div>

      <MultiGroup
        label="Бренд (кілька значень)"
        options={brands}
        selectedIds={brandIds}
        onChange={onBrandIds}
        getLabel={(b) => b.name}
        getValue={(b) => b.id}
      />
      <MultiGroup
        label="Колір"
        options={colors}
        selectedIds={colorIds}
        onChange={onColorIds}
        getLabel={(c) => c.name}
        getValue={(c) => c.id}
      />
      <MultiGroup
        label="Розмір"
        options={sizes}
        selectedIds={sizeIds}
        onChange={onSizeIds}
        getLabel={(s) => s.code}
        getValue={(s) => s.id}
      />
      <MultiGroup
        label="Сезон"
        options={seasons}
        selectedIds={seasonIds}
        onChange={onSeasonIds}
        getLabel={(s) => s.name}
        getValue={(s) => s.id}
      />
      <MultiGroup
        label="Тип одягу"
        options={clothingTypes}
        selectedIds={clothingTypeIds}
        onChange={onClothingTypeIds}
        getLabel={(t) => t.name}
        getValue={(t) => t.id}
      />
    </aside>
  )
}
