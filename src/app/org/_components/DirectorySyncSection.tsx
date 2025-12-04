"use client";

import { FolderSync, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

interface DirectorySyncSectionProps {
  hasDirectorySync: boolean;
  directory: {
    id: string;
    name: string;
    type: string;
    state: string;
  } | null;
}

export function DirectorySyncSection({
  hasDirectorySync,
  directory,
}: DirectorySyncSectionProps) {
  const generateLink = api.adminPortal.generateDirectorySetupLink.useMutation({
    onSuccess: ({ link }) => {
      window.location.href = link;
    },
  });

  if (hasDirectorySync && directory) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderSync className="h-5 w-5" />
            Directory Sync
            <Badge variant="default" className="ml-auto">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium">{directory.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Directory</dt>
              <dd className="font-medium">{directory.name}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderSync className="h-5 w-5" />
          Directory Sync
        </CardTitle>
        <CardDescription>
          Sync users and groups from your identity provider
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => generateLink.mutate()}
          disabled={generateLink.isPending}
          variant="outline"
          size="sm"
        >
          {generateLink.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Configure Directory Sync"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
