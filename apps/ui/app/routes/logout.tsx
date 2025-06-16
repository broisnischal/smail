import { redirect } from "react-router";
import type { Route } from "../+types/root";

// export async function loader(
//     { request }: Route.LoaderArgs
// ) {
//     return new Response(null, {
//         status: 302,
//         headers: {
//             "Location": "/",
//             "Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure"
//         },
//     });
// }

export async function action() {
    return redirect('/', {
        headers: {
            "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure"
        }
    })
}