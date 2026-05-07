import React from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { MatchChatMessageDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail, getCurrentUserName } from "../store";
import { COLORS } from "../theme/colors";

function MatchChatSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.matchChatSkeletonPad}>
        <SkeletonBlock height={24} width="35%" rounded={8} />
        <View style={styles.matchChatSkeletonGap} />
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.matchChatSkeletonBubbleWrap,
              i % 2 ? styles.matchChatSkeletonBubbleRight : styles.matchChatSkeletonBubbleLeft,
            ]}
          >
            <SkeletonBlock
              height={34}
              width={i % 2 ? 180 : 210}
              rounded={12}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SenderAvatar({ uri, label }: { uri?: string | null; label: string }) {
  const initial = (label || "?").trim().charAt(0).toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={styles.avatarImg}
        accessibilityLabel={label}
        accessibilityRole="image"
      />
    );
  }
  return (
    <View style={[styles.avatarImg, styles.avatarPlaceholder]} accessibilityRole="image" accessibilityLabel={label}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}

const SENDER_NAME_PALETTE = [
  "#06CF9C",
  "#53BDEB",
  "#7B68EE",
  "#FF6B9D",
  "#FFA726",
  "#AB47BC",
  "#29B6F6",
  "#E74C3C",
];

function senderBubbleAccent(email: string): string {
  const e = email.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < e.length; i++) {
    h = (h + e.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return SENDER_NAME_PALETTE[Math.abs(h) % SENDER_NAME_PALETTE.length];
}

function ReplyQuotePreview({
  excerpt,
  senderSnapshot,
  senderEmailForAccent,
  mine,
}: {
  excerpt?: string | null;
  senderSnapshot?: string | null;
  senderEmailForAccent?: string | null;
  mine?: boolean;
}) {
  if (!excerpt?.trim()) return null;
  const bar = senderEmailForAccent ? senderBubbleAccent(senderEmailForAccent) : COLORS.primary;
  return (
    <View
      style={[
        styles.quoteBox,
        mine ? styles.quoteBoxMineWa : styles.quoteBoxInWa,
        { borderLeftColor: bar },
      ]}
    >
      <Text
        style={[styles.quoteSender, mine ? styles.quoteSenderMineWa : { color: bar }]}
        numberOfLines={1}
      >
        {senderSnapshot?.trim() || "Message"}
      </Text>
      <Text style={[styles.quoteExcerpt, mine ? styles.quoteExcerptMineWa : styles.quoteExcerptInWa]} numberOfLines={2}>
        {excerpt.trim()}
      </Text>
    </View>
  );
}

export function MatchChatScreen({
  route,
}: {
  route: { params: { matchId: string } };
}) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const USER_EMAIL = getCurrentUserEmail();
  const USER_NAME = getCurrentUserName();
  const matchId = route.params.matchId;
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [composerHeight, setComposerHeight] = React.useState(36);
  const [replyTarget, setReplyTarget] = React.useState<MatchChatMessageDto | null>(null);
  const [messages, setMessages] = React.useState<MatchChatMessageDto[]>([]);
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const listRef = React.useRef<FlatList<MatchChatMessageDto>>(null);
  const nearBottomRef = React.useRef(true);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = React.useRef(false);
  const typingUsersTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      const res = await api.get<MatchChatMessageDto[]>(
        `/matches/${matchId}/chat-messages?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      setMessages(res);
    } catch {
      setMessages([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [USER_EMAIL, matchId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const markRead = React.useCallback(async () => {
    if (!USER_EMAIL) return;
    await api.post(`/matches/${matchId}/chat-read`, { email: USER_EMAIL });
  }, [USER_EMAIL, matchId]);

  const emitTyping = React.useCallback(
    (isTyping: boolean) => {
      const socket = getSocket(USER_EMAIL);
      if (!socket) return;
      socket.emit("typing:match", {
        matchId,
        senderEmail: USER_EMAIL,
        senderName: USER_NAME,
        isTyping,
      });
    },
    [USER_EMAIL, USER_NAME, matchId],
  );

  React.useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      if (isTypingRef.current) {
        emitTyping(false);
        isTypingRef.current = false;
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      return;
    }
    if (!isTypingRef.current) {
      emitTyping(true);
      isTypingRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitTyping(false);
      isTypingRef.current = false;
      typingTimerRef.current = null;
    }, 1200);
  }, [text, emitTyping]);

  React.useEffect(() => {
    const socket = getSocket(USER_EMAIL);
    if (!socket) return;
    const typingUsersTimers = typingUsersTimersRef.current;
    socket.emit("join:match", matchId);
    const onIncoming = (payload: MatchChatMessageDto & { matchId?: string }) => {
      if (payload?.matchId && payload.matchId !== matchId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
      markRead().catch(() => undefined);
      if (nearBottomRef.current) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 20);
      }
    };
    const onReceipt = (payload: {
      matchId?: string;
      messageIds?: string[];
      status?: "delivered" | "read";
      at?: string;
    }) => {
      if (payload?.matchId !== matchId) return;
      const ids = new Set(payload.messageIds || []);
      if (!ids.size || !payload.status) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (!ids.has(m.id)) return m;
          if (payload.status === "read") {
            return { ...m, status: "read", readAt: payload.at || m.readAt || null };
          }
          if (m.status === "read") return m;
          return { ...m, status: "delivered", deliveredAt: payload.at || m.deliveredAt || null };
        }),
      );
    };
    const onTyping = (payload: {
      matchId?: string;
      senderEmail?: string;
      senderName?: string;
      isTyping?: boolean;
    }) => {
      if (payload?.matchId !== matchId) return;
      const senderEmail = String(payload.senderEmail || "");
      if (!senderEmail || senderEmail === USER_EMAIL) return;
      const senderName = String(payload.senderName || "Someone");

      setTypingUsers((prev) => {
        const set = new Set(prev);
        if (payload.isTyping) set.add(senderName);
        else set.delete(senderName);
        return Array.from(set);
      });

      const existing = typingUsersTimers.get(senderEmail);
      if (existing) clearTimeout(existing);
      if (payload.isTyping) {
        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((name) => name !== senderName));
          typingUsersTimers.delete(senderEmail);
        }, 1800);
        typingUsersTimers.set(senderEmail, timer);
      } else {
        typingUsersTimers.delete(senderEmail);
      }
    };
    socket.on("match:message", onIncoming);
    socket.on("match:receipt", onReceipt);
    socket.on("typing:match", onTyping);
    markRead().catch(() => undefined);
    return () => {
      socket.emit("leave:match", matchId);
      socket.off("match:message", onIncoming);
      socket.off("match:receipt", onReceipt);
      socket.off("typing:match", onTyping);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTypingRef.current) emitTyping(false);
      for (const timer of typingUsersTimers.values()) clearTimeout(timer);
      typingUsersTimers.clear();
    };
  }, [USER_EMAIL, matchId, emitTyping, markRead]);

  const send = async () => {
    const payload = text.trim();
    if (!payload || sending) return;
    try {
      setSending(true);
      const created = await api.post<MatchChatMessageDto>(`/matches/${matchId}/chat-messages`, {
        senderEmail: USER_EMAIL,
        senderName: USER_NAME,
        text: payload,
        ...(replyTarget?.id ? { replyToId: replyTarget.id } : {}),
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
      setText("");
      setReplyTarget(null);
      if (isTypingRef.current) {
        emitTyping(false);
        isTypingRef.current = false;
      }
      if (nearBottomRef.current) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 20);
      }
    } finally {
      setSending(false);
    }
  };

  const handleScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distanceFromBottom < 120;
  }, []);

  const typingLabel =
    typingUsers.length === 0
      ? ""
      : typingUsers.length === 1
        ? `${typingUsers[0]} typing...`
        : `${typingUsers.length} players typing...`;

  if (loading) return <MatchChatSkeleton />;

  const iosKeyboardOffset =
    headerHeight + Math.min(insets.top, 24) + (insets.bottom > 0 ? 8 : 16) + 22;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? iosKeyboardOffset : 0}
      enabled
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (nearBottomRef.current) listRef.current?.scrollToEnd({ animated: true });
        }}
        renderItem={({ item, index }) => {
          const mine =
            item.senderEmail.trim().toLowerCase() === USER_EMAIL.trim().toLowerCase();
          const prev = index > 0 ? messages[index - 1] : null;
          const sameSenderAsPrev =
            !mine &&
            prev != null &&
            prev.senderEmail.trim().toLowerCase() === item.senderEmail.trim().toLowerCase();
          const sentAt = item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          if (mine) {
            return (
              <View style={[styles.msgOuter, styles.msgOuterMine]}>
                <View style={styles.msgStack}>
                  <Pressable
                    onLongPress={() => setReplyTarget(item)}
                    delayLongPress={380}
                    accessibilityRole="button"
                    accessibilityLabel={`Message: ${item.text}. Long press to reply`}
                  >
                    <View style={[styles.bubble, styles.bubbleMine]}>
                      <ReplyQuotePreview
                        excerpt={item.replyToTextSnapshot}
                        senderSnapshot={item.replyToSenderSnapshot}
                        senderEmailForAccent={item.replyToSenderEmail}
                        mine
                      />
                      <Text style={[styles.bubbleText, styles.bubbleTextMine]}>{item.text}</Text>
                      <View style={[styles.meta, styles.metaInBubbleMine]}>
                        <Text style={[styles.messageTime, styles.messageTimeInBubble]}>{sentAt}</Text>
                        <MessageReceipt status={item.status} onOrangeBubble />
                      </View>
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          }

          const showSenderHeader = !sameSenderAsPrev;
          const accent = senderBubbleAccent(item.senderEmail);

          return (
            <View style={styles.otherRow}>
              <View style={styles.otherAvatarGutter}>
                {showSenderHeader ? (
                  <SenderAvatar uri={item.senderPhotoUrl} label={item.senderName} />
                ) : (
                  <View style={styles.avatarGutterPlaceholder} />
                )}
              </View>
              <View style={styles.otherMsgColumn}>
                <Pressable
                  onLongPress={() => setReplyTarget(item)}
                  delayLongPress={380}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.senderName}: ${item.text}. Long press to reply`}
                >
                  <View style={[styles.bubble, styles.bubbleOther]}>
                    {showSenderHeader ? (
                      <Text style={[styles.bubbleSenderName, { color: accent }]} numberOfLines={1}>
                        {item.senderName}
                      </Text>
                    ) : null}
                    <ReplyQuotePreview
                      excerpt={item.replyToTextSnapshot}
                      senderSnapshot={item.replyToSenderSnapshot}
                      senderEmailForAccent={item.replyToSenderEmail}
                    />
                    <Text style={styles.bubbleText}>{item.text}</Text>
                    <View style={[styles.meta, styles.metaInBubbleOther]}>
                      <Text style={styles.messageTime}>{sentAt}</Text>
                      <MessageReceipt status={item.status} onOrangeBubble={false} />
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No chat messages yet.</Text>
        }
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {typingLabel ? (
          <View style={styles.liveMetaRow}>
            <Text style={styles.typingText}>{typingLabel}</Text>
          </View>
        ) : null}
        {replyTarget ? (
          <View style={styles.replyBanner}>
            <View
              style={[
                styles.replyBannerAccent,
                { backgroundColor: senderBubbleAccent(replyTarget.senderEmail) },
              ]}
            />
            <View style={styles.replyBannerBody}>
              <Text style={styles.replyBannerTitle} numberOfLines={1}>
                Replying to {replyTarget.senderName}
              </Text>
              <Text style={styles.replyBannerPreview} numberOfLines={2}>
                {replyTarget.text}
              </Text>
            </View>
            <Pressable
              onPress={() => setReplyTarget(null)}
              hitSlop={12}
              style={styles.replyBannerClose}
              accessibilityLabel="Cancel reply"
            >
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message players..."
            placeholderTextColor={COLORS.iconMuted}
            style={[styles.input, { height: Math.min(88, Math.max(36, composerHeight)) }]}
            multiline
            textAlignVertical="top"
            onContentSizeChange={(e) =>
              setComposerHeight(e.nativeEvent.contentSize.height + 10)
            }
            onBlur={() => {
              if (isTypingRef.current) {
                emitTyping(false);
                isTypingRef.current = false;
              }
            }}
          />
          <Pressable
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={send}
            disabled={sending}
            accessibilityLabel="Send message"
          >
            <Ionicons name="paper-plane" size={18} color={COLORS.card} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageReceipt({
  status,
  onOrangeBubble,
}: {
  status?: MatchChatMessageDto["status"];
  onOrangeBubble?: boolean;
}) {
  const onOrange = onOrangeBubble === true;
  const tickColor = onOrange ? "rgba(255,255,255,0.9)" : "#5A6A78";
  const readColor = onOrange ? "#E0F2FE" : COLORS.primary;
  const iconSize = 16;
  if (status === "read") {
    return (
      <Ionicons name="checkmark-done" size={iconSize} color={readColor} style={styles.messageTick} />
    );
  }
  if (status === "delivered") {
    return (
      <Ionicons name="checkmark-done" size={iconSize} color={tickColor} style={styles.messageTick} />
    );
  }
  return <Ionicons name="checkmark" size={iconSize} color={tickColor} style={styles.messageTick} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  list: { flex: 1, backgroundColor: COLORS.bg },
  listContent: { paddingHorizontal: 10, paddingVertical: 8, paddingBottom: 12 },
  msgOuter: { marginBottom: 4, flexDirection: "row", width: "100%" },
  msgOuterMine: { justifyContent: "flex-end", marginBottom: 4 },
  otherRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginBottom: 4,
    width: "100%",
  },
  otherAvatarGutter: {
    width: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  avatarGutterPlaceholder: { width: 40, height: 1 },
  otherMsgColumn: {
    flexShrink: 1,
    maxWidth: "82%",
    alignItems: "flex-start",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DADCDE",
    overflow: "hidden",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DADCDE",
  },
  avatarInitial: { fontSize: 17, fontWeight: "600", color: "#54656F" },
  msgStack: { maxWidth: "82%", alignItems: "flex-end", flexGrow: 0, flexShrink: 1 },
  bubbleSenderName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 2,
  },
  quoteBox: {
    marginBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 7,
    borderLeftWidth: 4,
    borderRadius: 4,
  },
  quoteBoxInWa: {
    backgroundColor: COLORS.bg,
  },
  quoteBoxMineWa: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  quoteSender: {
    fontSize: 13,
    fontWeight: "700",
  },
  quoteSenderMineWa: {
    color: COLORS.card,
  },
  quoteExcerptInWa: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  quoteExcerptMineWa: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    lineHeight: 18,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingLeft: 0,
    paddingRight: 6,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  replyBannerAccent: {
    width: 4,
    alignSelf: "stretch",
    minHeight: 44,
  },
  replyBannerBody: { flex: 1, minWidth: 0, paddingLeft: 10, paddingRight: 4 },
  replyBannerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  replyBannerPreview: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  replyBannerClose: { padding: 6 },
  bubble: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 6,
    maxWidth: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.12,
        shadowRadius: 1.2,
      },
      default: { elevation: 1 },
    }),
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: COLORS.card,
    alignSelf: "flex-start",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  bubbleText: { color: COLORS.text, fontSize: 16.2, lineHeight: 21 },
  bubbleTextMine: { color: COLORS.card },
  meta: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 0,
  },
  metaInBubbleMine: {
    marginTop: 4,
    justifyContent: "flex-end",
    paddingHorizontal: 0,
  },
  metaInBubbleOther: {
    marginTop: 4,
    justifyContent: "flex-end",
    paddingHorizontal: 0,
  },
  messageTime: { fontSize: 11, color: COLORS.textSoft, fontWeight: "500" },
  messageTimeInBubble: { fontSize: 11, color: "rgba(255,255,255,0.92)", fontWeight: "500" },
  messageTick: { marginTop: -1 },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 0,
  },
  liveMetaRow: { paddingBottom: 4, paddingLeft: 4 },
  typingText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  inputRow: {
    paddingTop: 0,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    minHeight: 44,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.55 },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 24, fontSize: 15 },
  matchChatSkeletonPad: { padding: 16 },
  matchChatSkeletonGap: { height: 12 },
  matchChatSkeletonBubbleWrap: { marginBottom: 8 },
  matchChatSkeletonBubbleLeft: { alignSelf: "flex-start" },
  matchChatSkeletonBubbleRight: { alignSelf: "flex-end" },
});

