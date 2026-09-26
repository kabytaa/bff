import { z } from 'zod';

export const HEALTH_SERVICE_NAME = 'business-factory-bff' as const;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal(HEALTH_SERVICE_NAME),
  version: z.string().trim().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export function parseHealthResponse(value: unknown): HealthResponse {
  return healthResponseSchema.parse(value);
}
