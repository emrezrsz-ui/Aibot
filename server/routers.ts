import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getRecentSignals, updateSignalStatus } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Scanner-Signale: Laden und Status aktualisieren
  signals: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return await getRecentSignals(input?.limit ?? 50);
      }),

    updateStatus: publicProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["EXECUTED", "IGNORED"]),
          note: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const ok = await updateSignalStatus(input.id, input.status, input.note);
        if (!ok) throw new Error("Signal konnte nicht aktualisiert werden");
        return { success: true, id: input.id, status: input.status };
      }),
  }),
});

export type AppRouter = typeof appRouter;
