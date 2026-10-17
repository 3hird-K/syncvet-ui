import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/backend";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    const supabase = getPublicSupabaseClient();

    // 1. Fetch users from Supabase
    const { data: dbUsers } = await supabase
      .from("users")
      .select("id, updated_at, created_at");

    const dbUserMap = new Map<string, string>();
    if (dbUsers) {
      for (const u of dbUsers) {
        if (u.id && u.updated_at) {
          dbUserMap.set(u.id, u.updated_at);
        }
      }
    }

    // 2. Fetch users from Clerk if secretKey is available
    let clerkUsers: any[] = [];
    if (secretKey) {
      try {
        const clerk = createClerkClient({ secretKey });
        const list = await clerk.users.getUserList({ limit: 100 });
        clerkUsers = list.data || [];
      } catch (e) {
        console.error("Error fetching Clerk users:", e);
      }
    }

    const now = Date.now();
    const presence: Record<
      string,
      {
        isActive: boolean;
        statusText: string;
        lastSeenAt: string | null;
        minutesAgo: number | null;
      }
    > = {};

    const evaluateActivity = (
      userId: string,
      lastActiveMs: number | null,
      fallbackDateStr: string | null
    ) => {
      let effectiveMs = lastActiveMs || 0;
      if (fallbackDateStr) {
        const fallbackMs = new Date(fallbackDateStr).getTime();
        if (!isNaN(fallbackMs) && fallbackMs > effectiveMs) {
          effectiveMs = fallbackMs;
        }
      }

      if (!effectiveMs) {
        return {
          isActive: false,
          statusText: "Offline",
          lastSeenAt: null,
          minutesAgo: null,
        };
      }

      const diffMs = now - effectiveMs;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      // Active threshold: within 5 minutes
      if (diffMins < 5) {
        return {
          isActive: true,
          statusText: "Active now",
          lastSeenAt: new Date(effectiveMs).toISOString(),
          minutesAgo: diffMins,
        };
      } else if (diffMins < 60) {
        return {
          isActive: false,
          statusText: `Active ${diffMins}m ago`,
          lastSeenAt: new Date(effectiveMs).toISOString(),
          minutesAgo: diffMins,
        };
      } else if (diffHours < 24) {
        return {
          isActive: false,
          statusText: `Active ${diffHours}h ago`,
          lastSeenAt: new Date(effectiveMs).toISOString(),
          minutesAgo: diffMins,
        };
      } else if (diffDays === 1) {
        return {
          isActive: false,
          statusText: "Active yesterday",
          lastSeenAt: new Date(effectiveMs).toISOString(),
          minutesAgo: diffMins,
        };
      } else if (diffDays < 7) {
        return {
          isActive: false,
          statusText: `Active ${diffDays}d ago`,
          lastSeenAt: new Date(effectiveMs).toISOString(),
          minutesAgo: diffMins,
        };
      } else {
        const dateFormatted = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(effectiveMs));
        return {
          isActive: false,
          statusText: `Offline • Last seen ${dateFormatted}`,
          lastSeenAt: new Date(effectiveMs).toISOString(),
          minutesAgo: diffMins,
        };
      }
    };

    // Populate from Clerk
    for (const cu of clerkUsers) {
      const dbDate = dbUserMap.get(cu.id) || null;
      const clerkMs = cu.lastActiveAt
        ? Number(cu.lastActiveAt)
        : cu.lastSignInAt
        ? Number(cu.lastSignInAt)
        : null;
      presence[cu.id] = evaluateActivity(cu.id, clerkMs, dbDate);
    }

    // Populate any remaining db users not in clerkUsers
    if (dbUsers) {
      for (const du of dbUsers) {
        if (!presence[du.id]) {
          presence[du.id] = evaluateActivity(du.id, null, du.updated_at || du.created_at);
        }
      }
    }

    return NextResponse.json(presence);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    if (userId) {
      const supabase = getPublicSupabaseClient();
      await supabase
        .from("users")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
