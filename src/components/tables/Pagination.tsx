type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  startItem?: number;
  endItem?: number;
  label?: string;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  startItem,
  endItem,
  label = "items",
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= 0)) return null;

  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  ).filter((p) => p <= totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/30">
      {totalItems != null && startItem != null && endItem != null ? (
        <span className="text-xs text-gray-500">
          Showing {startItem}–{endItem} of {totalItems} {label}
        </span>
      ) : (
        <span className="text-xs text-gray-500">
          Page {currentPage} of {totalPages}
        </span>
      )}
      {totalPages > 1 && (
        <div className="flex items-center">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="mr-2 flex items-center h-8 justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] text-xs"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {currentPage > 3 && <span className="px-1.5 text-xs text-gray-400">...</span>}
            {pagesAroundCurrent.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`flex w-8 h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  currentPage === page
                    ? "bg-brand-500 text-white"
                    : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                }`}
              >
                {page}
              </button>
            ))}
            {currentPage < totalPages - 2 && <span className="px-1.5 text-xs text-gray-400">...</span>}
          </div>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-2 flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 shadow-theme-xs text-xs hover:bg-gray-50 h-8 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
