import './AppliedFiltersSummary.css'

function Chip({ children, onRemove }) {
  return (
    <span className="summary-chip">
      {children}
      {onRemove ? (
        <button
          type="button"
          className="summary-chip__x"
          aria-label="Прибрати фільтр"
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </span>
  )
}

export function AppliedFiltersSummary({
  brands,
  colors,
  sizes,
  seasons,
  clothingTypes,
  brandIds,
  colorIds,
  sizeIds,
  seasonIds,
  clothingTypeIds,
  minPrice,
  maxPrice,
  search,
  onRemoveBrand,
  onRemoveColor,
  onRemoveSize,
  onRemoveSeason,
  onRemoveType,
  onClearPrice,
  onClearSearch,
}) {
  const nameById = (list, id, key = 'name') =>
    list.find((x) => x.id === id)?.[key] ?? `#${id}`

  const has =
    brandIds.length ||
    colorIds.length ||
    sizeIds.length ||
    seasonIds.length ||
    clothingTypeIds.length ||
    minPrice !== '' ||
    maxPrice !== '' ||
    search.trim()

  if (!has) {
    return (
      <div className="applied-filters applied-filters--empty">
        Фільтри не застосовані — показано весь каталог за пагінацією.
      </div>
    )
  }

  return (
    <div className="applied-filters" aria-label="Застосовані фільтри">
      <div className="applied-filters__label">Активні умови:</div>
      <div className="applied-filters__row">
        {search.trim() ? (
          <Chip onRemove={onClearSearch}>Пошук: «{search.trim()}»</Chip>
        ) : null}
        {minPrice !== '' || maxPrice !== '' ? (
          <Chip onRemove={onClearPrice}>
            Ціна: {minPrice !== '' ? `${minPrice} ₴` : '…'} —{' '}
            {maxPrice !== '' ? `${maxPrice} ₴` : '…'}
          </Chip>
        ) : null}
        {brandIds.map((id) => (
          <Chip key={`b-${id}`} onRemove={() => onRemoveBrand(id)}>
            Бренд: {nameById(brands, id)}
          </Chip>
        ))}
        {colorIds.map((id) => (
          <Chip key={`c-${id}`} onRemove={() => onRemoveColor(id)}>
            Колір: {nameById(colors, id)}
          </Chip>
        ))}
        {sizeIds.map((id) => (
          <Chip key={`s-${id}`} onRemove={() => onRemoveSize(id)}>
            Розмір: {nameById(sizes, id, 'code')}
          </Chip>
        ))}
        {seasonIds.map((id) => (
          <Chip key={`se-${id}`} onRemove={() => onRemoveSeason(id)}>
            Сезон: {nameById(seasons, id)}
          </Chip>
        ))}
        {clothingTypeIds.map((id) => (
          <Chip key={`t-${id}`} onRemove={() => onRemoveType(id)}>
            Тип: {nameById(clothingTypes, id)}
          </Chip>
        ))}
      </div>
    </div>
  )
}
