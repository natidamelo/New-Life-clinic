import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  showPagesCount?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  showFirstLast = true,
  showPagesCount = true
}) => {
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: Array<number | string> = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number' && page !== currentPage) {
      onPageChange(page);
    }
  };

  const renderPageButton = (page: number | string, index: number) => {
    const isCurrentPage = page === currentPage;
    const isDisabled = typeof page === 'string';

    return (
      <button
        key={`${page}-${index}`}
        onClick={() => handlePageClick(page)}
        disabled={isDisabled}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
          isCurrentPage
            ? 'z-10 bg-primary text-primary-foreground focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
            : isDisabled
            ? 'text-muted-foreground cursor-default'
            : 'text-muted-foreground ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0'
        }`}
      >
        {page}
      </button>
    );
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {showPagesCount && (
          <div>
            <p className="text-sm text-muted-foreground">
              Showing page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
          </div>
        )}
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            {showFirstLast && (
              <button
                onClick={() => handlePageClick(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground/50 ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">First</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                <ChevronLeftIcon className="h-5 w-5 -ml-2" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={() => handlePageClick(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-muted-foreground/50 ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {getPageNumbers().map((page, index) => renderPageButton(page, index))}
            <button
              onClick={() => handlePageClick(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-muted-foreground/50 ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {showFirstLast && (
              <button
                onClick={() => handlePageClick(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground/50 ring-1 ring-inset ring-gray-300 hover:bg-muted/10 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Last</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                <ChevronRightIcon className="h-5 w-5 -ml-2" aria-hidden="true" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination; 