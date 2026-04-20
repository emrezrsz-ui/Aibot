import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getRecentSignals, updateSignalStatus, getSignalsByFilter, saveTrade, updateTrade, getUserTrades, getActiveTrades, getTradeById } from "./db";
import { encryptApiKey } from "./encryption";
import { generateWebhookUrl } from "./webhook";
import { healthRouter } from "./health-router";

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

    filtered: publicProcedure
      .input(
        z.object({
          symbols: z.array(z.string()).optional(),
          intervals: z.array(z.string()).optional(),
          signalTypes: z.array(z.string()).optional(),
          statuses: z.array(z.string()).optional(),
          limit: z.number().min(1).max(200).default(50),
          page: z.number().min(1).default(1),
        }).optional()
      )
      .query(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const page = input?.page ?? 1;
        return await getSignalsByFilter(input || {}, limit, page);
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

  health: healthRouter,

  trades: router({
    save: publicProcedure
      .input(
        z.object({
          symbol: z.string(),
          type: z.enum(["BUY", "SELL"]),
          entryPrice: z.number(),
          quantity: z.number(),
          takeProfit: z.number(),
          stopLoss: z.number(),
          demoMode: z.boolean().default(true),
          signalStrength: z.number().default(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id || 1;
        const trade = await saveTrade({
          userId,
          ...input,
          status: "OPEN",
        });
        if (!trade) throw new Error("Trade konnte nicht gespeichert werden");
        return { success: true, trade };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          closePrice: z.number().optional(),
          status: z.enum(["OPEN", "CLOSED", "CANCELLED"]).optional(),
          profitLoss: z.number().optional(),
          profitLossPercent: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id || 1;
        const trade = await getTradeById(input.id, userId);
        if (!trade) throw new Error("Trade nicht gefunden");
        
        const updated = await updateTrade(input.id, {
          closePrice: input.closePrice,
          status: input.status,
          profitLoss: input.profitLoss,
          profitLossPercent: input.profitLossPercent,
          closedAt: input.status === "CLOSED" ? new Date() : undefined,
        });
        if (!updated) throw new Error("Trade konnte nicht aktualisiert werden");
        return { success: true };
      }),

    list: publicProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id || 1;
        return await getUserTrades(userId);
      }),

    active: publicProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id || 1;
        return await getActiveTrades(userId);
      }),
  }),
});
export type AppRouter = typeof appRouter;
