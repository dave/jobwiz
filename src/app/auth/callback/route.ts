import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/";

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle PKCE code exchange (OAuth, newer magic links)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery, redirect to update password page
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/update-password", requestUrl.origin));
      }

      // Otherwise redirect to the next page or home
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Handle token_hash verification (magic links, email confirmations)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email' | 'signup' | 'recovery',
    });

    if (!error) {
      // If this is a password recovery, redirect to update password page
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/update-password", requestUrl.origin));
      }

      // Otherwise redirect to the next page or home
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no code/token, redirect to login with error
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_error", requestUrl.origin)
  );
}
