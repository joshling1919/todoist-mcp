#!/usr/bin/env node

import { TodoistApi } from "@doist/todoist-api-typescript";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// Environment validation
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  console.error(
    "Please set it in your .env file or as an environment variable"
  );
  process.exit(1);
}

// Initialize Todoist API client
const todoistClient = new TodoistApi(TODOIST_API_TOKEN);

// Create an MCP server
const server = new McpServer({
  name: "todoist-mcp",
  version: "1.0.0",
});

// Add a tool to get tasks by filter
server.tool(
  "todoist_get_tasks_by_filter",
  {
    filter: z
      .string()
      .describe("Filter expression (e.g., 'today', 'overdue', 'p1', '7 days')"),
    lang: z.string().optional().describe("Language for filter expression"),
  },
  async ({ filter, lang }) => {
    try {
      const tasks = await todoistClient.getTasks({
        filter: filter,
        lang: lang,
      });

      if (tasks.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No tasks found matching filter: "${filter}"`,
            },
          ],
        };
      }

      // Format tasks for display
      const formattedTasks = tasks
        .map((task) => {
          const parts = [`• ${task.content} (ID: ${task.id})`];

          if (task.description) {
            parts.push(`  Description: ${task.description}`);
          }
          if (task.due) {
            parts.push(`  Due: ${task.due.string}`);
          }
          if (task.priority > 1) {
            const priorityLabels = { 2: "Low", 3: "Medium", 4: "High" };
            parts.push(
              `  Priority: ${
                priorityLabels[task.priority as keyof typeof priorityLabels] ||
                task.priority
              }`
            );
          }
          if (task.labels && task.labels.length > 0) {
            parts.push(`  Labels: ${task.labels.join(", ")}`);
          }
          if (task.projectId) {
            parts.push(`  Project ID: ${task.projectId}`);
          }

          return parts.join("\n");
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${tasks.length} tasks with filter "${filter}":\n\n${formattedTasks}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching tasks: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Todoist MCP Server running on stdio");
