"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type SelectionRange,
  columnToLetter,
  parseA1Notation,
  selectionToA1Notation,
} from "@/lib/integrations/google-sheets-utils";
import { api } from "@/trpc/react";

interface GSheetsRangeEditorProps {
  connectionId: string;
  spreadsheetId: string;
  sheetName: string;
  currentRange: string;
  onSave: (newDataRange: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function GSheetsRangeEditor({
  connectionId,
  spreadsheetId,
  sheetName,
  currentRange,
  onSave,
  onCancel,
  isSaving,
}: GSheetsRangeEditorProps) {
  // Selection state
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Row/Column checkbox selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [goToRowInput, setGoToRowInput] = useState("");

  // Fetch sheet data
  const { data: sheetData, isLoading } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "google-sheet",
        endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
        method: "GET",
      },
      {
        enabled: !!connectionId && !!spreadsheetId && !!sheetName,
        staleTime: 5 * 60 * 1000,
      },
    );

  const fullData = useMemo(() => {
    if (!sheetData?.data) return [];
    const response = sheetData.data as { values?: string[][] };
    return response.values ?? [];
  }, [sheetData]);

  // Pagination derived values
  const totalRows = fullData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageStartRowIndex = (currentPage - 1) * pageSize;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return fullData.slice(start, start + pageSize);
  }, [fullData, currentPage, pageSize]);

  // Get max columns
  const maxCols =
    fullData.length > 0 ? Math.max(...fullData.map((row) => row.length)) : 0;

  // Initialize selection from current range
  useEffect(() => {
    if (currentRange && fullData.length > 0) {
      const parsed = parseA1Notation(currentRange);
      if (parsed) {
        setSelection({
          startRow: parsed.startRow,
          startCol: parsed.startCol,
          endRow: parsed.endRow,
          endCol: parsed.endCol,
        });
        // Navigate to the start of the selection
        const targetPage = Math.ceil((parsed.startRow + 1) / pageSize);
        setCurrentPage(targetPage);
      }
    }
  }, [currentRange, fullData.length]);

  // Calculate the data range from selection
  const dataRange = useMemo((): string => {
    if (!sheetName) return "";

    // Drag selection (only when no checkbox selections)
    if (selection && selectedRows.size === 0 && selectedCols.size === 0) {
      return selectionToA1Notation(
        sheetName,
        selection.startRow,
        selection.startCol,
        selection.endRow,
        selection.endCol,
      );
    }

    // Checkbox selection
    if (selectedRows.size > 0 || selectedCols.size > 0) {
      const rowIndices =
        selectedRows.size > 0
          ? Array.from(selectedRows)
          : Array.from({ length: fullData.length }, (_, i) => i);
      const colIndices =
        selectedCols.size > 0
          ? Array.from(selectedCols)
          : Array.from({ length: maxCols }, (_, i) => i);

      const minRow = Math.min(...rowIndices);
      const maxRow = Math.max(...rowIndices);
      const minCol = Math.min(...colIndices);
      const maxCol = Math.max(...colIndices);

      return selectionToA1Notation(sheetName, minRow, minCol, maxRow, maxCol);
    }

    // Default to entire sheet
    if (fullData.length > 0) {
      return selectionToA1Notation(
        sheetName,
        0,
        0,
        fullData.length - 1,
        maxCols - 1,
      );
    }

    return sheetName;
  }, [sheetName, selection, selectedRows, selectedCols, fullData, maxCols]);

  // Selection handlers
  const handleCellMouseDown = useCallback(
    (rowIndex: number, colIndex: number) => {
      setSelectedRows(new Set());
      setSelectedCols(new Set());
      setIsSelecting(true);
      setSelectionStart({ row: rowIndex, col: colIndex });
      setSelection({
        startRow: rowIndex,
        startCol: colIndex,
        endRow: rowIndex,
        endCol: colIndex,
      });
    },
    [],
  );

  const handleCellMouseEnter = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!isSelecting || !selectionStart) return;
      setSelection({
        startRow: Math.min(selectionStart.row, rowIndex),
        startCol: Math.min(selectionStart.col, colIndex),
        endRow: Math.max(selectionStart.row, rowIndex),
        endCol: Math.max(selectionStart.col, colIndex),
      });
    },
    [isSelecting, selectionStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const isCellSelected = useCallback(
    (rowIndex: number, colIndex: number): boolean => {
      if (selection && selectedRows.size === 0 && selectedCols.size === 0) {
        return (
          rowIndex >= selection.startRow &&
          rowIndex <= selection.endRow &&
          colIndex >= selection.startCol &&
          colIndex <= selection.endCol
        );
      }
      if (selectedRows.size > 0 || selectedCols.size > 0) {
        const rowMatch = selectedRows.size === 0 || selectedRows.has(rowIndex);
        const colMatch = selectedCols.size === 0 || selectedCols.has(colIndex);
        return rowMatch && colMatch;
      }
      return false;
    },
    [selection, selectedRows, selectedCols],
  );

  const clearSelection = () => {
    setSelection(null);
    setSelectedRows(new Set());
    setSelectedCols(new Set());
  };

  // Row checkbox handler (contiguous)
  const handleRowCheckbox = useCallback(
    (rowIndex: number, checked: boolean) => {
      setSelectedRows((prev) => {
        if (prev.size === 0 && !checked) return prev;
        const next = new Set<number>();
        if (checked) {
          const all = [...Array.from(prev), rowIndex];
          const min = Math.min(...all);
          const max = Math.max(...all);
          for (let i = min; i <= max; i++) next.add(i);
        } else {
          if (prev.size <= 1) return next;
          const indices = Array.from(prev);
          const min = Math.min(...indices);
          const max = Math.max(...indices);
          if (rowIndex === min) {
            for (let i = min + 1; i <= max; i++) next.add(i);
          } else if (rowIndex === max) {
            for (let i = min; i <= max - 1; i++) next.add(i);
          } else {
            const leftSize = rowIndex - min;
            const rightSize = max - rowIndex;
            if (leftSize >= rightSize) {
              for (let i = min; i < rowIndex; i++) next.add(i);
            } else {
              for (let i = rowIndex + 1; i <= max; i++) next.add(i);
            }
          }
        }
        return next;
      });
      setSelection(null);
    },
    [],
  );

  // Column checkbox handler (contiguous)
  const handleColumnCheckbox = useCallback(
    (colIndex: number, checked: boolean) => {
      setSelectedCols((prev) => {
        if (prev.size === 0 && !checked) return prev;
        const next = new Set<number>();
        if (checked) {
          const all = [...Array.from(prev), colIndex];
          const min = Math.min(...all);
          const max = Math.max(...all);
          for (let i = min; i <= max; i++) next.add(i);
        } else {
          if (prev.size <= 1) return next;
          const indices = Array.from(prev);
          const min = Math.min(...indices);
          const max = Math.max(...indices);
          if (colIndex === min) {
            for (let i = min + 1; i <= max; i++) next.add(i);
          } else if (colIndex === max) {
            for (let i = min; i <= max - 1; i++) next.add(i);
          } else {
            const leftSize = colIndex - min;
            const rightSize = max - colIndex;
            if (leftSize >= rightSize) {
              for (let i = min; i < colIndex; i++) next.add(i);
            } else {
              for (let i = colIndex + 1; i <= max; i++) next.add(i);
            }
          }
        }
        return next;
      });
      setSelection(null);
    },
    [],
  );

  // Go to row handler
  const handleGoToRow = useCallback(() => {
    const rowNum = parseInt(goToRowInput, 10);
    if (isNaN(rowNum) || rowNum < 1 || rowNum > totalRows) {
      return;
    }
    const targetPage = Math.ceil(rowNum / pageSize);
    setCurrentPage(targetPage);
    setGoToRowInput("");
  }, [goToRowInput, totalRows, pageSize]);

  const handleSave = () => {
    if (dataRange) {
      onSave(dataRange);
    }
  };

  const hasSelection =
    selection !== null || selectedRows.size > 0 || selectedCols.size > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-sm font-medium">Edit Data Range</h3>
          <p className="text-muted-foreground text-xs">
            {hasSelection ? dataRange : "Select cells to track"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Save className="mr-1 h-3 w-3" />
            )}
            Save & Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : paginatedData.length > 0 ? (
          <div className="flex h-full flex-col overflow-hidden rounded-md border">
            <ScrollArea className="flex-1">
              <div className="min-w-0 overflow-x-auto p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50 sticky top-0 left-0 z-20 w-16 text-center text-xs">
                        #
                      </TableHead>
                      {Array.from({ length: maxCols }).map((_, colIndex) => (
                        <TableHead
                          key={colIndex}
                          className="bg-muted/50 sticky top-0 z-10 min-w-[80px] text-center text-xs"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={selectedCols.has(colIndex)}
                              onCheckedChange={(checked) =>
                                handleColumnCheckbox(colIndex, checked === true)
                              }
                              aria-label={`Select column ${columnToLetter(colIndex)}`}
                              className="h-3.5 w-3.5"
                            />
                            <span>{columnToLetter(colIndex)}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, localRowIndex) => {
                      const actualRowIndex = pageStartRowIndex + localRowIndex;
                      return (
                        <TableRow key={actualRowIndex}>
                          <TableCell className="text-muted-foreground bg-muted/30 sticky left-0 z-10 text-center text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                checked={selectedRows.has(actualRowIndex)}
                                onCheckedChange={(checked) =>
                                  handleRowCheckbox(
                                    actualRowIndex,
                                    checked === true,
                                  )
                                }
                                aria-label={`Select row ${actualRowIndex + 1}`}
                                className="h-3.5 w-3.5"
                              />
                              <span>{actualRowIndex + 1}</span>
                            </div>
                          </TableCell>
                          {Array.from({ length: maxCols }).map(
                            (_, colIndex) => (
                              <TableCell
                                key={colIndex}
                                className={`cursor-cell p-1 text-xs select-none ${
                                  isCellSelected(actualRowIndex, colIndex)
                                    ? "bg-primary/20 ring-primary/50 ring-1"
                                    : "hover:bg-muted/50"
                                }`}
                                onMouseDown={() =>
                                  handleCellMouseDown(actualRowIndex, colIndex)
                                }
                                onMouseEnter={() =>
                                  handleCellMouseEnter(actualRowIndex, colIndex)
                                }
                              >
                                <div className="max-w-[120px] truncate">
                                  {row[colIndex] ?? ""}
                                </div>
                              </TableCell>
                            ),
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            {/* Pagination controls */}
            <div className="flex items-center justify-between border-t px-3 py-2">
              <span className="text-muted-foreground text-xs">
                Rows {pageStartRowIndex + 1}-
                {Math.min(pageStartRowIndex + pageSize, totalRows)} of{" "}
                {totalRows}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground px-2 text-xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="Row"
                  className="h-7 w-14 text-xs"
                  value={goToRowInput}
                  onChange={(e) => setGoToRowInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGoToRow();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToRow}
                  className="h-7 px-2 text-xs"
                >
                  Go
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">No data available</p>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t px-4 py-2">
        <p className="text-muted-foreground text-xs">
          Click and drag to select cells, or use checkboxes to select entire
          rows/columns.
        </p>
      </div>
    </div>
  );
}
