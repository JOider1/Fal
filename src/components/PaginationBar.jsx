import './PaginationBar.css'

export function PaginationBar({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(total, safePage * pageSize)

  return (
    <footer className="pagination-bar">
      <div className="pagination-bar__info" role="status">
        Показано {from}–{to} з {total} товарів за поточним фільтром.
      </div>
      <div className="pagination-bar__controls">
        <button
          type="button"
          className="btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Назад
        </button>
        <span className="pagination-bar__page">
          Сторінка {safePage} з {totalPages}
        </span>
        <button
          type="button"
          className="btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Далі
        </button>
      </div>
    </footer>
  )
}
