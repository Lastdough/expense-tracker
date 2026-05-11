import { type Request, type Response } from 'express';
import { type PingExpenses } from '../../../application/use-cases/PingExpenses.js';
import { type GetLatestPing } from '../../../application/use-cases/GetLatestPing.js';
import { RecordPingBody } from '../schemas/pingSchemas.js';

export class PingController {
  constructor(
    private readonly recordPingUseCase: PingExpenses,
    private readonly getLatestPingUseCase: GetLatestPing,
  ) {}

  record = async (req: Request, res: Response): Promise<void> => {
    const parsed = RecordPingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'invalid_request', issues: parsed.error.issues },
      });
      return;
    }

    const result = await this.recordPingUseCase.execute(parsed.data);
    if (!result.ok) {
      res.status(400).json({
        error: { code: result.error.code, message: result.error.message },
      });
      return;
    }

    res.status(201).json(serialize(result.value));
  };

  latest = async (_req: Request, res: Response): Promise<void> => {
    const ping = await this.getLatestPingUseCase.execute();
    if (!ping) {
      res.status(404).json({ error: { code: 'no_pings' } });
      return;
    }
    res.json(serialize(ping));
  };
}

function serialize(ping: { id: string; message: string; recordedAt: Date }) {
  return {
    id: ping.id,
    message: ping.message,
    recordedAt: ping.recordedAt.toISOString(),
  };
}
