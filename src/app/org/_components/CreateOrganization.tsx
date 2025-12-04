"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Building2, Loader2 } from "lucide-react";

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
import { api } from "@/trpc/react";

export function CreateOrganization() {
  const [orgName, setOrgName] = useState("");
  const router = useRouter();

  const createOrg = api.organization.create.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName.trim()) {
      createOrg.mutate({ name: orgName.trim() });
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Building2 className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Create Your Workspace</CardTitle>
          <CardDescription>
            Get started by creating your organization workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                placeholder="My Company"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={createOrg.isPending}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!orgName.trim() || createOrg.isPending}
            >
              {createOrg.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
            {createOrg.isError && (
              <p className="text-destructive text-center text-sm">
                {createOrg.error.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
