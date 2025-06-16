import { Button } from "~/components/ui/button"

import type { Route } from "./+types/home"
import { Form, redirect } from "react-router"
import { upfetch } from "~/lib/fetch"
import z from 'zod'
import { alias } from "~/schema"

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const res = await upfetch("/me", {
      credentials: "include",
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
      schema: z.object({
        alias: z.array(alias),
        user: z.object({
          name: z.string().nullish(),
          email: z.string(),
        })
      })
    });

    console.log(res)

    return res
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function action() {
  // Use CLIENT_URL from environment for OAuth redirects
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const baseUrl = clientUrl.replace(/\/$/, ''); // Remove trailing slash if present

  return redirect(`${baseUrl}/api/auth/google`);
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">


      {
        loaderData ? <div>
          <p>Hi {loaderData.user.email}</p>

          {loaderData.alias.map((a) => (
            <div>
              <p>{a.alias}</p>
              <p>{a.emailCount}</p>
              <p>{a.email.map((e) => e.address).join(", ")}</p>
            </div>
          ))}

          <Form method="post" action="/logout">
            <Button className="cursor-pointer" type="submit">Sign Out</Button>
          </Form>
        </div> : (
          <Form method="post" navigate={true}>
            <Button className="cursor-pointer" type="submit">Sign In with Google</Button>
          </Form>
        )
      }


    </div>
  )
}