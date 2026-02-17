import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, mcpMatchers, TestServer } from '../src'

expect.extend(mcpMatchers)

describe('echo-server', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer({
      command: 'node',
      args: ['examples/echo-server.mjs'],
    })
  })

  afterAll(async () => {
    await server.close()
  })

  // --- Initialize ---

  it('reports server info', () => {
    expect(server.serverInfo.name).toBe('echo-server')
    expect(server.serverInfo.version).toBe('1.0.0')
  })

  it('has tools and resources capabilities', () => {
    expect(server.capabilities.tools).toBeDefined()
    expect(server.capabilities.resources).toBeDefined()
  })

  // --- Tools ---

  it('lists tools', async () => {
    const tools = await server.listTools()
    expect(tools).toHaveLength(2)
    expect(tools).toContainTool('echo')
    expect(tools).toContainTool('add')
  })

  it('echo tool has correct params', async () => {
    const tools = await server.listTools()
    expect(tools).toHaveToolWithParams('echo', ['message'])
  })

  it('add tool has correct params', async () => {
    const tools = await server.listTools()
    expect(tools).toHaveToolWithParams('add', ['a', 'b'])
  })

  it('calls echo tool', async () => {
    const result = await server.callTool('echo', { message: 'hello world' })
    expect(result).toBeToolSuccess()
    expect(result).toHaveTextContent('hello world')
  })

  it('calls add tool', async () => {
    const result = await server.callTool('add', { a: 3, b: 7 })
    expect(result).toBeToolSuccess()
    expect(result).toHaveTextContent('10')
  })

  it('handles unknown tool', async () => {
    await expect(server.callTool('nonexistent')).rejects.toBeDefined()
  })

  // --- Resources ---

  it('lists resources', async () => {
    const resources = await server.listResources()
    expect(resources).toHaveLength(1)
    expect(resources[0].uri).toBe('greeting://hello')
  })

  it('reads a resource', async () => {
    const contents = await server.readResource('greeting://hello')
    expect(contents).toHaveLength(1)
    expect(contents[0].text).toBe('Hello from mcp-test!')
  })

  it('handles unknown resource', async () => {
    await expect(server.readResource('unknown://nope')).rejects.toBeDefined()
  })

  // --- Prompts ---

  it('lists prompts (empty)', async () => {
    const prompts = await server.listPrompts()
    expect(prompts).toHaveLength(0)
  })
})
