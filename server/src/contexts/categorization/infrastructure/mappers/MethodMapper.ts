import { Method } from '../../domain/entities/Method.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';

export interface MethodRow {
  readonly id: string;
  readonly name: string;
  readonly nameNormalized: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived: boolean;
  readonly displayOrder: number;
}

export const MethodMapper = {
  toDomain(row: MethodRow): Method {
    return Method.create({
      id: MethodId.create(row.id),
      name: row.name,
      bgColor: row.bgColor,
      textColor: row.textColor,
      displayOrder: row.displayOrder,
      isArchived: row.isArchived,
    });
  },
  toPersistence(method: Method): MethodRow {
    return {
      id: method.id,
      name: method.name,
      nameNormalized: method.nameNormalized,
      bgColor: method.bgColor,
      textColor: method.textColor,
      isArchived: method.isArchived,
      displayOrder: method.displayOrder,
    };
  },
};
