import { z } from 'zod';

const Uuid = z.uuid();
const Iso = z.iso.datetime({ offset: true, message: 'must be ISO 8601 datetime' });

export const MarkAsPaidBody = z.object({ paidAt: Iso });
export const MarkAsEarlyBody = z.object({ receivedAt: Iso });

export const ListUnpaidQuery = z.object({
  status: z.literal('unpaid'),
  dateStart: Iso,
  dateEnd: Iso,
});

export const IdParam = Uuid;
