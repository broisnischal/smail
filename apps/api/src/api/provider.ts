import Elysia, { Context, redirect } from "elysia";
import { oauth2 } from "elysia-oauth2";
import { sign } from "jsonwebtoken";
import { db } from "../db";
import { PrismaClient } from "../../../../shared/generated/prisma";

const provider = new Elysia({})
  .decorate("db", db)
  .use(
    oauth2(
      {
        Google: [
          "368826759806-rglob2arlkv1cfiqbg99bocltqsgbkjs.apps.googleusercontent.com",
          "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",
          `${process.env.API_URL}/auth/google/callback`,
        ],
      },
      {
        cookie: {
          name: "token",
          secure: true,
          sameSite: "lax",
          path: "/",
          httpOnly: true,
          maxAge: 60 * 30, // 30 min
        },
      },
    ),
  )
  .get(
    "/auth/google",
    async ({ oauth2, redirect }: { oauth2: any; redirect: any }) => {
      const url = oauth2.createURL("Google", ["email"]);
      url.searchParams.set("access_type", "offline");

      return redirect(url.href);
    },
  )
  .get(
    "/auth/google/callback",
    async ({
      oauth2,
      db,
      cookie: { token },
      redirect,
    }: Context & { db: PrismaClient; oauth2: any }) => {
      const tokens = await oauth2.authorize("Google");

      const accessToken = tokens.accessToken();

      const userInfo = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ).then((res) => res.json());

      const { email, name, id: googleId } = userInfo;

      const alias = email.split("@")[0];

      const user = await db.user.upsert({
        where: { email },
        update: { name },
        create: {
          email,
          name,
          connections: {
            create: {
              providerName: "google",
              providerId: googleId,
            },
          },
          aliases: {
            create: {
              alias,
              email: {
                create: {
                  address: email,
                },
              },
            },
          },
          // subscription: {
          //   create: {},
          // },
        },
      });

      const appToken = sign(
        {
          sub: user.id,
          email: user.email,
          provider: "google",
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: "30d",
        },
      );

      token.set({
        domain: 'localhost',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: true,
        value: appToken,
      });

      return redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/`);
    },
  );

export default provider;
