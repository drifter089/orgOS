"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const utils = api.useUtils();

  const form = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createTeam = api.team.create.useMutation({
    onMutate: async (newTeam) => {
      setOpen(false);
      form.reset();

      await utils.team.getAll.cancel();

      const previousTeams = utils.team.getAll.getData();

      const optimisticTeam = {
        id: "temp-" + Date.now(),
        name: newTeam.name,
        description: newTeam.description ?? null,
        organizationId: "optimistic",
        createdBy: "optimistic",
        createdAt: new Date(),
        updatedAt: new Date(),
        reactFlowNodes: [],
        reactFlowEdges: [],
        viewport: null,
        shareToken: null,
        isPubliclyShared: false,
        isLocked: false,
        lockedByUserName: null,
        editSession: undefined,
        _count: { roles: 0, metrics: 0 },
        isPending: true,
      };

      utils.team.getAll.setData(undefined, (old) => {
        if (!old) return [optimisticTeam];
        return [optimisticTeam, ...old];
      });

      return { previousTeams };
    },
    onSuccess: (data) => {
      void utils.team.getAll.invalidate();
      router.push(`/teams/${data.id}`);
    },
    onError: (error, newTeam, context) => {
      if (context?.previousTeams) {
        utils.team.getAll.setData(undefined, context.previousTeams);
      }
      console.error("Failed to create team:", error);
    },
  });

  function onSubmit(data: CreateTeamForm) {
    createTeam.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-[130px] gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Role Chart</DialogTitle>
          <DialogDescription>
            Create a new role chart to organize roles and workflows
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Product Team"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose of this team..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTeam.isPending}>
                {createTeam.isPending ? "Creating..." : "Create Role Chart"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
