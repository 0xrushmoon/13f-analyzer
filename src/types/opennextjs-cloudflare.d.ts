declare module "@opennextjs/cloudflare" {
  export function getCloudflareContext(options?: {
    async?: boolean;
  }): Promise<{
    env: Record<string, unknown>;
    ctx: ExecutionContext;
  }>;

  export function defineCloudflareConfig(config?: Record<string, unknown>): unknown;
}
