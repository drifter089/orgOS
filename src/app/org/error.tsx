"use client";

import { useEffect } from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OrganizationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error("Organization route error:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-8">
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                Failed to load organization data
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium">Error Details:</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {error.message || "An unknown error occurred"}
              </p>
              {error.digest && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <p className="text-muted-foreground text-sm">
              This might be a temporary issue. You can try reloading the page,
              or check your connection and permissions.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={() => reset()} variant="default">
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
          >
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
