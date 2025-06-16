import { Elysia } from "elysia";
import provider from "./api/provider";
import { JwtPayload, verify } from "jsonwebtoken";
import cors from "@elysiajs/cors";
import { db } from "./db";

type AppTokenPayload = JwtPayload & {
  email: string;
  provider: string;
};

const app = new Elysia({ prefix: "/api" }).use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:3000",
    "https://mail.snehaa.store"
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}))
  .decorate("db", db)
  .onBeforeHandle(({ cookie }) => {
    // console.log(cookie)
  })
  .onAfterResponse(({ response }) => {
    // console.log(response)
  }).onError(({ code, error, path }) => {
    if (code === 418) return 'caught'
  })
  .use(provider)

  .get("/health", () => {
    return { status: "ok", message: "API is running" };
  })

  .derive(async ({ cookie, db }) => {
    const token = cookie["token"];

    if (!token || !token.cookie) {
      return { user: null };
    }

    try {
      const decoded = verify(
        token.cookie.value as string,
        process.env.JWT_SECRET!,
      ) as unknown as AppTokenPayload;

      const user = await db.user.findUnique({
        where: { id: decoded.sub },
      });

      return { user };
    } catch (error) {
      console.error("Token verification failed:", error);
      return { user: null };
    }
  })
  .get("/me", async ({ user, db }) => {
    if (!user) {
      throw new Error("Unauthorized");
    }

    const alias = await db.emailAlias.findMany({
      where: {
        email: {
          every: {
            address: user.email
          }
        },
      },
      select: {
        alias: true,
        email: true,
        emailCount: true,
        emailLogs: true,
        createdAt: true,
        expiresAt: true,
        isActive: true,
        id: true,
        updatedAt: true,
      }
    })

    return {
      alias,
      user
    };
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
