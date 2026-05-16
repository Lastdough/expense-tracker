import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';

export class EmptyFormulaError extends DomainError {
  readonly code = 'empty_formula';
}

export class InvalidCharacterError extends DomainError {
  readonly code = 'invalid_character';
}

export class FormulaSyntaxError extends DomainError {
  readonly code = 'formula_syntax_error';
}

export class DivisionByZeroError extends DomainError {
  readonly code = 'division_by_zero';
}

export class NumberPrecisionError extends DomainError {
  readonly code = 'number_precision_error';
}

export type FormulaError =
  | EmptyFormulaError
  | InvalidCharacterError
  | FormulaSyntaxError
  | DivisionByZeroError
  | NumberPrecisionError;
