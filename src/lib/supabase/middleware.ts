import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run this on public static assets
  // Refresh session if expired - this is required for Server Components to read current auth state correctly
  const { data: { user } } = await supabase.auth.getUser();

  // If user is accessing a protected page and is not logged in, redirect them
  const url = request.nextUrl.clone();
  const isAuthPage = url.pathname.startsWith('/login') || url.pathname.startsWith('/register');
  const isPublicPage = url.pathname === '/' || isAuthPage;

  if (!user && !isPublicPage) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    url.pathname = '/chart';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
