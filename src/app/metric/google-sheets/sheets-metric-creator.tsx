"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface SheetsMetricCreatorProps {
  connectionId: string;
  onSuccess?: () => void;
}

export function SheetsMetricCreator({
  connectionId,
  onSuccess,
}: SheetsMetricCreatorProps) {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [labelColumn, setLabelColumn] = useState<number | null>(null);
  const [dataColumns, setDataColumns] = useState<number[]>([]);
  const [targetValue, setTargetValue] = useState("");
  const [metricName, setMetricName] = useState("");

  // Fetch sheet structure (sheets list and dimensions)
  const { data: sheetStructure, refetch: fetchStructure } =
    api.metricIntegration.getSheetStructure.useQuery(
      {
        connectionId,
        spreadsheetId,
      },
      {
        enabled: false, // Only fetch when button is clicked
      },
    );

  // Fetch sheet preview data
  const { data: previewData, isLoading: isLoadingPreview } =
    api.metricIntegration.getSheetPreview.useQuery(
      {
        connectionId,
        spreadsheetId,
        sheetName: selectedSheet,
        maxRows: 10, // Preview first 10 rows
      },
      {
        enabled: Boolean(spreadsheetId && selectedSheet),
      },
    );

  // Create metric mutation
  const createMutation = api.metric.createFromTemplate.useMutation({
    onSuccess: () => {
      // Reset form
      setSpreadsheetUrl("");
      setSpreadsheetId("");
      setSelectedSheet("");
      setLabelColumn(null);
      setDataColumns([]);
      setTargetValue("");
      setMetricName("");
      onSuccess?.();
    },
  });

  const extractSpreadsheetId = (url: string) => {
    // Extract ID from various Google Sheets URL formats
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = regex.exec(url);
    return match ? match[1] : null;
  };

  const handleUrlChange = (url: string) => {
    setSpreadsheetUrl(url);
    const id = extractSpreadsheetId(url);
    if (id) {
      setSpreadsheetId(id);
    }
  };

  const handleFetchStructure = () => {
    if (!spreadsheetId) return;
    void fetchStructure();
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    setLabelColumn(null);
    setDataColumns([]);
    setMetricName("");
  };

  const handleLabelColumnSelect = (columnIndex: number) => {
    if (labelColumn === columnIndex) {
      setLabelColumn(null);
    } else {
      setLabelColumn(columnIndex);
      // Remove from data columns if it was selected there
      setDataColumns((prev) => prev.filter((i) => i !== columnIndex));
    }
    updateMetricName(columnIndex, dataColumns);
  };

  const handleDataColumnToggle = (columnIndex: number) => {
    if (columnIndex === labelColumn) return; // Can't select label column as data

    setDataColumns((prev) => {
      const newColumns = prev.includes(columnIndex)
        ? prev.filter((i) => i !== columnIndex)
        : [...prev, columnIndex].sort((a, b) => a - b);
      updateMetricName(labelColumn, newColumns);
      return newColumns;
    });
  };

  const updateMetricName = (label: number | null, data: number[]) => {
    if (!previewData?.headers) return;

    if (data.length === 1 && previewData.headers[data[0]!]) {
      setMetricName(`${selectedSheet} - ${previewData.headers[data[0]!]}`);
    } else if (data.length > 1) {
      const names = data
        .slice(0, 2)
        .map((i) => previewData.headers[i])
        .join(", ");
      setMetricName(
        `${selectedSheet} - ${names}${data.length > 2 ? "..." : ""}`,
      );
    }
  };

  const handleCreate = () => {
    if (dataColumns.length === 0 || !spreadsheetId || !selectedSheet) return;

    createMutation.mutate({
      templateId: "gsheets-multi-column-data",
      connectionId,
      name: metricName,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      endpointParams: {
        SPREADSHEET_ID: spreadsheetId,
        SHEET_NAME: selectedSheet,
        LABEL_COLUMN_INDEX: labelColumn?.toString() ?? "",
        DATA_COLUMN_INDICES: dataColumns.join(","),
      },
    });
  };

  const canFetchStructure = Boolean(spreadsheetId);
  const canCreate = Boolean(
    spreadsheetId && selectedSheet && dataColumns.length > 0 && metricName,
  );

  return (
    <div className="space-y-6">
      {/* Step 1: Spreadsheet URL */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Enter Spreadsheet URL</CardTitle>
          <CardDescription>
            Paste the Google Sheets URL to extract the spreadsheet ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-url">Spreadsheet URL</Label>
            <Input
              id="sheet-url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={spreadsheetUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          {spreadsheetId && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium">Extracted Spreadsheet ID:</p>
              <p className="font-mono text-xs break-all">{spreadsheetId}</p>
            </div>
          )}

          <Button
            onClick={handleFetchStructure}
            disabled={!canFetchStructure}
            className="w-full"
          >
            Fetch Sheets
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Select Sheet */}
      {sheetStructure && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Sheet</CardTitle>
            <CardDescription>
              Choose which sheet contains your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-name">Sheet</Label>
              <Select value={selectedSheet} onValueChange={handleSheetChange}>
                <SelectTrigger id="sheet-name">
                  <SelectValue placeholder="Select a sheet..." />
                </SelectTrigger>
                <SelectContent>
                  {sheetStructure.sheets.map((sheet) => (
                    <SelectItem key={sheet.title} value={sheet.title}>
                      {sheet.title}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({sheet.rowCount} rows × {sheet.columnCount} cols)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Data Preview and Column Selection */}
      {selectedSheet && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Select Columns</CardTitle>
            <CardDescription>
              {isLoadingPreview
                ? "Loading data preview..."
                : "Select a label column (dates/categories) and one or more data columns"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewData && (
              <>
                {/* Selection Instructions */}
                <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
                  <p>
                    <strong>Label Column</strong> (optional): Click header once
                    to set as X-axis (dates, categories)
                  </p>
                  <p>
                    <strong>Data Columns</strong> (required): Double-click
                    headers to select data series
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Row</TableHead>
                        {(previewData.headers ?? []).map((header, index) => {
                          const isLabel = labelColumn === index;
                          const isData = dataColumns.includes(index);
                          return (
                            <TableHead
                              key={index}
                              className={`cursor-pointer transition-colors ${
                                isLabel
                                  ? "bg-blue-500 text-white"
                                  : isData
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                              }`}
                              onClick={() => handleLabelColumnSelect(index)}
                              onDoubleClick={() =>
                                handleDataColumnToggle(index)
                              }
                            >
                              <div className="flex flex-col gap-1">
                                <span>{header}</span>
                                <div className="flex gap-1">
                                  {isLabel && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-200 text-xs text-blue-800"
                                    >
                                      Label
                                    </Badge>
                                  )}
                                  {isData && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Data
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {rowIndex + 2}
                          </TableCell>
                          {row.map((cell, cellIndex) => (
                            <TableCell
                              key={cellIndex}
                              className={
                                labelColumn === cellIndex
                                  ? "bg-blue-500/10"
                                  : dataColumns.includes(cellIndex)
                                    ? "bg-primary/10"
                                    : ""
                              }
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-muted-foreground text-sm">
                  Showing {previewData.rows.length} of {previewData.totalRows}{" "}
                  data rows. All rows will be tracked for visualization.
                </div>

                {/* Selection Summary */}
                <div className="space-y-2">
                  {labelColumn !== null && (
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Label Column: {previewData.headers?.[labelColumn]}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Will be used as X-axis for charts (dates, categories)
                      </p>
                    </div>
                  )}
                  {dataColumns.length > 0 && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm font-medium">
                        Data Columns ({dataColumns.length}):{" "}
                        {dataColumns
                          .map((i) => previewData.headers?.[i])
                          .join(", ")}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        All {previewData.totalRows} rows will be stored for
                        plotting
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Metric Configuration */}
      {dataColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Configure Metric</CardTitle>
            <CardDescription>
              Set a name and optional target value for your metric
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name *</Label>
              <Input
                id="metric-name"
                placeholder="e.g., Monthly Revenue"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Value (Optional)</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                placeholder="e.g., 100000"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!canCreate || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Creating..." : "Create Metric"}
            </Button>

            {createMutation.isError && (
              <p className="text-sm text-red-600">
                {createMutation.error.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
