import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const taskRouter = createTRPCRouter({
  // Get all tasks for the authenticated user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.task.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
    return tasks;
  }),

  // Get a single task by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id, // Ensure user owns this task
        },
      });
      return task ?? null;
    }),

  // Create a new task (for Query Invalidation demo)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        priority: z.number().int().min(0).max(10).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority ?? 0,
          userId: ctx.user.id,
        },
      });
    }),

  // Toggle task completion (for Direct Cache Update demo)
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First, get the current task to ensure user owns it
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Task not found or unauthorized",
        });
      }

      // Toggle the completed status
      return ctx.db.task.update({
        where: { id: input.id },
        data: { completed: !task.completed },
      });
    }),

  // Update task priority (for Optimistic Update demo)
  updatePriority: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        priority: z.number().int().min(0).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Task not found or unauthorized",
        });
      }

      return ctx.db.task.update({
        where: { id: input.id },
        data: { priority: input.priority },
      });
    }),

  // Delete a task
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before deletion
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Task not found or unauthorized",
        });
      }

      return ctx.db.task.delete({
        where: { id: input.id },
      });
    }),
});
