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
  return redirect("http://localhost:3000/auth/google");
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
          <Form method="post">
            <Button className="cursor-pointer" type="submit">Sign In with Google</Button>
          </Form>
        )
      }


    </div>
  )
}