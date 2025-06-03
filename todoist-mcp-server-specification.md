# Todoist MCP Server - Full API Implementation

## Overview

Build a comprehensive Model Context Protocol (MCP) server that exposes the full Todoist API through MCP tools, with custom resources and prompts for planning workflows. This approach provides maximum flexibility by mapping directly to Todoist API capabilities.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude AI     │◄──►│  MCP Server      │◄──►│  Todoist API    │
│                 │    │                  │    │                 │
│ - Natural Lang  │    │ - Tools (6)      │    │ - Full API      │
│ - Planning      │    │ - Resources (2)  │    │ - All Features  │
│ - Bulk Ops      │    │ - Prompts (2)    │    │ - Filtering     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### MCP Capabilities

**Tools (6) - Direct API Mapping:**

1. `todoist_create_task` - Create tasks with full parameters
2. `todoist_get_tasks` - Fetch tasks with all filtering options
3. `todoist_update_task` - Update tasks by ID or search
4. `todoist_complete_task` - Mark tasks complete
5. `todoist_delete_task` - Delete tasks
6. `todoist_get_projects` - List all projects

**Resources (2) - Custom Planning Views:**

1. `todoist://planning/daily` - Daily planning overview
2. `todoist://planning/weekly` - Weekly planning overview

**Prompts (2) - Planning Assistance:**

1. `daily_planner` - Help plan the day
2. `task_manager` - General task management assistance

## Implementation

### Step 1: Project Setup

