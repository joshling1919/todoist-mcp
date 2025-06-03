# Todoist MCP Server

A Model Context Protocol (MCP) server that integrates with Todoist to provide task management capabilities.

## Features

- **Task Filtering**: Get tasks using Todoist's powerful filter expressions
- Supports filters like `today`, `overdue`, `p1` (priority), `7 days`, etc.

## Setup

1. **Get Todoist API Token**:

   - Go to [Todoist Integrations](https://todoist.com/prefs/integrations)
   - Copy your API token

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   ```bash
   # Copy the example file
   cp env.example .env

   # Edit .env and add your actual API token
   # TODOIST_API_TOKEN=your_actual_token_here
   ```

4. **Build the project**:

   ```bash
   npm run build
   ```

5. **Run the server**:
   ```bash
   npm start
   ```

## Usage

The server exposes one tool:

- **`todoist_get_tasks_by_filter`** - Fetch tasks using filter expressions
  - `filter`: Filter expression (e.g., 'today', 'overdue', 'p1', '7 days')
  - `lang`: Optional language for filter parsing

### Example Filters

- `today` - Tasks due today
- `overdue` - Overdue tasks
- `7 days` - Tasks due in the next 7 days
- `p1` - Priority 1 (urgent) tasks
- `@work` - Tasks with the "work" label
- `#Project Name` - Tasks in a specific project

## Configuration

For use with Claude Desktop, add to your config:

```json
{
  "mcpServers": {
    "todoist": {
      "command": "node",
      "args": ["/path/to/todoist-mcp-server/dist/server.js"],
      "env": {
        "TODOIST_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

**Note**: When using with Claude Desktop, you can either:

- Set the token in the Claude config (as shown above), OR
- Create a `.env` file in the server directory (the server will automatically load it)

## Development

For development with automatic rebuilding:

```bash
npm run dev
```
