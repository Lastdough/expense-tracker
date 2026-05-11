import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class InvalidPingMessageError extends DomainError {
  readonly code = 'invalid_ping_message';
}
