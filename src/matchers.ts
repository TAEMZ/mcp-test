import type { Tool, ToolResult } from './types'

export interface McpMatchers<R = unknown> {
  toContainTool(name: string): R
  toHaveToolWithParams(name: string, params: string[]): R
  toBeToolSuccess(): R
  toBeToolError(): R
  toHaveTextContent(text?: string): R
}

export const mcpMatchers = {
  toContainTool(received: Tool[], name: string) {
    const found = received.some((t) => t.name === name)
    return {
      pass: found,
      message: () =>
        found
          ? `Expected tools not to contain "${name}"`
          : `Expected tools to contain "${name}", found: [${received.map((t) => t.name).join(', ')}]`,
    }
  },

  toHaveToolWithParams(received: Tool[], name: string, params: string[]) {
    const tool = received.find((t) => t.name === name)
    if (!tool) {
      return {
        pass: false,
        message: () =>
          `Tool "${name}" not found. Available: [${received.map((t) => t.name).join(', ')}]`,
      }
    }

    const toolParams = Object.keys(tool.inputSchema.properties ?? {})
    const missing = params.filter((p) => !toolParams.includes(p))

    return {
      pass: missing.length === 0,
      message: () =>
        missing.length === 0
          ? `Expected tool "${name}" not to have params [${params.join(', ')}]`
          : `Tool "${name}" missing params: [${missing.join(', ')}]. Has: [${toolParams.join(', ')}]`,
    }
  },

  toBeToolSuccess(received: ToolResult) {
    return {
      pass: !received.isError,
      message: () =>
        !received.isError
          ? `Expected tool result to be an error`
          : `Expected success, got error: ${JSON.stringify(received.content)}`,
    }
  },

  toBeToolError(received: ToolResult) {
    return {
      pass: received.isError === true,
      message: () =>
        received.isError
          ? `Expected tool result not to be an error`
          : `Expected tool result to be an error, but it succeeded`,
    }
  },

  toHaveTextContent(received: ToolResult, text?: string) {
    const texts = received.content.filter((c) => c.type === 'text').map((c) => c.text ?? '')

    if (text === undefined) {
      return {
        pass: texts.length > 0,
        message: () =>
          texts.length > 0
            ? `Expected result not to have text content`
            : `Expected result to have text content, but found none`,
      }
    }

    const found = texts.some((t) => t.includes(text))
    return {
      pass: found,
      message: () =>
        found
          ? `Expected result not to contain "${text}"`
          : `Expected result to contain "${text}", got: [${texts.join(', ')}]`,
    }
  },
}
