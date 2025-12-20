"use client";

import { useEffect, useState } from "react";

import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";

interface ShareTeamDialogProps {
  teamId: string;
  initialShareToken: string | null;
  initialIsPubliclyShared: boolean;
}

export function ShareTeamDialog({
  teamId,
  initialShareToken,
  initialIsPubliclyShared,
}: ShareTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<"team" | "dashboard" | null>(
    null,
  );

  const [optimisticShared, setOptimisticShared] = useState(
    initialIsPubliclyShared,
  );
  const [optimisticToken, setOptimisticToken] = useState(initialShareToken);

  const utils = api.useUtils();

  const { data: team } = api.team.getById.useQuery(
    { id: teamId },
    {
      enabled: open,
    },
  );

  useEffect(() => {
    if (team) {
      setOptimisticShared(team.isPubliclyShared);
      setOptimisticToken(team.shareToken);
    }
  }, [team]);

  useEffect(() => {
    if (open && !team) {
      setOptimisticShared(initialIsPubliclyShared);
      setOptimisticToken(initialShareToken);
    }
  }, [open, team, initialIsPubliclyShared, initialShareToken]);

  const setPublicSharingMutation = api.team.setPublicSharing.useMutation({
    onMutate: (variables) => {
      const previousShared = optimisticShared;
      const previousToken = optimisticToken;
      setOptimisticShared(variables.enabled);
      return { previousShared, previousToken };
    },
    onSuccess: (data) => {
      setOptimisticToken(data.shareToken);
      setOptimisticShared(data.isPubliclyShared);
      void utils.team.getById.invalidate({ id: teamId });
      toast.success(
        data.isPubliclyShared
          ? "Public sharing enabled"
          : "Public sharing disabled",
      );
    },
    onError: (error, _variables, context) => {
      if (context) {
        setOptimisticShared(context.previousShared);
        setOptimisticToken(context.previousToken);
      }
      toast.error("Failed to update sharing settings", {
        description: error.message,
      });
    },
  });

  const regenerateTokenMutation = api.team.regenerateShareToken.useMutation({
    onMutate: () => {
      const previousShared = optimisticShared;
      const previousToken = optimisticToken;
      setOptimisticShared(true);
      return { previousShared, previousToken };
    },
    onSuccess: (data) => {
      setOptimisticToken(data.shareToken);
      setOptimisticShared(true);
      void utils.team.getById.invalidate({ id: teamId });
      toast.success("Share links regenerated");
    },
    onError: (error, _variables, context) => {
      if (context) {
        setOptimisticShared(context.previousShared);
        setOptimisticToken(context.previousToken);
      }
      toast.error("Failed to regenerate share links", {
        description: error.message,
      });
    },
  });

  const isMutating =
    setPublicSharingMutation.isPending || regenerateTokenMutation.isPending;

  const isGenerating =
    regenerateTokenMutation.isPending ||
    (setPublicSharingMutation.isPending && !optimisticToken);

  const handleToggleSharing = (enabled: boolean) => {
    setPublicSharingMutation.mutate({ teamId, enabled });
  };

  const handleRegenerateToken = () => {
    regenerateTokenMutation.mutate({ teamId });
  };

  const getShareUrl = (type: "team" | "dashboard") => {
    if (typeof window === "undefined" || !optimisticToken) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/${type}/${teamId}?token=${optimisticToken}`;
  };

  const handleCopy = async (type: "team" | "dashboard") => {
    const url = getShareUrl(type);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(type);
      toast.success(
        `${type === "team" ? "Team canvas" : "Dashboard"} link copied`,
      );
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenPreview = (type: "team" | "dashboard") => {
    const url = getShareUrl(type);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const showLinks = optimisticShared && optimisticToken && !isGenerating;
  const showLoading = isGenerating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Team</DialogTitle>
          <DialogDescription>
            Share a read-only view of your team canvas or dashboard with anyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <Link2 className="text-muted-foreground h-5 w-5" />
              <div>
                <Label htmlFor="share-toggle" className="text-sm font-medium">
                  Public sharing
                </Label>
                <p className="text-muted-foreground text-xs">
                  Anyone with the link can view
                </p>
              </div>
            </div>
            <Switch
              id="share-toggle"
              checked={optimisticShared}
              onCheckedChange={handleToggleSharing}
              disabled={isMutating}
            />
          </div>

          {showLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground ml-2 text-sm">
                Generating share links...
              </span>
            </div>
          )}

          {showLinks && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Team Canvas</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getShareUrl("team")}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleCopy("team")}
                    title="Copy link"
                  >
                    {copiedLink === "team" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleOpenPreview("team")}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Dashboard</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getShareUrl("dashboard")}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleCopy("dashboard")}
                    title="Copy link"
                  >
                    {copiedLink === "dashboard" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleOpenPreview("dashboard")}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-full"
                onClick={handleRegenerateToken}
                disabled={isMutating}
              >
                {regenerateTokenMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate share links
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
