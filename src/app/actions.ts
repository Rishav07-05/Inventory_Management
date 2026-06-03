"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function mockAdminSignIn(email: string, password: string) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH !== "true") {
    throw new Error("Mock authentication is disabled.");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminEmail || !adminPass) {
    throw new Error("Admin credentials are not configured.");
  }

  const isValidEmail = email.trim().toLowerCase() === adminEmail.toLowerCase();
  const isValidPassword = password === adminPass;

  if (!isValidEmail || !isValidPassword) {
    throw new Error("Invalid admin credentials.");
  }

  const cookieStore = await cookies();
  cookieStore.set("mock_role", "ADMIN", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return { success: true };
}

export async function completeOnboarding(selectedRole: "BUYER" | "SELLER") {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Update DB User
  const dbUser = await prisma.user.update({
    where: { clerkId: userId },
    data: { role: selectedRole },
  });

  // Write audit log for role change
  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: "ROLE_CHANGE",
      targetType: "USER",
      targetId: dbUser.id,
      previousValue: "BUYER (default)",
      newValue: selectedRole,
    },
  });

  // Update Clerk publicMetadata
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: selectedRole,
      onboarded: true,
    },
  });

  revalidatePath("/");
  return { success: true, role: selectedRole };
}
