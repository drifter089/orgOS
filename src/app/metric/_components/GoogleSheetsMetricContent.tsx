"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

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
import { api } from "@/trpc/react";

import type { ContentProps } from "./MetricDialogBase";

function extractSpreadsheetId(url: string): string | null {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = regex.exec(url);
  return match?.[1] ?? null;
}

export function GoogleSheetsMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");

  const [sheets, setSheets] = useState<Array<{ title: string }>>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [previewData, setPreviewData] = useState<string[][]>([]);

  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [metricName, setMetricName] = useState("");

  const fetchMetadata = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const response = data.data as {
        sheets?: Array<{ properties: { title: string } }>;
      };
      const sheetList =
        response.sheets?.map((s) => ({ title: s.properties.title })) ?? [];
      setSheets(sheetList);
      setStep(2);
    },
  });

  const fetchSheetData = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const response = data.data as { values?: string[][] };
      setPreviewData(response.values?.slice(0, 10) ?? []);
    },
  });

  const handleStep1Next = () => {
    const id = extractSpreadsheetId(spreadsheetUrl);
    if (!id || !connection) return;

    setSpreadsheetId(id);
    fetchMetadata.mutate({
      connectionId: connection.connectionId,
      integrationId: "google-sheet",
      endpoint: `/v4/spreadsheets/${id}`,
      method: "GET",
      params: {},
    });
  };

  const handleStep2Next = () => {
    if (!selectedSheet || !connection || !spreadsheetId) return;

    fetchSheetData.mutate({
      connectionId: connection.connectionId,
      integrationId: "google-sheet",
      endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${selectedSheet}`,
      method: "GET",
      params: {},
    });

    setStep(3);
  };

  const handleCreateMetric = () => {
    if (!connection || !metricName || selectedColumns.length === 0) return;

    onSubmit({
      templateId: "gsheets-column-data",
      connectionId: connection.connectionId,
      name: metricName,
      description: `Tracking columns from ${selectedSheet} in Google Sheets`,
      endpointParams: {
        SPREADSHEET_ID: spreadsheetId,
        SHEET_NAME: selectedSheet,
        COLUMNS: selectedColumns.join(","),
      },
    });
  };

  const toggleColumn = (index: number) => {
    setSelectedColumns((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const isStep1Valid = spreadsheetUrl.trim() !== "";
  const isStep2Valid = selectedSheet !== "";
  const isStep3Valid = metricName.trim() !== "" && selectedColumns.length > 0;

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
              <Label>Preview & Select Columns</Label>
              {fetchSheetData.isPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : previewData.length > 0 ? (
                <div className="rounded-md border">
                  <ScrollArea className="h-[400px] w-full">
                    <div className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">
                              #
                            </TableHead>
                            {previewData[0]?.map((_, index) => (
                              <TableHead key={index}>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedColumns.includes(index)}
                                    onCheckedChange={() => toggleColumn(index)}
                                  />
                                  <span>Col {index + 1}</span>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell className="text-muted-foreground text-center text-xs font-medium">
                                {rowIndex + 1}
                              </TableCell>
                              {row.map((cell, cellIndex) => (
                                <TableCell
                                  key={cellIndex}
                                  className={
                                    selectedColumns.includes(cellIndex)
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
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No data available
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Select columns by checking the boxes above. Showing first 10
                rows.
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
            disabled={!isStep1Valid || fetchMetadata.isPending}
          >
            {fetchMetadata.isPending ? (
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
