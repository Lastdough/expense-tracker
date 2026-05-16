import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ReimbursementStatus } from '../../domain/entities/ReimbursementStatus.js';
import { ReimbursementStatusId } from '../../domain/value-objects/ReimbursementStatusId.js';
import { type ReimbursementStatusKind } from '../../domain/value-objects/ReimbursementStatusKind.js';
import { type IReimbursementStatusRepository } from '../../domain/repositories/IReimbursementStatusRepository.js';
import { ReimbursementStatusKindLookup } from './ReimbursementStatusKindLookup.js';

class FakeRepo implements IReimbursementStatusRepository {
  readonly rows = new Map<string, ReimbursementStatus>();

  seed(name: string, kind: ReimbursementStatusKind): ReimbursementStatus {
    const s = ReimbursementStatus.create({
      id: ReimbursementStatusId.create(randomUUID()),
      name,
      bgColor: '#000000',
      textColor: '#ffffff',
      displayOrder: this.rows.size,
      kind,
    });
    this.rows.set(s.id, s);
    return s;
  }

  async save(s: ReimbursementStatus): Promise<void> {
    this.rows.set(s.id, s);
  }
  async saveMany(ss: readonly ReimbursementStatus[]): Promise<void> {
    for (const s of ss) this.rows.set(s.id, s);
  }
  async findById(id: ReimbursementStatusId): Promise<ReimbursementStatus | null> {
    return this.rows.get(id) ?? null;
  }
  async findByNormalizedName(n: string): Promise<ReimbursementStatus | null> {
    for (const s of this.rows.values()) if (s.nameNormalized === n) return s;
    return null;
  }
  async listAll(): Promise<ReimbursementStatus[]> {
    return [...this.rows.values()];
  }
  async listActive(): Promise<ReimbursementStatus[]> {
    return [...this.rows.values()].filter((s) => !s.isArchived);
  }
  async nextDisplayOrder(): Promise<number> {
    return this.rows.size;
  }
}

describe('ReimbursementStatusKindLookup', () => {
  it('returns the kind for a known id', async () => {
    const repo = new FakeRepo();
    const s = repo.seed('Unpaid Reimbursable', 'UnpaidReimbursable');
    const lookup = new ReimbursementStatusKindLookup(repo);
    await expect(lookup.kindById(s.id)).resolves.toBe('UnpaidReimbursable');
  });

  it('returns null when the id is malformed', async () => {
    const lookup = new ReimbursementStatusKindLookup(new FakeRepo());
    await expect(lookup.kindById('not-a-uuid')).resolves.toBeNull();
  });

  it('returns null when no status matches the id', async () => {
    const lookup = new ReimbursementStatusKindLookup(new FakeRepo());
    await expect(lookup.kindById(randomUUID())).resolves.toBeNull();
  });

  it('survives a rename — the kind is independent of the name', async () => {
    const repo = new FakeRepo();
    const s = repo.seed('Unpaid Reimbursable', 'UnpaidReimbursable');
    s.rename('Outstanding');
    await repo.save(s);
    const lookup = new ReimbursementStatusKindLookup(repo);
    await expect(lookup.kindById(s.id)).resolves.toBe('UnpaidReimbursable');
  });
});
