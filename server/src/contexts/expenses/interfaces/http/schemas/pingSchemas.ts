import { z } from 'zod';

export const RecordPingBody = z.object({
  message: z.string().min(1, 'message must not be empty'),
});

export type RecordPingBody = z.infer<typeof RecordPingBody>;
