import { Button } from "~/components/ui/button"
import { Toaster, toast } from 'sonner'

import { Copy, Edit, Forward, Trash, Trash2 } from "lucide-react"
import { Form, redirect } from "react-router"
import z from 'zod'
import { Badge } from "~/components/ui/badge"
import { Card, CardContent } from "~/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { upfetch } from "~/lib/fetch"
import { alias } from "~/schema"
import type { Route } from "./+types/home"
import { Switch } from "~/components/ui/switch"
import { Input } from "~/components/ui/input"

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

export async function action({ request }: Route.ActionArgs) {

  const formData = await request.formData();

  console.log(formData)

  if (formData.get("_action") === "login") {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const baseUrl = clientUrl.replace(/\/$/, '');

    return redirect(`${baseUrl}/api/auth/google`);
  }


  if (formData.get('_action') === 'logout') {
    return redirect('/', {
      headers: {
        "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure"
      }
    })
  }

  if (formData.get("_action") === "addAlias") {
    try {
      const alias = formData.get("alias") as string;

      const response = await upfetch("/alias", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cookie": request.headers.get("Cookie") || "",
        },
        body: JSON.stringify({
          alias
        }),
      });

      // If successful, redirect to refresh the page
      return redirect('/');

    } catch (error: any) {
      console.error(error);

      // Extract error message from the response
      let errorMessage = "Failed to add alias";

      if (error.data) {
        errorMessage = error.data;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { error: errorMessage };
    }
  }

  if (formData.get("_action") === "deleteAlias") {
    const id = formData.get("id") as string;
    const response = await upfetch(`/alias/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("Cookie") || "",
      },
    });

    // If successful, redirect to refresh the page
    return redirect('/');
  }

  if (formData.get("_action") === "toggleStatus") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    const response = await upfetch(`/alias/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("Cookie") || "",
      },
      body: JSON.stringify({
        isActive: status.toLowerCase() === 'true'
      }),
    });

    // If successful, redirect to refresh the page
    return redirect('/');
  }

  return null;

}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-svh container  p-10">
      <Toaster />


      {actionData?.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">Error: {actionData.error}</p>
        </div>
      )}

      {
        loaderData ? <div>

          <div>
            <div className="w-full ">
              <div className="container w-full py-8">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-zinc-600 rounded-lg">
                      <Forward className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Snehaa Mail</h1>
                  </div>
                  <p className="text-gray-600">Manage your email aliases and forwarding rules</p>
                  <Form method="post" >
                    <input type="hidden" name="_action" value="logout" />

                    <Button size={"sm"} className="cursor-pointer my-2" type="submit">Sign Out</Button>
                  </Form>

                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 ">
                  {loaderData.alias.map((alias) => (
                    <Card key={alias.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{alias.alias}</h3>
                              <Badge variant={alias.isActive ? "default" : "secondary"}>
                                {alias.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Form method="post" >
                                <input type="hidden" name="_action" value="toggleStatus" />
                                <input type="hidden" name="id" value={alias.id} />
                                <input type="hidden" name="status" value={String(alias.isActive)} />
                                <Switch type="submit" checked={alias.isActive} className="" onClick={(e) => e.stopPropagation()} />
                              </Form>
                              <Button variant="ghost" size="sm" onClick={() => {
                                navigator.clipboard.writeText(`${alias.alias}@${alias.domain}`)
                                toast('Copied to clipboard')
                                // alert("Copied to clipboard")
                              }}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Forwards to:</span> {alias.email[0]?.address}
                            </p>
                            {/* {alias.description && <p className="text-sm text-gray-500 mb-2">{alias.description}</p>} */}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{alias.emailCount} emails forwarded</span>
                              <span>Created {alias.createdAt}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Form method="POST">
                              <input type="hidden" name="_action" value="deleteAlias" />
                              <input type="hidden" name="id" value={alias.id} />
                              <Button variant="ghost" size="sm" type="submit">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </Form>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>


          <Form method="POST" className="flex gap-2 mb-8">
            <Input name="alias" type="text" placeholder="Alias" className="w-fit" />
            <input type="hidden" name="_action" value="addAlias" />
            <Button className="cursor-pointer" variant={"outline"} type="submit">Add Alias</Button>
          </Form>




        </div> : (
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Welcome to Broisnees Mail</h1>
            <Form method="post" navigate={true}>
              <input type="hidden" name="_action" value="login" />

              <Button className="cursor-pointer" type="submit">Sign In with Google</Button>
            </Form>
          </div>
        )
      }


    </div>
  )
}