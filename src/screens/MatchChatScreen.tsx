import React from "react";
import {
  FlatList,
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
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { MatchChatMessageDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail, getCurrentUserName } from "../store";
import { COLORS } from "../theme/colors";

function MatchChatSkeleton() {
  return (
    <View style={styles.container}>
      <View style={{ padding: 16 }}>
        <SkeletonBlock height={24} width="35%" rounded={8} />
        <View style={{ height: 12 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={{
              alignSelf: i % 2 ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
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

export function MatchChatScreen({
  route,
}: {
  route: { params: { matchId: string } };
}) {
  const USER_EMAIL = getCurrentUserEmail();
  const USER_NAME = getCurrentUserName();
  const matchId = route.params.matchId;
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
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
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
      setText("");
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (nearBottomRef.current) listRef.current?.scrollToEnd({ animated: true });
        }}
        renderItem={({ item }) => {
          const mine = item.senderEmail === USER_EMAIL;
          return (
            <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
              <View style={[styles.messageWrap, mine ? styles.messageWrapMine : styles.messageWrapOther]}>
                <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
                  <Text style={[styles.bubbleText, mine && { color: COLORS.card }]}>
                    {item.text}
                  </Text>
                </View>
                <View style={[styles.metaRow, mine && styles.metaRowMine]}>
                  <Text style={styles.metaText}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {mine ? <MessageReceipt status={item.status} /> : null}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No chat messages yet.</Text>
        }
      />

      <View style={styles.liveMetaRow}>
        {!!typingLabel && <Text style={styles.typingText}>{typingLabel}</Text>}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message players..."
          placeholderTextColor={COLORS.iconMuted}
          style={styles.input}
          onBlur={() => {
            if (isTypingRef.current) {
              emitTyping(false);
              isTypingRef.current = false;
            }
          }}
        />
        <Pressable
          style={[styles.sendBtn, sending && { opacity: 0.65 }]}
          onPress={send}
          disabled={sending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageReceipt({ status }: { status?: MatchChatMessageDto["status"] }) {
  if (status === "read") {
    return <Ionicons name="checkmark-done" size={14} color={COLORS.primary} style={styles.metaTick} />;
  }
  if (status === "delivered") {
    return <Ionicons name="checkmark-done" size={14} color={COLORS.textMuted} style={styles.metaTick} />;
  }
  return <Ionicons name="checkmark" size={14} color={COLORS.textMuted} style={styles.metaTick} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { marginBottom: 8, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  messageWrap: { maxWidth: "78%" },
  messageWrapMine: { alignItems: "flex-end" },
  messageWrapOther: { alignItems: "flex-start" },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  mine: { backgroundColor: COLORS.primary },
  other: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { color: COLORS.text, fontSize: 14 },
  metaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  metaRowMine: { alignSelf: "flex-end" },
  metaText: { fontSize: 10, color: COLORS.textMuted },
  metaTick: { marginTop: 0.5 },
  liveMetaRow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 58,
    alignItems: "flex-start",
  },
  typingText: { fontSize: 11, color: COLORS.primary, fontWeight: "700" },
  inputRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: COLORS.card, fontWeight: "700" },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 24 },
});

