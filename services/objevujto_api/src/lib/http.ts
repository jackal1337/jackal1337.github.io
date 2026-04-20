import type { Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(res: Response, status: number, payload: unknown): void {
  res.status(status).json(payload);
}
