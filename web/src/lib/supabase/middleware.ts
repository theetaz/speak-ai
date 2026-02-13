import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password");
  const isResetRoute = request.nextUrl.pathname.startsWith("/reset-password");
  const isCallbackRoute = request.nextUrl.pathname.startsWith("/auth/callback");
  const isCronRoute = request.nextUrl.pathname.startsWith("/api/cron/");

  if (isCronRoute) return response;

  if (user && (isAuthRoute || request.nextUrl.pathname === "/")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!user && !isAuthRoute && !isResetRoute && !isCallbackRoute && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
