// Shared MCP tool definitions and handlers
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { transform, transformAll, getStylesInfo, STYLES, type StyleName, type ZalgoOptions } from '../transforms/index.js';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'glyphforge',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'transform_text',
          description: 'Transform text into a specific Unicode style. Available styles: ' + Object.keys(STYLES).join(', '),
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to transform',
              },
              style: {
                type: 'string',
                description: 'The style to apply',
                enum: Object.keys(STYLES),
              },
              zalgoIntensity: {
                type: 'string',
                description: 'Intensity for zalgo style (mini, normal, maxi)',
                enum: ['mini', 'normal', 'maxi'],
              },
            },
            required: ['text', 'style'],
          },
        },
        {
          name: 'transform_all',
          description: 'Transform text into all available styles at once',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to transform',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'list_styles',
          description: 'List all available text transformation styles with examples',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'batch_transform',
          description: 'Transform multiple texts with multiple styles',
          inputSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                description: 'Array of transformation requests',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    style: { type: 'string', enum: Object.keys(STYLES) },
                  },
                  required: ['text', 'style'],
                },
              },
            },
            required: ['items'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'transform_text': {
          const { text, style, zalgoIntensity } = args as {
            text: string;
            style: StyleName;
            zalgoIntensity?: 'mini' | 'normal' | 'maxi';
          };

          if (!text || typeof text !== 'string') {
            throw new Error('Text is required and must be a string');
          }

          if (!style || !Object.keys(STYLES).includes(style)) {
            throw new Error(`Invalid style. Available styles: ${Object.keys(STYLES).join(', ')}`);
          }

          const options: ZalgoOptions = zalgoIntensity ? { intensity: zalgoIntensity } : {};
          const result = transform(text, style, options);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  original: text,
                  style,
                  transformed: result,
                }, null, 2),
              },
            ],
          };
        }

        case 'transform_all': {
          const { text } = args as { text: string };

          if (!text || typeof text !== 'string') {
            throw new Error('Text is required and must be a string');
          }

          const result = transformAll(text);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  original: text,
                  transformations: result,
                }, null, 2),
              },
            ],
          };
        }

        case 'list_styles': {
          const styles = getStylesInfo();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalStyles: styles.length,
                  styles: styles.map(s => ({
                    name: s.name,
                    description: s.description,
                    example: s.example,
                  })),
                }, null, 2),
              },
            ],
          };
        }

        case 'batch_transform': {
          const { items } = args as {
            items: Array<{ text: string; style: StyleName }>;
          };

          if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Items array is required and must not be empty');
          }

          const results = items.map((item, index) => {
            try {
              return {
                index,
                original: item.text,
                style: item.style,
                transformed: transform(item.text, item.style),
                success: true,
              };
            } catch (error) {
              return {
                index,
                original: item.text,
                style: item.style,
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false,
              };
            }
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalItems: items.length,
                  successful: results.filter(r => r.success).length,
                  results,
                }, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
