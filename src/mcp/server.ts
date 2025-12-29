#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './tools.js';

// Create server with shared tool definitions
const server = createMcpServer();

// Start the server with stdio transport (for local use)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GlyphForge MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
