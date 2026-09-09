import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';


const DEFAULT_PAGE_SIZE = 20;


function getVisiblePages(
  currentPage,
  totalPages,
) {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  let start = Math.max(
    1,
    currentPage - 2,
  );

  let end = Math.min(
    totalPages,
    start + 4,
  );

  if (end - start < 4) {
    start = Math.max(
      1,
      end - 4,
    );
  }

  return Array.from(
    { length: end - start + 1 },
    (_, index) => start + index,
  );
}


function TablePagination({
  currentPage,
  totalItems,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems / pageSize
    ),
  );

  const safePage = Math.min(
    Math.max(currentPage, 1),
    totalPages,
  );

  const startItem = totalItems === 0
    ? 0
    : ((safePage - 1) * pageSize) + 1;

  const endItem = Math.min(
    safePage * pageSize,
    totalItems,
  );

  const pages = getVisiblePages(
    safePage,
    totalPages,
  );

  function goToPage(page) {
    const nextPage = Math.min(
      Math.max(page, 1),
      totalPages,
    );

    if (nextPage !== safePage) {
      onPageChange(nextPage);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        paddingTop: 18,
      }}
    >
      <div
        className="table-count"
        style={{
          marginLeft: 0,
        }}
      >
        {startItem}–{endItem} / {totalItems}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <button
          className="table-action-button"
          type="button"
          disabled={safePage <= 1}
          onClick={() => goToPage(
            safePage - 1
          )}
          title="Oldingi sahifa"
        >
          <ChevronLeft size={16} />
          Oldingi
        </button>

        {pages.map((page) => (
          <button
            key={page}
            className="table-action-button"
            type="button"
            onClick={() => goToPage(page)}
            aria-current={
              page === safePage
                ? 'page'
                : undefined
            }
            style={
              page === safePage
                ? {
                    minWidth: 38,
                    background:
                      'var(--dash-green-soft, #ecfdf5)',
                    borderColor:
                      'var(--dash-green, #059669)',
                    fontWeight: 800,
                  }
                : {
                    minWidth: 38,
                  }
            }
          >
            {page}
          </button>
        ))}

        <button
          className="table-action-button"
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => goToPage(
            safePage + 1
          )}
          title="Keyingi sahifa"
        >
          Keyingi
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}


export {
  DEFAULT_PAGE_SIZE,
};

export default TablePagination;
