import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renamed Middleware to Proxy (same mechanism, file must be
// proxy.ts at the project root) - see node_modules/next/dist/docs/01-app/
// 01-getting-started/16-proxy.md.
//
// No-ops entirely in dev mode: there's no Supabase session to refresh, and
// the dev-user-id/dev-session cookies (lib/auth/session.ts) don't need it.
export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== "supabase") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshing here (once per navigation) is what makes Server Components -
  // which can't write cookies themselves - see an up-to-date session.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
