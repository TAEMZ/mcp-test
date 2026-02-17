#!/usr/bin/env node

/**
 * Example MCP server for testing mcp-test.
 * Has 2 tools (echo, add) and 1 resource (greeting).
 * Communicates via stdio JSON-RPC.
 */

import { createInterface } from 'readline'

const tools = [
  {
    name: 'echo',
    description: 'Returns the input message back',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string', description: 'Message to echo' } },
      required: ['message'],
    },
  },
  {
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    },
  },
]

const resources = [
  { uri: 'greeting://hello', name: 'greeting', description: 'A friendly greeting', mimeType: 'text/plain' },
]

function handleRequest(msg) {
  const { method, params, id } = msg

  // Notifications (no id) — just acknowledge
  if (id === undefined) return null

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'echo-server', version: '1.0.0' },
        },
      }

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools } }

    case 'tools/call': {
      const { name, arguments: args } = params
      if (name === 'echo') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: args.message }],
            isError: false,
          },
        }
      }
      if (name === 'add') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: String(args.a + args.b) }],
            isError: false,
          },
        }
      }
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown tool: ${name}` },
      }
    }

    case 'resources/list':
      return { jsonrpc: '2.0', id, result: { resources } }

    case 'resources/read': {
      const { uri } = params
      if (uri === 'greeting://hello') {
        return {
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri, mimeType: 'text/plain', text: 'Hello from mcp-test!' }] },
        }
      }
      return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown resource: ${uri}` } }
    }

    case 'prompts/list':
      return { jsonrpc: '2.0', id, result: { prompts: [] } }

    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } }
  }
}

const rl = createInterface({ input: process.stdin })

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line.trim())
    const response = handleRequest(msg)
    if (response) {
      process.stdout.write(JSON.stringify(response) + '\n')
    }
  } catch {
    // ignore bad JSON
  }
})
