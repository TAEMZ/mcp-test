import { StdioClient } from './client'
import {
  InitializeResult,
  Tool,
  ToolResult,
  Resource,
  ResourceContent,
  Prompt,
  TestServerOptions,
  ServerCapabilities,
} from './types'

export class TestServer {
  private client: StdioClient
  private initialized = false
  private _capabilities: ServerCapabilities = {}
  private _serverInfo = { name: '', version: '' }

  constructor(options: TestServerOptions) {
    this.client = new StdioClient(options)
  }

  async start(): Promise<InitializeResult> {
    await this.client.start()

    const result = (await this.client.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-test', version: '0.1.0' },
    })) as InitializeResult

    this._capabilities = result.capabilities
    this._serverInfo = result.serverInfo

    this.client.notify('notifications/initialized')
    this.initialized = true

    return result
  }

  get capabilities(): ServerCapabilities {
    return this._capabilities
  }

  get serverInfo() {
    return this._serverInfo
  }

  async listTools(): Promise<Tool[]> {
    this.ensureInit()
    const result = (await this.client.request('tools/list')) as { tools: Tool[] }
    return result.tools
  }

  async callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult> {
    this.ensureInit()
    return (await this.client.request('tools/call', {
      name,
      arguments: args ?? {},
    })) as ToolResult
  }

  async listResources(): Promise<Resource[]> {
    this.ensureInit()
    const result = (await this.client.request('resources/list')) as { resources: Resource[] }
    return result.resources
  }

  async readResource(uri: string): Promise<ResourceContent[]> {
    this.ensureInit()
    const result = (await this.client.request('resources/read', { uri })) as {
      contents: ResourceContent[]
    }
    return result.contents
  }

  async listPrompts(): Promise<Prompt[]> {
    this.ensureInit()
    const result = (await this.client.request('prompts/list')) as { prompts: Prompt[] }
    return result.prompts
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<{ messages: unknown[] }> {
    this.ensureInit()
    return (await this.client.request('prompts/get', {
      name,
      arguments: args ?? {},
    })) as { messages: unknown[] }
  }

  async close(): Promise<void> {
    await this.client.close()
    this.initialized = false
  }

  private ensureInit(): void {
    if (!this.initialized) {
      throw new Error('Server not initialized. Call start() first.')
    }
  }
}

/**
 * Create and start a test server in one call.
 */
export async function createTestServer(options: TestServerOptions): Promise<TestServer> {
  const server = new TestServer(options)
  await server.start()
  return server
}
