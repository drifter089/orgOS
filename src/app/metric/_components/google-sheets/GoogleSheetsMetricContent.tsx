"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  selectionToA1Notation,
} from "@/lib/integrations/google-sheets-utils";
import { api } from "@/trpc/react";

import type { ContentProps } from "../base/MetricDialogBase";

function extractSpreadsheetId(url: string): string | null {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = regex.exec(url);
  return match?.[1] ?? null;
}

const TEMPLATE_ID = "gsheets-data";

export function GoogleSheetsMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");

  // Selection state for click-and-drag
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const [metricName, setMetricName] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [goToRowInput, setGoToRowInput] = useState("");

  // Row/Column checkbox selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());

  // Fetch spreadsheet metadata
  const { data: metadataData, isLoading: isLoadingMetadata } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "google-sheet",
        endpoint: `/v4/spreadsheets/${spreadsheetId}`,
        method: "GET",
      },
      {
        enabled: !!connection && !!spreadsheetId,
        staleTime: 5 * 60 * 1000,
      },
    );

  // Fetch sheet data for preview
  const { data: sheetData, isLoading: isLoadingSheetData } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "google-sheet",
        endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${selectedSheet}`,
        method: "GET",
      },
      {
        enabled: !!connection && !!spreadsheetId && !!selectedSheet,
        staleTime: 5 * 60 * 1000,
      },
    );

  const sheets = useMemo(() => {
    if (!metadataData?.data) return [];
    const response = metadataData.data as {
      sheets?: Array<{ properties: { title: string } }>;
    };
    return response.sheets?.map((s) => ({ title: s.properties.title })) ?? [];
  }, [metadataData]);

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

  // Calculate the data range - use selection (drag or checkbox) or entire sheet
  const dataRange = useMemo((): string => {
    if (!selectedSheet) return "";

    // Drag selection (only when no checkbox selections)
    if (selection && selectedRows.size === 0 && selectedCols.size === 0) {
      return selectionToA1Notation(
        selectedSheet,
        selection.startRow,
        selection.startCol,
        selection.endRow,
        selection.endCol,
      );
    }

    // Checkbox selection
    if (selectedRows.size > 0 || selectedCols.size > 0) {
      const maxColsInData =
        fullData.length > 0
          ? Math.max(...fullData.map((row) => row.length))
          : 0;

      const rowIndices =
        selectedRows.size > 0
          ? Array.from(selectedRows)
          : Array.from({ length: fullData.length }, (_, i) => i);
      const colIndices =
        selectedCols.size > 0
          ? Array.from(selectedCols)
          : Array.from({ length: maxColsInData }, (_, i) => i);

      const minRow = Math.min(...rowIndices);
      const maxRow = Math.max(...rowIndices);
      const minCol = Math.min(...colIndices);
      const maxCol = Math.max(...colIndices);

      return selectionToA1Notation(
        selectedSheet,
        minRow,
        minCol,
        maxRow,
        maxCol,
      );
    }

    // Default to entire sheet if no selection
    if (fullData.length > 0) {
      const maxCols = Math.max(...fullData.map((row) => row.length));
      return selectionToA1Notation(
        selectedSheet,
        0,
        0,
        fullData.length - 1,
        maxCols - 1,
      );
    }

    return selectedSheet;
  }, [selectedSheet, selection, selectedRows, selectedCols, fullData]);

  const endpointParams = useMemo((): Record<string, string> => {
    if (!spreadsheetId || !selectedSheet || !dataRange) return {};
    return {
      SPREADSHEET_ID: spreadsheetId,
      SHEET_NAME: selectedSheet,
      DATA_RANGE: dataRange,
    };
  }, [spreadsheetId, selectedSheet, dataRange]);

  // Move to step 2 when metadata is loaded
  useEffect(() => {
    if (sheets.length > 0 && step === 1 && spreadsheetId) {
      setStep(2);
    }
  }, [sheets, step, spreadsheetId]);

  const handleStep1Next = () => {
    const id = extractSpreadsheetId(spreadsheetUrl);
    if (!id || !connection) return;
    setSpreadsheetId(id);
  };

  const handleStep2Next = () => {
    if (!selectedSheet || !connection || !spreadsheetId) return;
    setStep(3);
  };

  const handleCreateMetric = () => {
    if (!connection || !metricName) return;

    void onSubmit({
      templateId: TEMPLATE_ID,
      connectionId: connection.connectionId,
      name: metricName,
      description: `Data from ${selectedSheet} in Google Sheets`,
      endpointParams,
    });
  };

  // Selection handlers
  const handleCellMouseDown = useCallback(
    (rowIndex: number, colIndex: number) => {
      // Clear checkbox selections when starting a drag
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

  // Add mouseup listener to document
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const isCellSelected = useCallback(
    (rowIndex: number, colIndex: number): boolean => {
      // Drag selection mode (only when no checkbox selections)
      if (selection && selectedRows.size === 0 && selectedCols.size === 0) {
        return (
          rowIndex >= selection.startRow &&
          rowIndex <= selection.endRow &&
          colIndex >= selection.startCol &&
          colIndex <= selection.endCol
        );
      }

      // Checkbox selection mode
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

  // Row checkbox handler (enforces contiguous selection)
  const handleRowCheckbox = useCallback(
    (rowIndex: number, checked: boolean) => {
      setSelectedRows((prev) => {
        if (prev.size === 0 && !checked) return prev;

        const next = new Set<number>();
        if (checked) {
          // Fill contiguous range from min to max
          const all = [...Array.from(prev), rowIndex];
          const min = Math.min(...all);
          const max = Math.max(...all);
          for (let i = min; i <= max; i++) next.add(i);
        } else {
          // Maintain contiguity on uncheck by keeping the larger segment
          if (prev.size <= 1) return next; // Empty after removal

          const indices = Array.from(prev);
          const min = Math.min(...indices);
          const max = Math.max(...indices);

          if (rowIndex === min) {
            // Removing at start - keep (min+1)..max
            for (let i = min + 1; i <= max; i++) next.add(i);
          } else if (rowIndex === max) {
            // Removing at end - keep min..(max-1)
            for (let i = min; i <= max - 1; i++) next.add(i);
          } else {
            // Removing in middle - keep larger segment
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

  // Column checkbox handler (enforces contiguous selection)
  const handleColumnCheckbox = useCallback(
    (colIndex: number, checked: boolean) => {
      setSelectedCols((prev) => {
        if (prev.size === 0 && !checked) return prev;

        const next = new Set<number>();
        if (checked) {
          // Fill contiguous range from min to max
          const all = [...Array.from(prev), colIndex];
          const min = Math.min(...all);
          const max = Math.max(...all);
          for (let i = min; i <= max; i++) next.add(i);
        } else {
          // Maintain contiguity on uncheck by keeping the larger segment
          if (prev.size <= 1) return next; // Empty after removal

          const indices = Array.from(prev);
          const min = Math.min(...indices);
          const max = Math.max(...indices);

          if (colIndex === min) {
            // Removing at start - keep (min+1)..max
            for (let i = min + 1; i <= max; i++) next.add(i);
          } else if (colIndex === max) {
            // Removing at end - keep min..(max-1)
            for (let i = min; i <= max - 1; i++) next.add(i);
          } else {
            // Removing in middle - keep larger segment
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

  const isStep1Valid = spreadsheetUrl.trim() !== "";
  const isStep2Valid = selectedSheet !== "";
  const isStep3Valid = metricName.trim() !== "";

  // Get max columns for header (use fullData for accurate column count)
  const maxCols =
    fullData.length > 0 ? Math.max(...fullData.map((row) => row.length)) : 0;

  return (
    <>
      <div className="space-y-4 py-4">
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="spreadsheet-url">Google Sheets Link</Label>
            <Input
              id="spreadsheet-url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Paste the full URL from your Google Sheets document
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-select">Select Sheet</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger id="sheet-select">
                  <SelectValue placeholder="Choose a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((sheet, index) => (
                    <SelectItem
                      key={`${sheet.title}-${index}`}
                      value={sheet.title}
                    >
                      {sheet.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSheet && (
              <div className="text-muted-foreground rounded-md border p-3 text-sm">
                <p className="mb-1 font-medium">Selected:</p>
                <p>{selectedSheet}</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name</Label>
              <Input
                id="metric-name"
                placeholder="e.g., Sales Data"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Data Range</Label>
                <div className="flex items-center gap-2">
                  {(selection ||
                    selectedRows.size > 0 ||
                    selectedCols.size > 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="h-6 px-2 text-xs"
                    >
                      Clear Selection
                    </Button>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {selection || selectedRows.size > 0 || selectedCols.size > 0
                      ? dataRange
                      : "Using entire sheet"}
                  </span>
                </div>
              </div>

              {isLoadingSheetData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : paginatedData.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <ScrollArea className="h-[350px]">
                    <div className="min-w-0 overflow-x-auto p-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="bg-muted/50 sticky top-0 left-0 z-20 w-16 text-center text-xs">
                              #
                            </TableHead>
                            {Array.from({ length: maxCols }).map(
                              (_, colIndex) => (
                                <TableHead
                                  key={colIndex}
                                  className="bg-muted/50 sticky top-0 z-10 min-w-[80px] text-center text-xs"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <Checkbox
                                      checked={selectedCols.has(colIndex)}
                                      onCheckedChange={(checked) =>
                                        handleColumnCheckbox(
                                          colIndex,
                                          checked === true,
                                        )
                                      }
                                      aria-label={`Select column ${columnToLetter(colIndex)}`}
                                      className="h-3.5 w-3.5"
                                    />
                                    <span>{columnToLetter(colIndex)}</span>
                                  </div>
                                </TableHead>
                              ),
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((row, localRowIndex) => {
                            const actualRowIndex =
                              pageStartRowIndex + localRowIndex;
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
                                        handleCellMouseDown(
                                          actualRowIndex,
                                          colIndex,
                                        )
                                      }
                                      onMouseEnter={() =>
                                        handleCellMouseEnter(
                                          actualRowIndex,
                                          colIndex,
                                        )
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
                      Showing {pageStartRowIndex + 1}-
                      {Math.min(pageStartRowIndex + pageSize, totalRows)} of{" "}
                      {totalRows} rows
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-muted-foreground px-2 text-xs">
                        Page {currentPage} of {totalPages}
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
                        placeholder="Row #"
                        className="h-7 w-16 text-xs"
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
                <p className="text-muted-foreground text-sm">
                  No data available
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Click and drag to select cells, or use checkboxes to select
                entire rows/columns. Leave unselected to use entire sheet.
              </p>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as 1 | 2)}
          >
            Back
          </Button>
        )}

        {step === 1 && (
          <Button
            onClick={handleStep1Next}
            disabled={!isStep1Valid || isLoadingMetadata}
          >
            {isLoadingMetadata ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Next"
            )}
          </Button>
        )}

        {step === 2 && (
          <Button onClick={handleStep2Next} disabled={!isStep2Valid}>
            Next
          </Button>
        )}

        {step === 3 && (
          <Button
            onClick={handleCreateMetric}
            disabled={!isStep3Valid || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Metric"
            )}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
