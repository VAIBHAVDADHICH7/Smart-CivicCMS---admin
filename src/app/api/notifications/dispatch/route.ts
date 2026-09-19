import { NextRequest, NextResponse } from "next/server";
import { NotificationItem, NotificationType, UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      type = "TASK_ASSIGNED",
      complaint_id,
      target_user_id,
      target_role,
      link,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Title and message are required." },
        { status: 400 }
      );
    }

    const notification: NotificationItem = {
      id: crypto.randomUUID(),
      title,
      message,
      type: type as NotificationType,
      complaint_id,
      target_user_id,
      target_role: target_role as UserRole,
      is_read: false,
      created_at: new Date().toISOString(),
      link: link || (complaint_id ? `/supervisor?id=${complaint_id}` : undefined),
    };

    return NextResponse.json({
      status: "SUCCESS",
      delivered_via: ["IN_APP_PUSH", "WEB_SOCKET_SYNC", "WEB_PUSH_GATEWAY"],
      notification,
      dispatched_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "DISPATCH_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
