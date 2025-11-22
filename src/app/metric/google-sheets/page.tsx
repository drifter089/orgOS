"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

function extractSpreadsheetId(url: string): string | null {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = regex.exec(url);
  return match?.[1] ?? null;
}

export default function GoogleSheetsMetricsPage() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");

  const [sheets, setSheets] = useState<Array<{ title: string }>>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [previewData, setPreviewData] = useState<string[][]>([]);

  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [metricName, setMetricName] = useState("");

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "google-sheet",
  );

  const utils = api.useUtils();

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

  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      handleClose();
    },
  });

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    setSpreadsheetUrl("");
    setSpreadsheetId("");
    setSheets([]);
    setSelectedSheet("");
    setPreviewData([]);
    setSelectedColumns([]);
    setMetricName("");
  };

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

    createMetric.mutate({
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

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Google Sheets Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your Google Sheets account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isStep1Valid = spreadsheetUrl.trim() !== "";
  const isStep2Valid = selectedSheet !== "";
  const isStep3Valid = metricName.trim() !== "" && selectedColumns.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Sheets Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create New Metric</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Create Google Sheets Metric - Step {step} of 3
              </DialogTitle>
              <DialogDescription>
                {step === 1 && "Enter your Google Sheets link to get started"}
                {step === 2 &&
                  "Select a sheet from your spreadsheet to preview"}
                {step === 3 && "Select the columns you want to track"}
              </DialogDescription>
            </DialogHeader>

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
                    <Select
                      value={selectedSheet}
                      onValueChange={setSelectedSheet}
                    >
                      <SelectTrigger id="sheet-select">
                        <SelectValue placeholder="Choose a sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheets.map((sheet) => (
                          <SelectItem key={sheet.title} value={sheet.title}>
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
                      <div className="max-h-64 overflow-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="w-10 p-2"></th>
                              {previewData[0]?.map((_, index) => (
                                <th key={index} className="p-2 text-left">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={selectedColumns.includes(index)}
                                      onCheckedChange={() =>
                                        toggleColumn(index)
                                      }
                                    />
                                    <span>Col {index + 1}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, rowIndex) => (
                              <tr
                                key={rowIndex}
                                className="hover:bg-muted/50 border-t"
                              >
                                <td className="text-muted-foreground p-2 text-xs">
                                  {rowIndex + 1}
                                </td>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className={
                                      selectedColumns.includes(cellIndex)
                                        ? "bg-primary/10 p-2"
                                        : "p-2"
                                    }
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No data available
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Select columns by checking the boxes above. Showing first
                      10 rows.
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
                  disabled={!isStep3Valid || createMetric.isPending}
                >
                  {createMetric.isPending ? (
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
          </DialogContent>
        </Dialog>

        {createMetric.isError && (
          <p className="text-destructive mt-4 text-sm">
            Error: {createMetric.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
