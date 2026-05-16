import { z } from 'zod';

const HEX_COLOR = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/u, 'Must be #rrggbb hex');

const Name = z.string().min(1, 'Must not be empty').max(64);

export const CreateBody = z.object({
  name: Name,
  bgColor: HEX_COLOR,
  textColor: HEX_COLOR,
});

export const RenameBody = z.object({
  name: Name,
});

export const ChangeColorsBody = z.object({
  bgColor: HEX_COLOR,
  textColor: HEX_COLOR,
});

export const ReorderBody = z.object({
  ids: z.array(z.uuid()).min(1),
});

export type CreateBody = z.infer<typeof CreateBody>;
export type RenameBody = z.infer<typeof RenameBody>;
export type ChangeColorsBody = z.infer<typeof ChangeColorsBody>;
export type ReorderBody = z.infer<typeof ReorderBody>;
