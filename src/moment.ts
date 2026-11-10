import { moment as obsidianMoment } from 'obsidian';

// Obsidian re-exports moment.js. These declarations cover the parts this
// plugin uses, so its types don't depend on how moment's own typings resolve
// in a given build environment.
export type MomentInput = string | number | Date | Moment | null | undefined;

export interface Moment {
  format(format?: string): string;
  toISOString(keepOffset?: boolean): string;
  toDate(): Date;
  valueOf(): number;
  isValid(): boolean;
  isSame(other?: unknown): boolean;
  isBefore(other?: unknown): boolean;
  isAfter(other?: unknown): boolean;
  isSameOrBefore(other?: unknown): boolean;
  isSameOrAfter(other?: unknown): boolean;
}

interface MomentFactory {
  (input?: MomentInput, format?: string): Moment;
  isMoment(value: unknown): value is Moment;
}

export const moment = obsidianMoment as unknown as MomentFactory;
