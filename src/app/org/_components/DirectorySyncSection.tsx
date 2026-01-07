"use client";

import { FolderSync, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z" />
      <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z" />
      <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z" />
      <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z" />
    </svg>
  );
}

function OktaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#007DC1"
        d="M12 0C5.389 0 0 5.389 0 12s5.389 12 12 12 12-5.389 12-12S18.611 0 12 0zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"
      />
    </svg>
  );
}

function getProviderIcon(type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("google") || normalizedType.includes("gsuite")) {
    return GoogleIcon;
  }
  if (
    normalizedType.includes("azure") ||
    normalizedType.includes("microsoft") ||
    normalizedType.includes("entra")
  ) {
    return MicrosoftIcon;
  }
  if (normalizedType.includes("okta")) {
    return OktaIcon;
  }
  return FolderSync;
}

function formatProviderName(type: string): string {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("google") || normalizedType.includes("gsuite")) {
    return "Google Workspace";
  }
  if (
    normalizedType.includes("azure") ||
    normalizedType.includes("microsoft") ||
    normalizedType.includes("entra")
  ) {
    return "Microsoft Entra";
  }
  if (normalizedType.includes("okta")) {
    return "Okta";
  }
  return type;
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
    const ProviderIcon = getProviderIcon(directory.type);
    const providerName = formatProviderName(directory.type);

    return (
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center">
            <ProviderIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Directory Sync</p>
            <p className="text-muted-foreground truncate text-xs">
              {directory.name} via {providerName}
            </p>
          </div>
          <Badge variant="default" className="shrink-0">
            Active
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center">
          <FolderSync className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Directory Sync</p>
          <p className="text-muted-foreground text-xs">
            Sync users and groups from your identity provider
          </p>
        </div>
        <Button
          onClick={() => generateLink.mutate()}
          disabled={generateLink.isPending}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          {generateLink.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Configure"
          )}
        </Button>
      </div>
    </Card>
  );
}
