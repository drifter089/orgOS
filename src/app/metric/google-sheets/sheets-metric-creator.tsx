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
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [metricName, setMetricName] = useState("");

  // Fetch sheet structure (sheets list and dimensions)
  const { data: sheetStructure, refetch: fetchStructure } =
    api.metric.getSheetStructure.useQuery(
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
    api.metric.getSheetPreview.useQuery(
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
      setSelectedColumn(null);
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
    setSelectedColumn(null); // Reset column selection
    setMetricName(""); // Reset metric name
  };

  const handleColumnSelect = (columnIndex: number) => {
    setSelectedColumn(columnIndex);
    // Auto-generate metric name from column header
    if (previewData?.headers?.[columnIndex]) {
      setMetricName(`${selectedSheet} - ${previewData.headers[columnIndex]}`);
    }
  };

  const handleCreate = () => {
    if (selectedColumn === null || !spreadsheetId || !selectedSheet) return;

    createMutation.mutate({
      templateId: "gsheets-column-data",
      connectionId,
      name: metricName,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      endpointParams: {
        SPREADSHEET_ID: spreadsheetId,
        SHEET_NAME: selectedSheet,
        COLUMN_INDEX: selectedColumn.toString(),
      },
    });
  };

  const canFetchStructure = Boolean(spreadsheetId);
  const canCreate = Boolean(
    spreadsheetId && selectedSheet && selectedColumn !== null && metricName,
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
            <CardTitle>Step 3: Select Data Column</CardTitle>
            <CardDescription>
              {isLoadingPreview
                ? "Loading data preview..."
                : "Click on a column header to select it as your metric source"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewData && (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Row</TableHead>
                        {(previewData.headers ?? []).map((header, index) => (
                          <TableHead
                            key={index}
                            className={`hover:bg-muted cursor-pointer transition-colors ${
                              selectedColumn === index
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }`}
                            onClick={() => handleColumnSelect(index)}
                          >
                            <div className="flex items-center gap-2">
                              {header}
                              {selectedColumn === index && (
                                <Badge variant="secondary" className="text-xs">
                                  Selected
                                </Badge>
                              )}
                            </div>
                          </TableHead>
                        ))}
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
                                selectedColumn === cellIndex
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

                {selectedColumn !== null && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm font-medium">
                      ✓ Full Column Selected
                    </p>
                    <p className="text-muted-foreground text-xs">
                      All {previewData.totalRows} data rows will be stored for
                      plotting. Latest value:{" "}
                      {String(
                        previewData.rows[previewData.rows.length - 1]?.[
                          selectedColumn
                        ] ?? "",
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Metric Configuration */}
      {selectedColumn !== null && (
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
