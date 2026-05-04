import type { ConversationDto } from "./types";

/** Row / header title: for DMs always use the other person's email handle, not entityName (avoids showing self). */
export function conversationTitleForViewer(
  conv: Pick<ConversationDto, "type" | "entityName" | "participantEmails">,
  viewerEmail: string,
): string {
  const me = viewerEmail.trim().toLowerCase();
  const other =
    conv.participantEmails?.map((e) => e.trim().toLowerCase()).find((e) => e !== me) || "";
  const handle = other.includes("@") ? other.split("@")[0] : other;
  if (conv.type === "direct" && handle.length > 0) {
    return handle;
  }
  const entity = conv.entityName?.trim();
  if (entity) return entity;
  if (handle.length > 0) return handle;
  return "Conversation";
}
