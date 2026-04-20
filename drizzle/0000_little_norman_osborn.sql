CREATE TABLE "filter_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"mtfTrendFilterEnabled" boolean DEFAULT false NOT NULL,
	"volumeConfirmationEnabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"interval" varchar(10) NOT NULL,
	"signal" varchar(10) NOT NULL,
	"strength" integer DEFAULT 0 NOT NULL,
	"currentPrice" text NOT NULL,
	"rsi" text NOT NULL,
	"ema12" text NOT NULL,
	"ema26" text NOT NULL,
	"hasDivergence" boolean DEFAULT false NOT NULL,
	"divergenceType" varchar(20),
	"divergenceStrength" integer DEFAULT 0 NOT NULL,
	"confluenceCount" integer DEFAULT 1 NOT NULL,
	"confluenceTimeframes" varchar(50),
	"confluenceBonus" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"scannedAt" timestamp DEFAULT now() NOT NULL,
	"actionAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"type" varchar(20) NOT NULL,
	"entryPrice" numeric(20, 8) NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"takeProfit" numeric(20, 8) NOT NULL,
	"stopLoss" numeric(20, 8) NOT NULL,
	"closePrice" numeric(20, 8),
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"trailingStopLevel" numeric(20, 8),
	"trailingStopStatus" varchar(20) DEFAULT 'NONE' NOT NULL,
	"demoMode" boolean DEFAULT true NOT NULL,
	"signalStrength" integer DEFAULT 0 NOT NULL,
	"profitLoss" numeric(20, 8),
	"profitLossPercent" numeric(5, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"botStatus" varchar(20) DEFAULT 'OFF' NOT NULL,
	"demoMode" boolean DEFAULT true NOT NULL,
	"slippageTolerance" numeric(5, 2) DEFAULT '0.5' NOT NULL,
	"maxTradeSize" numeric(15, 2) DEFAULT '1000' NOT NULL,
	"demoBalance" numeric(15, 2) DEFAULT '10000' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"exchange" varchar(50) NOT NULL,
	"apiKey" text NOT NULL,
	"apiSecret" text NOT NULL,
	"webhookUrl" text,
	"status" varchar(20) DEFAULT 'INACTIVE' NOT NULL,
	"lastTestedAt" timestamp,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "filter_configs" ADD CONSTRAINT "filter_configs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_configs" ADD CONSTRAINT "trading_configs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;