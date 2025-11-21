"use client";

import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

interface GoogleSheetsPreviewProps {
  connectionId: string;
  spreadsheetId: string;
  sheetName: string;
}

export function GoogleSheetsPreview({
  connectionId,
  spreadsheetId,
  sheetName,
}: GoogleSheetsPreviewProps) {
  const { data: previewData, isLoading } = api.metric.getSheetPreview.useQuery({
    connectionId,
    spreadsheetId,
    sheetName,
    maxRows: 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sheet Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewData || previewData.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sheet Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No data found in this sheet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sheet Preview</CardTitle>
        <CardDescription>
          Showing first {previewData.rows.length} of {previewData.totalRows}{" "}
          rows
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {previewData.headers.map((header, idx) => (
                  <TableHead key={idx}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.rows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <TableCell key={cellIdx}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
