#!/usr/bin/env node

import { TodoistApi } from "@doist/todoist-api-typescript";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Environment validation
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  console.error(
    "Set this in your Claude Desktop config or export it locally for testing"
  );
  process.exit(1);
}

// Initialize Todoist API client
const todoistClient = new TodoistApi(TODOIST_API_TOKEN);

// Create an MCP server
const server = new McpServer(
  {
    name: "Personal Tools, Resources, Prompts",
    version: "1.0.0",
  },
  {
    instructions:
      "This is a collection of a person's personal set of tools, resources, and prompts for enhancing productivity and learning.",
  }
);

// Add a tool to get tasks by filter
server.tool(
  "todoist_get_tasks_by_filter",
  {
    query: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        "Todoist filter query. SYNTAX: Use & (AND), | (OR), ! (NOT), () for grouping, , for separate lists. EXAMPLES: Basic: 'today', 'overdue', 'p1', '7 days', 'no date'. Projects: '#Work', '#Personal'. Labels: '@urgent', '@waiting', '@urgent*' (wildcard). Search: 'search: meeting', 'search: email'. Dates: 'date: Jan 3', 'date before: May 5', 'date after: tomorrow'. Assignments: 'assigned to: me', 'assigned by: John'. Complex: '(today | overdue) & #Work', 'today & @urgent & !subtask', 'p1 & overdue, p4 & today'. Priority: 'p1' (urgent), 'p2' (high), 'p3' (medium), 'p4' (low). Multiple filters (comma-separated) are NOT supported."
      ),
    lang: z.string().optional().describe("Language for filter expression"),
  },
  async ({ query, lang }) => {
    try {
      const tasks = await todoistClient.getTasks({
        filter: query,
        lang: lang,
      });

      if (tasks.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No tasks found matching filter: "${query}"`,
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
            text: `Found ${tasks.length} tasks with filter "${query}":\n\n${formattedTasks}`,
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

// Add tutoring prompt for checks for understanding
server.prompt(
  "set_tutoring_behavior",
  "Sets the behavior for the AI when entering a tutoring session. Invoke this at the start of tutoring.",
  () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text",
          text: `We are now entering tutoring mode. Please adopt the following behavior for our interaction:

1.  When I express confusion about a topic, your primary goal is to help me understand it through guided discovery.
2. First give a clear explanation with at least 2 examples.
3.  Then, ask me 3 checks for understanding one at a time regarding the specific area of confusion so I get direct practice with the concept.
4.  IMPORTANT: Do NOT provide the answer directly to your questions. Instead, wait for my response one at a time.
5.  Focus on helping me build my own understanding rather than directly explaining concepts, unless I explicitly ask for an explanation after attempting to answer.
For example, if I say "I don't understand logarithms", you should provide an explanation and 2 worked examples. Then ask the first check for understanding, wait for my response, and then ask the next check for understanding, etc.`,
        },
      },
      {
        role: "assistant" as const,
        content: {
          type: "text",
          text: "Understood! I'm ready to help you learn. When you're ready, please tell me what topic you'd like to focus on, and I'll start by asking you a question to check your understanding.",
        },
      },
    ],
  })
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Personal Tools, Resources, Prompts MCP Server running on stdio");
