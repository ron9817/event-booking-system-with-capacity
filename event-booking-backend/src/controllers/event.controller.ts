import type { Request, Response } from "express";
import { eventService } from "../services/event.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import type { EventListQuery, EventIdParam } from "../schemas/event.schema.js";

export const eventController = {
  async list(req: Request, res: Response) {
    const query = req.validated as EventListQuery;
    const { data, meta } = await eventService.list(query);
    ApiResponse.paginated(res, data, meta);
  },

  async getById(req: Request, res: Response) {
    const { id } = req.validated as EventIdParam;
    const event = await eventService.getById(id);
    ApiResponse.success(res, event);
  },
};
