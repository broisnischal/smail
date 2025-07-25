import { Elysia, t } from "elysia";
import provider from "./api/provider";
import { JwtPayload, verify } from "jsonwebtoken";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { PrismaClient } from "../../../shared/generated/prisma";

type AppTokenPayload = JwtPayload & {
  email: string;
  provider: string;
};

const app = new Elysia()
  .use(swagger())

  .decorate("db", new PrismaClient())
  .decorate("db", db)
  .onBeforeHandle(({ cookie }) => {
    // console.log(cookie)
  })
  .onAfterResponse(({ response }) => {
    // console.log(response)
  })
  .onError(({ code, error, path }) => {
    if (code === 418) return "caught";
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

      if (!user) {
        return { user: null };
      }

      return { user };
    } catch (error) {
      console.error("Token verification failed:", error);
      return { user: null };
    }
  })
  // .use(
  //   cors({
  //     origin: "*",
  //     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  //     allowedHeaders: ["Content-Type", "Authorization"],
  //     exposedHeaders: ["Content-Type", "Authorization"],
  //     credentials: true,
  //   }),
  // )
  .get("/me", async ({ user, db }) => {
    if (!user) {
      throw new Error("Unauthorized");
    }

    const alias = await db.emailAlias.findMany({
      where: {
        userId: user.id,
        email: {
          every: {
            address: user.email,
          },
        },
      },
      select: {
        alias: true,
        email: true,
        emailCount: true,
        emailLogs: true,
        createdAt: true,
        expiresAt: true,
        domain: true,
        isActive: true,
        id: true,
        updatedAt: true,
      },
    });

    return {
      alias,
      user,
    };
  })
  .post(
    "/alias",
    async ({ body, db, user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      const already = await db.emailAlias.findFirst({
        where: {
          alias: body.alias,
        },
      });
      if (already) {
        throw new Error("Alias already exists");
      }

      const alias = await db.emailAlias.create({
        data: {
          alias: body.alias,
          userId: user.id,
          email: {
            create: {
              address: user.email,
            },
          },
        },
      });
      return {
        alias,
      };
    },
    {
      body: t.Object({
        alias: t.String(),
      }),
    },
  )
  .delete("/alias/:id", async ({ params, db, user }) => {
    if (!user) {
      throw new Error("Unauthorized");
    }

    const alias = await db.emailAlias.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!alias) {
      throw new Error("Alias not found");
    }

    await db.emailAlias.delete({
      where: {
        id: params.id,
      },
    });
    return {
      alias,
    };
  })
  .put(
    "/alias/:id",
    async ({ params, body, db, user }) => {
      if (!user) {
        throw new Error("Unauthorized");
      }

      const alias = await db.emailAlias.findFirst({
        where: {
          id: params.id,
          userId: user.id,
        },
      });

      if (!alias) {
        throw new Error("Alias not found");
      }

      await db.emailAlias.update({
        where: {
          id: params.id,
        },
        data: {
          isActive: !body.isActive,
        },
      });
      return {
        alias,
      };
    },
    {
      body: t.Object({
        isActive: t.Boolean(),
      }),
    },
  )
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
