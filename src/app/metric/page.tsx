"use client";

import { useState } from "react";

import Nango from "@nangohq/frontend";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MetricPage() {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setStatus("Fetching session token...");

      // Step 1: Get session token from backend
      const response = await fetch("/api/nango/session", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get session token");
      }

      const data = (await response.json()) as { sessionToken: string };
      setStatus("Opening Nango Connect UI...");

      // Step 2: Initialize Nango and open connect UI
      const nango = new Nango();
      const connect = nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "connect") {
            setStatus(
              `✓ Connected! Integration: ${event.payload.integrationId}, Connection ID: ${event.payload.connectionId}`,
            );
            setIsLoading(false);
          } else if (event.type === "close") {
            setStatus("Connection flow closed");
            setIsLoading(false);
          }
        },
      });

      connect.setSessionToken(data.sessionToken);
    } catch (error) {
      console.error("Connection error:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>Connect 3rd Party Services</CardTitle>
          <CardDescription>
            Test Nango integration by connecting to external APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleConnect} disabled={isLoading} size="lg">
            {isLoading ? "Connecting..." : "Connect Integration"}
          </Button>

          {status && (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          <div className="text-muted-foreground space-y-2 text-sm">
            <p>Before testing:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Configure an integration in your Nango dashboard</li>
              <li>Set up OAuth credentials with the provider</li>
              <li>Test the connection in Nango&apos;s Connections tab</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
