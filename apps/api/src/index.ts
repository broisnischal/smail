import { Elysia } from "elysia";
import provider from "./api/provider";
import { JwtPayload, verify } from "jsonwebtoken";
import cors from "@elysiajs/cors";
import { PrismaClient } from '../../../generated/prisma';

type AppTokenPayload = JwtPayload & {
  email: string;
  provider: string;
};

const app = new Elysia().use(cors({
  origin: ["http://localhost:5173"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}))
  .decorate("db", new PrismaClient())
  .onBeforeHandle(({ cookie }) => {
    // console.log(cookie)
  })
  .onAfterResponse(({ response }) => {
    // console.log(response)
  }).onError(({ code, error, path }) => {
    if (code === 418) return 'caught'
  })
  .use(provider)

  .derive(async ({ cookie, db }) => {
    const token = cookie["token"];


    if (!token || !token.cookie) throw new Error("Unauthorized");

    const decoded = verify(
      token.cookie.value as string,
      process.env.JWT_SECRET!,
    ) as unknown as AppTokenPayload;



    const user = await db.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) throw new Error("Unauthorized");

    return { user };
  })
  .get("/me", async ({ user, db }) => {

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
