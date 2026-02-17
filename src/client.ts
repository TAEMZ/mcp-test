import { spawn, ChildProcess } from 'child_process'
import { JsonRpcRequest, JsonRpcResponse, TestServerOptions } from './types'

export class StdioClient {
  private process: ChildProcess | null = null
  private requestId = 0
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> }
  >()
  private buffer = ''
  private timeout: number
  private stderrChunks: string[] = []

  constructor(private options: TestServerOptions) {
    this.timeout = options.timeout ?? 10_000
  }

  async start(): Promise<void> {
    this.process = spawn(this.options.command, this.options.args ?? [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...this.options.env },
      cwd: this.options.cwd,
    })

    this.process.stdout!.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString()
      this.processBuffer()
    })

    this.process.stderr!.on('data', (chunk: Buffer) => {
      this.stderrChunks.push(chunk.toString())
    })

    this.process.on('error', (err) => {
      for (const [, { reject, timer }] of this.pending) {
        clearTimeout(timer)
        reject(err)
      }
      this.pending.clear()
    })

    this.process.on('exit', (code) => {
      for (const [, { reject, timer }] of this.pending) {
        clearTimeout(timer)
        reject(new Error(`Server exited with code ${code}`))
      }
      this.pending.clear()
    })
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const msg = JSON.parse(trimmed)
        // Skip notifications (no id)
        if (msg.id === undefined) continue
        const response = msg as JsonRpcResponse
        const pending = this.pending.get(response.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pending.delete(response.id)
          if (response.error) {
            pending.reject(response.error)
          } else {
            pending.resolve(response.result)
          }
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error('Server not started')
    }

    const id = ++this.requestId
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Request timed out after ${this.timeout}ms: ${method}`))
      }, this.timeout)

      this.pending.set(id, { resolve, reject, timer })
      this.process!.stdin!.write(JSON.stringify(request) + '\n')
    })
  }

  notify(method: string, params?: Record<string, unknown>): void {
    if (!this.process?.stdin) {
      throw new Error('Server not started')
    }

    const notification = {
      jsonrpc: '2.0' as const,
      method,
      ...(params !== undefined ? { params } : {}),
    }

    this.process.stdin.write(JSON.stringify(notification) + '\n')
  }

  async close(): Promise<void> {
    for (const [, { reject, timer }] of this.pending) {
      clearTimeout(timer)
      reject(new Error('Client closed'))
    }
    this.pending.clear()

    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  get stderr(): string[] {
    return this.stderrChunks
  }
}
