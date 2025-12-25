"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormLabelWithTooltip } from "@/components/form-label-with-tooltip";
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";
import { ROLE_COLORS } from "@/lib/utils";
import { api } from "@/trpc/react";

const roleFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  purpose: z.string().min(1, "Purpose is required"),
  accountabilities: z.string().optional(),
  metricId: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  effortPoints: z.number().int().nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

const EFFORT_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 20, 40];

const ROLE_FIELD_TOOLTIPS = {
  title: "A clear, descriptive name for this role",
  purpose: "The main goal or responsibility of this role",
  accountabilities: "Specific tasks or outcomes this role is responsible for",
  metric: "Link a metric to track this role's performance",
  assignedTo: "The team member who fills this role",
  effortPoints: "Estimated effort using Fibonacci-like scale",
  color: "Visual color for this role on the canvas",
};

interface RoleEditDialogProps {
  teamId: string;
  roleId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A standalone role edit dialog that can be used outside the team canvas.
 * Uses useOptimisticRoleUpdate directly instead of depending on the team store.
 */
export function RoleEditDialog({
  teamId,
  roleId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: RoleEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  // Fetch role data from cache
  const { data: roles } = api.role.getByTeamId.useQuery({ teamId });
  const role = roles?.find((r) => r.id === roleId);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      title: "",
      purpose: "",
      accountabilities: "",
      metricId: "",
      assignedUserId: null,
      effortPoints: null,
      color: ROLE_COLORS[0],
    },
  });

  // Reset form when dialog opens with role data
  useEffect(() => {
    if (open && role) {
      form.reset({
        title: role.title,
        purpose: role.purpose,
        accountabilities: role.accountabilities ?? "",
        metricId: role.metricId ?? "",
        assignedUserId: role.assignedUserId ?? null,
        effortPoints: role.effortPoints ?? null,
        color: role.color ?? ROLE_COLORS[0],
      });
    }
  }, [open, role, form]);

  // Fetch metrics and members for dropdowns
  const { data: metrics = [] } = api.metric.getByTeamId.useQuery({ teamId });
  const { data: members = [] } = api.organization.getMembers.useQuery();

  // Use shared optimistic update hook directly
  const updateRole = useOptimisticRoleUpdate(teamId);

  function onSubmit(data: RoleFormData) {
    const metricId =
      data.metricId === "__none__" || !data.metricId
        ? undefined
        : data.metricId;
    const assignedUserId =
      data.assignedUserId === "__none__" ? null : data.assignedUserId;

    setOpen(false);
    form.reset();

    updateRole.mutate({
      id: roleId,
      title: data.title,
      purpose: data.purpose,
      accountabilities: data.accountabilities,
      metricId,
      assignedUserId,
      effortPoints: data.effortPoints,
      color: data.color,
    });
  }

  const isLoading = !role;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[31rem]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update role details and assignments
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-24 rounded" />
            <div className="bg-muted h-24 rounded" />
            <div className="bg-muted h-10 rounded" />
          </div>
        ) : (
          <TooltipProvider>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Title"
                        tooltip={ROLE_FIELD_TOOLTIPS.title}
                        required
                      />
                      <FormControl>
                        <Input
                          placeholder="e.g., Product Manager"
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
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Purpose"
                        tooltip={ROLE_FIELD_TOOLTIPS.purpose}
                        required
                      />
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Describe the role's responsibilities..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountabilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Accountabilities"
                        tooltip={ROLE_FIELD_TOOLTIPS.accountabilities}
                      />
                      <FormControl>
                        <RichTextEditor
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="List key accountabilities for this role..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metricId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Metric"
                        tooltip={ROLE_FIELD_TOOLTIPS.metric}
                      />
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a metric (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {metrics.map((metric) => (
                            <SelectItem key={metric.id} value={metric.id}>
                              {metric.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Assigned To"
                        tooltip={ROLE_FIELD_TOOLTIPS.assignedTo}
                      />
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <span>
                                  {member.firstName} {member.lastName}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {member.email}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effortPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Effort Points"
                        tooltip={ROLE_FIELD_TOOLTIPS.effortPoints}
                      />
                      <Select
                        onValueChange={(value) =>
                          field.onChange(
                            value === "__none__" ? null : parseInt(value, 10),
                          )
                        }
                        value={field.value?.toString() ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select effort points">
                              {field.value && (
                                <div className="flex items-center gap-2">
                                  <Gauge className="h-4 w-4" />
                                  <span>
                                    {field.value}{" "}
                                    {field.value === 1 ? "point" : "points"}
                                  </span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {EFFORT_POINT_OPTIONS.map((points) => (
                            <SelectItem key={points} value={points.toString()}>
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4" />
                                <span>
                                  {points} {points === 1 ? "point" : "points"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Color"
                        tooltip={ROLE_FIELD_TOOLTIPS.color}
                      />
                      <div className="flex gap-2">
                        {ROLE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                field.value === color ? "black" : "transparent",
                            }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
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
                  <Button type="submit" disabled={updateRole.isPending}>
                    {updateRole.isPending ? "Updating..." : "Update Role"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TooltipProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