```bash
mkdir todoist-mcp-server
cd todoist-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk @doist/todoist-api-typescript
npm install --save-dev @types/node typescript
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 2: Core Server with Full API Tools

`src/index.ts`:

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TodoistApi } from "@doist/todoist-api-typescript";

// Environment validation
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  process.exit(1);
}

const todoistClient = new TodoistApi(TODOIST_API_TOKEN);

class TodoistMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "todoist-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  private setupToolHandlers() {
    // List all available tools - direct API mapping
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "todoist_add_task",
          description: "Create a new task using addTask()",
          inputSchema: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "Task content/title",
              },
              description: {
                type: "string",
                description: "Task description",
              },
              projectId: {
                type: "string",
                description: "Project ID",
              },
              sectionId: {
                type: "string",
                description: "Section ID",
              },
              parentId: {
                type: "string",
                description: "Parent task ID for subtasks",
              },
              order: {
                type: "number",
                description: "Task order",
              },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Task labels",
              },
              priority: {
                type: "number",
                description: "Priority from 1 (normal) to 4 (urgent)",
                enum: [1, 2, 3, 4],
              },
              dueString: {
                type: "string",
                description:
                  "Due date in natural language (e.g., 'tomorrow', 'next Monday')",
              },
              dueDate: {
                type: "string",
                description: "Due date in YYYY-MM-DD format",
              },
              dueDatetime: {
                type: "string",
                description: "Due datetime in RFC3339 format",
              },
              dueLang: {
                type: "string",
                description: "Language for dueString parsing",
              },
              assigneeId: {
                type: "string",
                description: "User ID to assign task to",
              },
            },
            required: ["content"],
          },
        },
        {
          name: "todoist_get_tasks",
          description: "Get tasks using getTasks()",
          inputSchema: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "Filter by project ID",
              },
              sectionId: {
                type: "string",
                description: "Filter by section ID",
              },
              label: {
                type: "string",
                description: "Filter by label name",
              },
              ids: {
                type: "array",
                items: { type: "string" },
                description: "Specific task IDs to fetch",
              },
            },
          },
        },
        {
          name: "todoist_get_tasks_by_filter",
          description:
            "Get tasks using getTasksByFilter() with filter expressions",
          inputSchema: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                description:
                  "Filter expression (e.g., 'today', 'overdue', 'p1', '7 days')",
              },
              lang: {
                type: "string",
                description: "Language for filter expression",
              },
            },
            required: ["filter"],
          },
        },
        {
          name: "todoist_update_task",
          description: "Update an existing task using updateTask()",
          inputSchema: {
            type: "object",
            properties: {
              task_id: {
                type: "string",
                description: "Task ID to update",
              },
              content: {
                type: "string",
                description: "New task content",
              },
              description: {
                type: "string",
                description: "New task description",
              },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "New labels",
              },
              priority: {
                type: "number",
                enum: [1, 2, 3, 4],
                description: "New priority",
              },
              dueString: {
                type: "string",
                description: "New due date in natural language",
              },
              dueDate: {
                type: "string",
                description: "New due date in YYYY-MM-DD format",
              },
              dueDatetime: {
                type: "string",
                description: "New due datetime in RFC3339 format",
              },
            },
            required: ["task_id"],
          },
        },
        {
          name: "todoist_close_task",
          description: "Mark a task as completed using closeTask()",
          inputSchema: {
            type: "object",
            properties: {
              task_id: {
                type: "string",
                description: "Task ID to close/complete",
              },
            },
            required: ["task_id"],
          },
        },
        {
          name: "todoist_reopen_task",
          description: "Reopen a completed task using reopenTask()",
          inputSchema: {
            type: "object",
            properties: {
              task_id: {
                type: "string",
                description: "Task ID to reopen",
              },
            },
            required: ["task_id"],
          },
        },
        {
          name: "todoist_delete_task",
          description: "Delete a task permanently using deleteTask()",
          inputSchema: {
            type: "object",
            properties: {
              task_id: {
                type: "string",
                description: "Task ID to delete",
              },
            },
            required: ["task_id"],
          },
        },
        {
          name: "todoist_get_projects",
          description: "Get all projects using getProjects()",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "todoist_quick_add_task",
          description:
            "Quickly add a task using natural language processing via quickAddTask()",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description:
                  "Natural language task description (e.g., 'Call mom tomorrow at 3pm')",
              },
              note: {
                type: "string",
                description: "Task note/description",
              },
              reminder: {
                type: "string",
                description: "Reminder text",
              },
              autoReminder: {
                type: "boolean",
                description: "Enable auto reminder",
              },
            },
            required: ["text"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "todoist_add_task":
            return await this.addTask(args);
          case "todoist_get_tasks":
            return await this.getTasks(args);
          case "todoist_get_tasks_by_filter":
            return await this.getTasksByFilter(args);
          case "todoist_update_task":
            return await this.updateTask(args);
          case "todoist_close_task":
            return await this.closeTask(args);
          case "todoist_reopen_task":
            return await this.reopenTask(args);
          case "todoist_delete_task":
            return await this.deleteTask(args);
          case "todoist_get_projects":
            return await this.getProjects();
          case "todoist_quick_add_task":
            return await this.quickAddTask(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Tool implementations - direct API calls
  private async addTask(args: any) {
    const task = await todoistClient.addTask(args);

    return {
      content: [
        {
          type: "text",
          text: `✓ Created task: "${task.content}"\nID: ${task.id}\nURL: ${task.url}`,
        },
      ],
    };
  }

  private async getTasks(args: any) {
    const tasks = await todoistClient.getTasks(args);

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No tasks found matching the criteria.",
          },
        ],
      };
    }

    const formatted = tasks
      .map((task) => this.formatTaskDetails(task))
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${tasks.length} tasks:\n\n${formatted}`,
        },
      ],
    };
  }

  private async getTasksByFilter(args: any) {
    const tasks = await todoistClient.getTasksByFilter(args);

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No tasks found matching the filter.",
          },
        ],
      };
    }

    const formatted = tasks
      .map((task) => this.formatTaskDetails(task))
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${tasks.length} tasks with filter "${args.filter}":\n\n${formatted}`,
        },
      ],
    };
  }

  private async updateTask(args: any) {
    const { task_id, ...updateData } = args;

    const updatedTask = await todoistClient.updateTask(task_id, updateData);

    return {
      content: [
        {
          type: "text",
          text: `✓ Updated task: "${updatedTask.content}"\nID: ${updatedTask.id}`,
        },
      ],
    };
  }

  private async closeTask(args: any) {
    const success = await todoistClient.closeTask(args.task_id);

    return {
      content: [
        {
          type: "text",
          text: success
            ? `✓ Task ${args.task_id} marked as complete`
            : `✗ Failed to complete task ${args.task_id}`,
        },
      ],
    };
  }

  private async reopenTask(args: any) {
    const success = await todoistClient.reopenTask(args.task_id);

    return {
      content: [
        {
          type: "text",
          text: success
            ? `✓ Task ${args.task_id} reopened`
            : `✗ Failed to reopen task ${args.task_id}`,
        },
      ],
    };
  }

  private async deleteTask(args: any) {
    const success = await todoistClient.deleteTask(args.task_id);

    return {
      content: [
        {
          type: "text",
          text: success
            ? `✓ Task ${args.task_id} deleted permanently`
            : `✗ Failed to delete task ${args.task_id}`,
        },
      ],
    };
  }

  private async getProjects() {
    const projects = await todoistClient.getProjects({});

    const formatted = projects
      .map(
        (project) =>
          `- ${project.name} (ID: ${project.id})${
            project.isShared ? " [Shared]" : ""
          }`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Projects:\n${formatted}`,
        },
      ],
    };
  }

  private async quickAddTask(args: any) {
    const task = await todoistClient.quickAddTask(args);

    return {
      content: [
        {
          type: "text",
          text: `✓ Quick-added task: "${task.content}"\nID: ${task.id}`,
        },
      ],
    };
  }

  // Helper methods
  private formatTaskDetails(task: any): string {
    const parts = [`• ${task.content} (ID: ${task.id})`];

    if (task.description) parts.push(`  Description: ${task.description}`);
    if (task.due) parts.push(`  Due: ${task.due.string}`);
    if (task.priority > 1) parts.push(`  Priority: ${task.priority}`);
    if (task.labels?.length > 0)
      parts.push(`  Labels: ${task.labels.join(", ")}`);
    if (task.projectId) parts.push(`  Project: ${task.projectId}`);

    return parts.join("\n");
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "todoist://planning/daily",
          mimeType: "text/markdown",
          name: "Daily Planning Overview",
          description: "Today's tasks organized for daily planning",
        },
        {
          uri: "todoist://planning/weekly",
          mimeType: "text/markdown",
          name: "Weekly Planning Overview",
          description: "This week's tasks organized for weekly planning",
        },
      ],
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;

        try {
          let content: string;

          if (uri === "todoist://planning/daily") {
            content = await this.generateDailyPlanningView();
          } else if (uri === "todoist://planning/weekly") {
            content = await this.generateWeeklyPlanningView();
          } else {
            throw new Error(`Unknown resource: ${uri}`);
          }

          return {
            contents: [{ uri, mimeType: "text/markdown", text: content }],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri,
                mimeType: "text/markdown",
                text: `Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );
  }

  private async generateDailyPlanningView(): Promise<string> {
    const [todayTasks, overdueTasks] = await Promise.all([
      todoistClient.getTasksByFilter({ filter: "today" }),
      todoistClient.getTasksByFilter({ filter: "overdue" }),
    ]);

    let content = "# Daily Planning Overview\n\n";

    if (overdueTasks.length > 0) {
      content += "## 🚨 Overdue Tasks\n";
      content +=
        overdueTasks.map((task) => `- ${task.content}`).join("\n") + "\n\n";
    }

    if (todayTasks.length > 0) {
      content += "## 📅 Today's Tasks\n";

      // Group by priority
      const urgent = todayTasks.filter((t) => t.priority === 4);
      const high = todayTasks.filter((t) => t.priority === 3);
      const normal = todayTasks.filter((t) => t.priority <= 2);

      if (urgent.length > 0) {
        content += "### 🔴 Urgent\n";
        content +=
          urgent.map((task) => `- ${task.content}`).join("\n") + "\n\n";
      }

      if (high.length > 0) {
        content += "### 🟡 High Priority\n";
        content += high.map((task) => `- ${task.content}`).join("\n") + "\n\n";
      }

      if (normal.length > 0) {
        content += "### ⚪ Normal\n";
        content +=
          normal.map((task) => `- ${task.content}`).join("\n") + "\n\n";
      }
    } else {
      content += "## 📅 Today's Tasks\nNo tasks scheduled for today.\n\n";
    }

    content += `**Summary:** ${overdueTasks.length} overdue, ${todayTasks.length} today`;

    return content;
  }

  private async generateWeeklyPlanningView(): Promise<string> {
    const weekTasks = await todoistClient.getTasksByFilter({
      filter: "7 days",
    });

    let content = "# Weekly Planning Overview\n\n";

    if (weekTasks.length === 0) {
      return content + "No tasks scheduled for this week.";
    }

    // Group by date
    const tasksByDate: { [key: string]: any[] } = {};
    const today = new Date();

    weekTasks.forEach((task) => {
      if (task.due) {
        const dateKey = task.due.date;
        if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
        tasksByDate[dateKey].push(task);
      }
    });

    // Sort dates and display
    const sortedDates = Object.keys(tasksByDate).sort();

    for (const date of sortedDates) {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      const isToday = date === today.toISOString().split("T")[0];

      content += `## ${dayName}, ${date}${isToday ? " (Today)" : ""}\n`;
      content +=
        tasksByDate[date].map((task) => `- ${task.content}`).join("\n") +
        "\n\n";
    }

    content += `**Total this week:** ${weekTasks.length} tasks`;

    return content;
  }

  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "daily_planner",
          description: "Get comprehensive daily planning assistance",
          arguments: [],
        },
        {
          name: "task_manager",
          description: "General task management and organization help",
          arguments: [
            {
              name: "context",
              description: "What you need help with (optional)",
              required: false,
            },
          ],
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "daily_planner":
          return await this.generateDailyPlannerPrompt();
        case "task_manager":
          return await this.generateTaskManagerPrompt(args?.context);
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  private async generateDailyPlannerPrompt() {
    const dailyView = await this.generateDailyPlanningView();

    return {
      description: "Daily planning assistant",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need help planning my day. Here's my current task situation:

${dailyView}

Please help me:
1. **Prioritize** - What should I focus on first?
2. **Schedule** - How should I organize my day?
3. **Capacity** - Is this realistic for today?
4. **Actions** - What specific steps should I take?

Provide a concrete daily plan with time estimates and suggest any Todoist commands I should run.`,
          },
        },
      ],
    };
  }

  private async generateTaskManagerPrompt(context?: string) {
    const weeklyView = await this.generateWeeklyPlanningView();

    const contextText = context ? `\n\nSpecific context: ${context}` : "";

    return {
      description: "Task management assistant",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need help managing my tasks effectively. Here's my current workload:

${weeklyView}${contextText}

Please help me:
1. **Organization** - How can I better organize these tasks?
2. **Workflow** - What's the most efficient approach?
3. **Tools** - What Todoist features/commands would help?
4. **Planning** - How should I approach this workload?

Give me actionable advice and specific Todoist commands I can use.`,
          },
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Todoist MCP Server running on stdio");
  }
}

