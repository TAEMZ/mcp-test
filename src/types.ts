// JSON-RPC 2.0
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// MCP Protocol
export interface Tool {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

export interface Resource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface Prompt {
  name: string
  description?: string
  arguments?: PromptArgument[]
}

export interface PromptArgument {
  name: string
  description?: string
  required?: boolean
}

export interface ToolResult {
  content: Content[]
  isError?: boolean
}

export interface Content {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

export interface ResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface ServerCapabilities {
  tools?: Record<string, unknown>
  resources?: Record<string, unknown>
  prompts?: Record<string, unknown>
}

export interface InitializeResult {
  protocolVersion: string
  capabilities: ServerCapabilities
  serverInfo: {
    name: string
    version: string
  }
}

export interface TestServerOptions {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  timeout?: number
}
