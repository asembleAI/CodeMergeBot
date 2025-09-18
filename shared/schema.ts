import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const mergeJobs = pgTable("merge_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceAUrl: text("workspace_a_url").notNull(),
  workspaceBUrl: text("workspace_b_url").notNull(),
  workspaceABranch: text("workspace_a_branch").default("main"),
  workspaceBBranch: text("workspace_b_branch").default("main"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  aiProvider: text("ai_provider").notNull(), // openai, anthropic
  mergedFiles: json("merged_files"),
  conflicts: json("conflicts"),
  summary: json("summary"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const workspaceFiles = pgTable("workspace_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mergeJobId: varchar("merge_job_id").references(() => mergeJobs.id),
  workspace: text("workspace").notNull(), // 'a' or 'b'
  filePath: text("file_path").notNull(),
  content: text("content"),
  fileType: text("file_type"),
  isConflict: boolean("is_conflict").default(false),
});

export const insertMergeJobSchema = createInsertSchema(mergeJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertWorkspaceFileSchema = createInsertSchema(workspaceFiles).omit({
  id: true,
});

export type InsertMergeJob = z.infer<typeof insertMergeJobSchema>;
export type MergeJob = typeof mergeJobs.$inferSelect;
export type InsertWorkspaceFile = z.infer<typeof insertWorkspaceFileSchema>;
export type WorkspaceFile = typeof workspaceFiles.$inferSelect;
