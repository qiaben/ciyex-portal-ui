import { useState, useMemo } from "react";

const DEFAULT_PAGE_SIZE = 10;

export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    // Reset to page 1 if items change and current page is out of bounds
    const safePage = currentPage > totalPages ? 1 : currentPage;

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, safePage, pageSize]);

    const onPageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return {
        currentPage: safePage,
        totalPages,
        paginatedItems,
        onPageChange,
        totalItems: items.length,
        startItem: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
        endItem: Math.min(safePage * pageSize, items.length),
    };
}
