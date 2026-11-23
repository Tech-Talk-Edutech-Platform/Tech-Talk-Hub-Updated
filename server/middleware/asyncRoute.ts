import type { Request, RequestHandler, Response } from 'express'

export function asyncRoute<Params = Record<string, string>>(
  handler: (req: Request<Params>, res: Response) => Promise<void>,
): RequestHandler<Params> {
  return (req, res, next) => {
    void handler(req, res).catch(next)
  }
}