const server = new TodoistMCPServer();
server.run().catch(console.error);
```

### Step 3: Package Configuration

`package.json`:

```json
{
  "name": "todoist-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "todoist-mcp-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc && chmod +x dist/*.js",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "0.5.0",
    "@doist/todoist-api-typescript": "^3.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "typescript": "^5.7.2"
  }
}
```

## Usage Examples

### Direct API Access

- _"Create a task 'Review proposal' due tomorrow with high priority"_

  ```
  todoist_create_task({
    content: "Review proposal",
    due_string: "tomorrow",
    priority: 3
  })
  ```

- _"Get all tasks due today"_

  ```
  todoist_get_tasks({ filter: "today" })
  ```

- _"Update task ID 123 to be due next week"_
  ```
  todoist_update_task({
    task_id: "123",
    due_string: "next week"
  })
  ```

### Bulk Operations (using natural language)

- _"Move all overdue tasks to tomorrow"_
  ```
  1. todoist_get_tasks({ filter: "overdue" })
  2. For each task: todoist_update_task({ task_id: "X", due_string: "tomorrow" })
  ```

### Planning Resources

- _"Show me my daily planning overview"_ → Read `todoist://planning/daily`
- _"What's my weekly schedule?"_ → Read `todoist://planning/weekly`

## Deployment

Build and configure:

```bash
npm run build

# Claude Desktop config
{
  "mcpServers": {
    "todoist": {
      "command": "node",
      "args": ["/path/to/todoist-mcp-server/dist/index.js"],
      "env": {
        "TODOIST_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

This approach gives you the full power of the Todoist API through MCP while still providing custom planning assistance through resources and prompts!
