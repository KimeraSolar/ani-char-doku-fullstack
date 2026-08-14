import { useState } from "react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onGoToPage: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onGoToPage }: PaginationProps) {
    const [goToPage, setGoToPage] = useState<number | "">(currentPage);

    const firstItemNumber = (currentPage - 1) * itemsPerPage + 1;
    const lastItemNumber = Math.min(currentPage * itemsPerPage, totalItems);
    const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);
    const first5Pages = totalPages <= 5 ? pagesArray.slice(0, totalPages) : pagesArray.slice(0, 5);
    let last5Pages = null;

    if (totalPages > 5) {
        const remainingPages = totalPages - 5;
        last5Pages = remainingPages <= 5 ? pagesArray.slice(totalPages - remainingPages, totalPages) : pagesArray.slice(totalPages - 5, totalPages);
    }

    function validateGoToPageValue(value: string) {
        if (value.trim() === "") return setGoToPage("");
        if (/^\d+$/.test(value)) return changeGoToPage(Number(value));
    }

    function changeGoToPage(value: number) {
        if (value < 1) return setGoToPage(1);
        if (value > totalPages) return setGoToPage(totalPages);
        return setGoToPage(value);
    }

    function handleGoToPage() {
        if (goToPage === "") return setGoToPage(currentPage);
        onGoToPage(goToPage);
    }

    function handlePreviousPage() {
        if (currentPage === 1) return;
        onGoToPage(currentPage - 1);
    }

    function handleNextPage() {
        if (currentPage === totalPages) return;
        onGoToPage(currentPage + 1);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900 pt-6 mt-8">
            <div className="text-xs text-slate-500 font-semibold">
                Showing <span className="text-slate-350">{firstItemNumber}</span> to{" "}
                <span className="text-slate-350">
                    {lastItemNumber}
                </span>{" "}
                of <span className="text-indigo-400">{totalItems}</span> item(s)
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-805 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                    Previous
                </button>

                {/* First 1 to 5 pages button */}
                {first5Pages.map((page) => {
                    return <PageButton key={`page-${page}`} pageNumber={page} isCurrent={page === currentPage} onClick={() => onGoToPage(page)} />;
                })}

                {/* Single 6th page button */}
                {totalPages === 11 && (
                    <PageButton key={'page-6'} pageNumber={6} isCurrent={currentPage === 6} onClick={() => onGoToPage(6)} />
                )}

                {/* Custom page input for more than 11 pages */}
                {totalPages > 11 && (
                    <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-805 rounded-xl px-2.5 py-1 h-8">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">Go to:</span>
                        <input
                            type="number"
                            min={1}
                            step={1}
                            value={goToPage}
                            onChange={(e) => { validateGoToPageValue(e.target.value) }}
                            onBlur={handleGoToPage}
                            onKeyDown={(e) => { e.code === 'Enter' ? handleGoToPage() : null }}
                            className="w-10 text-center text-xs font-black bg-transparent text-indigo-400 focus:outline-hidden focus:ring-0 p-0 border-b border-indigo-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">/ {totalPages}</span>
                    </div>
                )}

                {/* Last up to 5 pages button */}
                {last5Pages && last5Pages.map((page) => {
                    return <PageButton key={`page-${page}`} pageNumber={page} isCurrent={page === currentPage} onClick={() => onGoToPage(page)} />;
                })}

                <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-slate-805 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

interface PageButtonProps {
    pageNumber: number;
    isCurrent: boolean;
    onClick: (page: number) => void;
}

function PageButton({ pageNumber, isCurrent, onClick }: PageButtonProps) {
    return (
        <button
            onClick={() => { onClick(pageNumber) }}
            className={`h-8 w-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center border ${isCurrent
                ? "bg-indigo-650 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "border-slate-805 bg-slate-900/20 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
        >
            {pageNumber}
        </button>
    );
}