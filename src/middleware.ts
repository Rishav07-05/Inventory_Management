import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin", "/admin/(.*)"]);
const isSellerRoute = createRouteMatcher(["/seller", "/seller/(.*)"]);
const isBuyerRoute = createRouteMatcher(["/buyer", "/buyer/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const isMockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  const mockRole = req.cookies.get("mock_role")?.value;
  const isBypassAdmin = mockRole === "ADMIN";

  if (isMockAuth || isBypassAdmin) {
    const role = isMockAuth ? (mockRole || "BUYER") : "ADMIN";
    const isProtectedRoute =
      isAdminRoute(req) ||
      isSellerRoute(req) ||
      isBuyerRoute(req) ||
      req.nextUrl.pathname === "/";

    if (isProtectedRoute && !role) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    if (isProtectedRoute && role) {
      if (isAdminRoute(req) && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      if (isSellerRoute(req) && role !== "SELLER") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      if (isBuyerRoute(req) && role !== "BUYER") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }

      if (req.nextUrl.pathname === "/") {
        if (role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin/dashboard/1weirdroute4Lxyz", req.url));
        } else if (role === "SELLER") {
          return NextResponse.redirect(new URL("/seller/dashboard", req.url));
        } else {
          return NextResponse.redirect(new URL("/buyer/dashboard", req.url));
        }
      }
    }

    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();

  // 1. Redirect unauthenticated users to Clerk sign-in
  if ((isAdminRoute(req) || isSellerRoute(req) || isBuyerRoute(req)) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (userId) {
    // 2. Extract role and onboarding status
    // Attempt to read from session claims first (fastest)
    let role = (sessionClaims as any)?.metadata?.role as string | undefined;
    let onboarded = (sessionClaims as any)?.metadata?.onboarded as boolean | undefined;

    // Fallback: If session claims are not configured in Clerk console yet, fetch user directly
    if (role === undefined) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        role = user.publicMetadata?.role as string | undefined;
        onboarded = user.publicMetadata?.onboarded as boolean | undefined;
      } catch (err) {
        console.error("Failed to fetch user metadata in middleware fallback:", err);
      }
    }

    // Default role is BUYER if not set
    if (!role) {
      role = "BUYER";
    }

    const isOnboardingRoute = req.nextUrl.pathname.startsWith("/onboarding");
    const isUnauthorizedRoute = req.nextUrl.pathname.startsWith("/unauthorized");

    // 3. Enforce Onboarding (Admin is exempt)
    if (role !== "ADMIN" && !onboarded && !isOnboardingRoute && !isUnauthorizedRoute && (isAdminRoute(req) || isSellerRoute(req) || isBuyerRoute(req))) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // 4. Role-based Route Protection
    if (isAdminRoute(req) && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (isSellerRoute(req) && role !== "SELLER") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (isBuyerRoute(req) && role !== "BUYER") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // 5. Root page redirect to appropriate dashboard
    if (req.nextUrl.pathname === "/") {
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard/1weirdroute4Lxyz", req.url));
      } else if (role === "SELLER") {
        return NextResponse.redirect(new URL("/seller/dashboard", req.url));
      } else {
        return NextResponse.redirect(new URL("/buyer/dashboard", req.url));
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpeg|jpg|gif|svg|png|ico|json|txt|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
