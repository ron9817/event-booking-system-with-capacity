import type { Request, Response } from "express";
import { waitlistService } from "../services/waitlist.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import type {
  WaitlistParams,
  WaitlistListQuery,
} from "../schemas/waitlist.schema.js";

export const waitlistController = {
  async getMyPosition(req: Request, res: Response) {
    const { eventId } = req.validated as WaitlistParams;
    const entry = await waitlistService.getMyPosition(eventId, req.userId);
    ApiResponse.success(res, entry);
  },

  async leave(req: Request, res: Response) {
    const { eventId } = req.validated as WaitlistParams;
    const entry = await waitlistService.leaveWaitlist(eventId, req.userId);
    ApiResponse.success(res, entry);
  },

  async list(req: Request, res: Response) {
    const { eventId } = req.validated as WaitlistParams;
    const query = req.validated as WaitlistListQuery;
    const { data, meta } = await waitlistService.listForEvent(eventId, query);
    ApiResponse.paginated(res, data, meta);
  },
};
