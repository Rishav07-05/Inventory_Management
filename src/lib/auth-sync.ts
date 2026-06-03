import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";

export interface SyncResult {
  dbUser: {
    id: string;
    clerkId: string;
    email: string;
    name: string | null;
    role: Role;
  } | null;
  needsOnboarding: boolean;
}

export async function syncAuthUser(): Promise<SyncResult> {
  let clerkUser: any = null;

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
    const cookieStore = await cookies();
    const role = cookieStore.get("mock_role")?.value || "BUYER";
    const email = `mock_${role.toLowerCase()}@example.com`;
    clerkUser = {
      id: `mock_${role.toLowerCase()}_clerk_id`,
      firstName: "Mock",
      lastName: role,
      emailAddresses: [{ emailAddress: email }],
      publicMetadata: {
        role,
        onboarded: true,
      },
    };
  } else {
    clerkUser = await currentUser();
  }
  
  if (!clerkUser) {
    return { dbUser: null, needsOnboarding: false };
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Clerk user has no email address.");
  }

  // Check if user exists in PostgreSQL
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  const isMockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  const mockRole = clerkUser.publicMetadata?.role as string | undefined;
  const isSystemAdmin = isMockAuth
    ? mockRole === "ADMIN"
    : email.toLowerCase() === adminEmail?.toLowerCase();

  let targetRole: Role = Role.BUYER;
  if (isMockAuth) {
    if (mockRole === "ADMIN") {
      targetRole = Role.ADMIN;
    } else if (mockRole === "SELLER") {
      targetRole = Role.SELLER;
    } else {
      targetRole = Role.BUYER;
    }
  } else {
    targetRole = isSystemAdmin ? Role.ADMIN : Role.BUYER;
  }
  let userCreatedOrUpdated = false;

  if (!dbUser) {
    // Check if a user with this email already exists but doesn't have a clerkId (unlikely, but safe)
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      dbUser = await prisma.user.update({
        where: { email },
        data: { clerkId: clerkUser.id },
      });
      targetRole = dbUser.role;
    } else {
      // Create user
      dbUser = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: email,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
          role: targetRole,
        },
      });
      userCreatedOrUpdated = true;
    }
  } else {
    // If database user exists, check if they should be auto-elevated to ADMIN
    if (!isMockAuth && isSystemAdmin && dbUser.role !== Role.ADMIN) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: Role.ADMIN },
      });
    }
    if (isMockAuth && dbUser.role !== targetRole) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: targetRole },
      });
    }
    targetRole = dbUser.role;
  }

  // Update Clerk publicMetadata if it is out of sync (skip if mock mode)
  const currentClerkRole = clerkUser.publicMetadata?.role as string | undefined;
  if (process.env.NEXT_PUBLIC_MOCK_AUTH !== "true" && currentClerkRole !== targetRole) {
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: {
          role: targetRole,
        },
      });
    } catch (err) {
      console.error("Failed to update Clerk publicMetadata role:", err);
    }
  }

  // If user is not admin, and role is BUYER, and they haven't explicitly set their role choice (onboarded),
  // we might want to let them onboard to SELLER if they want.
  // We will determine onboarding status: if they are BUYER but haven't explicitly decided,
  // we can show a prompt. Let's make an onboarding path.
  // We can track onboarding by checking if user role in clerk public metadata onboarding is completed.
  const onboarded = clerkUser.publicMetadata?.onboarded === true;
  const needsOnboarding = !isSystemAdmin && !onboarded;

  return {
    dbUser,
    needsOnboarding,
  };
}
