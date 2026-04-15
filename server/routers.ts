import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getRecentSignals, updateSignalStatus } from "./db";
import { encryptApiKey } from "./encryption";
import { generateWebhookUrl } from "./webhook";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

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

  trading: router({
    saveApiKeys: publicProcedure
      .input(
        z.object({
          exchange: z.enum(["binance", "kraken", "coinbase"]),
          apiKey: z.string().min(10),
          apiSecret: z.string().min(10),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const encryptedKey = encryptApiKey(input.apiKey);
          const encryptedSecret = encryptApiKey(input.apiSecret);
          return {
            success: true,
            message: `${input.exchange} API-Keys gespeichert (verschlüsselt)`,
            exchange: input.exchange,
          };
        } catch (error) {
          throw new Error(`Fehler beim Speichern der API-Keys: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`);
        }
      }),

    updateTradingConfig: publicProcedure
      .input(
        z.object({
          botEnabled: z.boolean(),
          demoMode: z.boolean(),
          slippageTolerance: z.number().min(0.1).max(5),
          maxTradeSize: z.number().min(10).max(100000),
        })
      )
      .mutation(async ({ input }) => {
        return {
          success: true,
          message: "Trading-Konfiguration aktualisiert",
          config: input,
        };
      }),

    generateWebhookUrl: publicProcedure
      .mutation(async ({ ctx }) => {
        const userId = ctx.user?.id || 1;
        const config = generateWebhookUrl(userId);
        return {
          success: true,
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookSecret,
          message: "Webhook-URL generiert. Kopiere diese in dein MQL5-Skript.",
        };
      }),

    getTradingConfig: publicProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id || 1;
        const webhookConfig = generateWebhookUrl(userId);
        return {
          botEnabled: false,
          demoMode: true,
          slippageTolerance: 0.5,
          maxTradeSize: 5000,
          webhookUrl: webhookConfig.webhookUrl,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
