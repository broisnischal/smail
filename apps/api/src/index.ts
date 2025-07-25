import { Elysia, t } from "elysia";
import provider from "./api/provider";
import { PrismaClient } from "../../../generated/prisma/index";
import { JwtPayload, verify } from "jsonwebtoken";
import { swagger } from "@elysiajs/swagger";

type AppTokenPayload = JwtPayload & {
  email: string;
  provider: string;
};

const app = new Elysia()
  .use(swagger())
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
  .get("/me", ({ user }) => {
    return user;
  })
  .post("asdf", ({ body: { email } }) => {}, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })
  .listen(4000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
