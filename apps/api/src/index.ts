import { Elysia } from "elysia";
import provider from "./api/provider";
import { PrismaClient } from "../../../generated/prisma/index";
import { JwtPayload, verify } from "jsonwebtoken";

type AppTokenPayload = JwtPayload & {
  email: string;
  provider: string;
};

const app = new Elysia()
  .decorate("db", new PrismaClient())
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
        }
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
