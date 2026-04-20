import { publicProcedure, router } from "./_core/trpc";
import {
  getSystemHealth,
  getDatabaseStatus,
  getWebSocketStatus,
  getErrorLogs,
  getHealthReport,
} from "./health";

export const healthRouter = router({
  /**
   * Get system health metrics (CPU, Memory, Uptime)
   */
  system: publicProcedure.query(async () => {
    return getSystemHealth();
  }),

  /**
   * Get database connection status
   */
  database: publicProcedure.query(async () => {
    return await getDatabaseStatus();
  }),

  /**
   * Get WebSocket status
   */
  websocket: publicProcedure.query(async () => {
    return getWebSocketStatus();
  }),

  /**
   * Get recent error logs
   */
  errors: publicProcedure.query(async () => {
    return getErrorLogs(10);
  }),

  /**
   * Get comprehensive health report
   */
  report: publicProcedure.query(async () => {
    return await getHealthReport();
  }),
});
