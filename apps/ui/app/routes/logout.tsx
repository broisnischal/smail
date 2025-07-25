import { redirect } from "react-router";


export async function action() {
    return redirect('/', {
        headers: {
            "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure"
        }
    })
}