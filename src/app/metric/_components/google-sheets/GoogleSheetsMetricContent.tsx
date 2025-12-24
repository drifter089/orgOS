"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { api } from "@/trpc/react";

import type { ContentProps } from "../base/MetricDialogBase";

function extractSpreadsheetId(url: string): string | null {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = regex.exec(url);
  return match?.[1] ?? null;
}

// Convert column index to letter (0 -> A, 1 -> B, etc.)
function columnToLetter(col: number): string {
  let letter = "";
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Convert selection to A1 notation
function selectionToA1Notation(
  sheetName: string,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  const startColLetter = columnToLetter(startCol);
  const endColLetter = columnToLetter(endCol);
  // Rows are 1-indexed in A1 notation
  return `${sheetName}!${startColLetter}${startRow + 1}:${endColLetter}${endRow + 1}`;
}

const TEMPLATE_ID = "gsheets-data";

interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

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

  const previewData = useMemo(() => {
    if (!sheetData?.data) return [];
    const response = sheetData.data as { values?: string[][] };
    // Show more rows for better preview (up to 20)
    return response.values?.slice(0, 20) ?? [];
  }, [sheetData]);

  const fullData = useMemo(() => {
    if (!sheetData?.data) return [];
    const response = sheetData.data as { values?: string[][] };
    return response.values ?? [];
  }, [sheetData]);

  // Calculate the data range - use selection or entire sheet
  const dataRange = useMemo((): string => {
    if (!selectedSheet) return "";

    if (selection) {
      return selectionToA1Notation(
        selectedSheet,
        selection.startRow,
        selection.startCol,
        selection.endRow,
        selection.endCol,
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
  }, [selectedSheet, selection, fullData]);

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
      if (!selection) return false;
      return (
        rowIndex >= selection.startRow &&
        rowIndex <= selection.endRow &&
        colIndex >= selection.startCol &&
        colIndex <= selection.endCol
      );
    },
    [selection],
  );

  const clearSelection = () => {
    setSelection(null);
  };

  const isStep1Valid = spreadsheetUrl.trim() !== "";
  const isStep2Valid = selectedSheet !== "";
  const isStep3Valid = metricName.trim() !== "";

  // Get max columns for header
  const maxCols =
    previewData.length > 0
      ? Math.max(...previewData.map((row) => row.length))
      : 0;

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
                <Label>Select Data Range (click and drag)</Label>
                <div className="flex items-center gap-2">
                  {selection && (
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
                    {selection ? dataRange : "Using entire sheet"}
                  </span>
                </div>
              </div>

              {isLoadingSheetData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : previewData.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <ScrollArea className="h-[350px]">
                    <div className="min-w-0 overflow-x-auto p-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="bg-muted/50 sticky top-0 z-10 w-10 text-center text-xs">
                              #
                            </TableHead>
                            {Array.from({ length: maxCols }).map((_, index) => (
                              <TableHead
                                key={index}
                                className="bg-muted/50 sticky top-0 z-10 min-w-[80px] text-center text-xs"
                              >
                                {columnToLetter(index)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell className="text-muted-foreground bg-muted/30 text-center text-xs font-medium">
                                {rowIndex + 1}
                              </TableCell>
                              {Array.from({ length: maxCols }).map(
                                (_, colIndex) => (
                                  <TableCell
                                    key={colIndex}
                                    className={`cursor-cell p-1 text-xs select-none ${
                                      isCellSelected(rowIndex, colIndex)
                                        ? "bg-primary/20 ring-primary/50 ring-1"
                                        : "hover:bg-muted/50"
                                    }`}
                                    onMouseDown={() =>
                                      handleCellMouseDown(rowIndex, colIndex)
                                    }
                                    onMouseEnter={() =>
                                      handleCellMouseEnter(rowIndex, colIndex)
                                    }
                                  >
                                    <div className="max-w-[120px] truncate">
                                      {row[colIndex] ?? ""}
                                    </div>
                                  </TableCell>
                                ),
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No data available
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Click and drag to select a data range, or leave unselected to
                use entire sheet. AI will automatically detect headers and data
                structure.
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
