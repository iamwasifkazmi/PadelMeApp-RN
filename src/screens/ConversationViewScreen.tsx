import React from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { ConversationDto, MessageDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail, getCurrentUserName } from "../store";
import { conversationTitleForViewer } from "../lib/conversationDisplay";
import { COLORS } from "../theme/colors";

function ConversationSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.conversationSkeletonWrap}>
        <View style={styles.conversationBubbleLeft}>
          <SkeletonBlock height={14} width={120} rounded={8} />
          <View style={styles.skeletonGapXs} />
          <SkeletonBlock height={12} width={96} rounded={8} />
        </View>
        <View style={styles.conversationBubbleRight}>
          <SkeletonBlock height={14} width={140} rounded={8} />
          <View style={styles.skeletonGapXs} />
          <SkeletonBlock height={12} width={84} rounded={8} />
        </View>
        <View style={styles.conversationBubbleLeft}>
          <SkeletonBlock height={14} width={100} rounded={8} />
          <View style={styles.skeletonGapXs} />
          <SkeletonBlock height={12} width={76} rounded={8} />
        </View>
      </View>
      <View style={styles.conversationComposerSkeleton}>
        <SkeletonBlock height={36} width="78%" rounded={20} />
        <SkeletonBlock height={36} width={36} rounded={18} />
      </View>
    </View>
  );
}

function HeaderTitle({
  title,
  showPresence,
  online,
}: {
  title: string;
  showPresence: boolean;
  online: boolean;
}) {
  return (
    <View style={styles.headerTitleWrap}>
      <Text numberOfLines={1} style={styles.headerTitleText}>
        {title}
      </Text>
      {showPresence ? (
        <View
          style={[
            styles.presenceDot,
            online ? styles.presenceDotOnline : styles.presenceDotOffline,
          ]}
        />
      ) : null}
    </View>
  );
}

export function ConversationViewScreen({
  route,
}: {
  route: { params: { id: string } };
}) {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useSnackbar();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const USER_EMAIL = getCurrentUserEmail();
  const USER_NAME = getCurrentUserName();
  const id = route.params.id;
  const [loading, setLoading] = React.useState(true);
  const [messages, setMessages] = React.useState<MessageDto[]>([]);
  const [conversation, setConversation] = React.useState<ConversationDto | null>(null);
  const [onlineEmails, setOnlineEmails] = React.useState<string[]>([]);
  const [isPeerTyping, setIsPeerTyping] = React.useState(false);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [composerHeight, setComposerHeight] = React.useState(36);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const listRef = React.useRef<FlatList<MessageDto>>(null);
  const nearBottomRef = React.useRef(true);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = React.useRef(false);

  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    });
    return () => sub.remove();
  }, []);

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      setAccessDenied(false);
      const res = await api.get<MessageDto[]>(
        `/conversations/${id}/messages?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      setMessages(res);
    } catch (e) {
      setMessages([]);
      if (!silent) {
        const msg = e instanceof Error ? e.message : String(e);
        const low = msg.toLowerCase();
        if (low.includes("friend") || low.includes("403")) {
          setAccessDenied(true);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, USER_EMAIL]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    api
      .get<ConversationDto[]>(`/conversations?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((res) => setConversation(res.find((c) => c.id === id) || null))
      .catch(() => setConversation(null));
  }, [USER_EMAIL, id]);

  React.useEffect(() => {
    api.post(`/conversations/${id}/read`, { email: USER_EMAIL }).catch(() => undefined);
  }, [id, USER_EMAIL]);

  const emitTyping = React.useCallback(
    (isTyping: boolean) => {
      const socket = getSocket(USER_EMAIL);
      if (!socket) return;
      socket.emit("typing:conversation", {
        conversationId: id,
        senderEmail: USER_EMAIL,
        senderName: USER_NAME,
        isTyping,
      });
    },
    [USER_EMAIL, USER_NAME, id],
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
    socket.emit("join:conversation", id);
    const onIncoming = (payload: MessageDto & { conversationId?: string }) => {
      if (payload?.conversationId && payload.conversationId !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
      if (nearBottomRef.current) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 20);
      }
      api.post(`/conversations/${id}/read`, { email: USER_EMAIL }).catch(() => undefined);
    };
    const onTyping = (payload: { conversationId?: string; senderEmail?: string; isTyping?: boolean }) => {
      if (payload?.conversationId !== id) return;
      if (!payload?.senderEmail || payload.senderEmail.trim().toLowerCase() === USER_EMAIL.trim().toLowerCase())
        return;
      setIsPeerTyping(Boolean(payload.isTyping));
      if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
      if (payload.isTyping) {
        peerTypingTimerRef.current = setTimeout(() => {
          setIsPeerTyping(false);
          peerTypingTimerRef.current = null;
        }, 1800);
      }
    };
    const onReceipt = (payload: {
      conversationId?: string;
      messageIds?: string[];
      status?: "delivered" | "read";
      at?: string;
    }) => {
      if (payload?.conversationId !== id) return;
      const ids = new Set(payload.messageIds || []);
      if (ids.size === 0) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (!ids.has(m.id)) return m;
          if (payload.status === "read") {
            return {
              ...m,
              status: "read",
              readAt: payload.at || new Date().toISOString(),
            };
          }
          if (payload.status === "delivered" && m.status !== "read") {
            return {
              ...m,
              status: "delivered",
              deliveredAt: payload.at || new Date().toISOString(),
            };
          }
          return m;
        }),
      );
    };
    const onPresenceSnapshot = (payload: { onlineEmails?: string[] }) => {
      setOnlineEmails((payload.onlineEmails || []).map((e) => e.toLowerCase()));
    };
    const onPresenceUpdate = (payload: { email?: string; isOnline?: boolean }) => {
      const email = String(payload.email || "").toLowerCase();
      if (!email) return;
      setOnlineEmails((prev) => {
        const set = new Set(prev);
        if (payload.isOnline) set.add(email);
        else set.delete(email);
        return Array.from(set);
      });
    };
    socket.on("conversation:message", onIncoming);
    socket.on("conversation:receipt", onReceipt);
    socket.on("typing:conversation", onTyping);
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("presence:update", onPresenceUpdate);
    return () => {
      socket.emit("leave:conversation", id);
      socket.off("conversation:message", onIncoming);
      socket.off("conversation:receipt", onReceipt);
      socket.off("typing:conversation", onTyping);
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("presence:update", onPresenceUpdate);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
      if (isTypingRef.current) emitTyping(false);
    };
  }, [USER_EMAIL, id, emitTyping]);

  const viewerNorm = USER_EMAIL.trim().toLowerCase();
  const otherParticipantEmail =
    conversation?.participantEmails
      ?.map((e) => e.trim().toLowerCase())
      .find((email) => email !== viewerNorm) || "";
  const peerOnline = !!otherParticipantEmail && onlineEmails.includes(otherParticipantEmail);
  const peerTitle = conversation ? conversationTitleForViewer(conversation, USER_EMAIL) : "Conversation";

  const headerTitleRenderer = React.useCallback(
    () => (
      <HeaderTitle
        title={peerTitle}
        showPresence={Boolean(otherParticipantEmail)}
        online={peerOnline}
      />
    ),
    [peerTitle, otherParticipantEmail, peerOnline],
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: headerTitleRenderer,
    });
  }, [navigation, headerTitleRenderer]);

  const send = async () => {
    const payload = text.trim();
    if (!payload || sending) return;
    try {
      setSending(true);
      const created = await api.post<MessageDto>(`/conversations/${id}/messages`, {
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
    } catch {
      showSnackbar("Could not send message.", { type: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottomRef.current = distanceFromBottom < 120;
  }, []);

  if (loading) return <ConversationSkeleton />;

  if (accessDenied) {
    return (
      <View style={styles.accessDeniedWrap}>
        <Ionicons name="people-outline" size={40} color={COLORS.iconMuted} />
        <Text style={styles.accessDeniedTitle}>Messaging is for friends</Text>
        <Text style={styles.accessDeniedMeta}>
          You can only message players on your friends list. Send a friend request first, then chat once they accept.
        </Text>
        <Pressable style={styles.accessDeniedBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.accessDeniedBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  /** Larger offset = more lift (RN subtracts this from keyboard screenY). Header + safe-area nudge + extra for native stack. */
  const iosKeyboardOffset =
    headerHeight + Math.min(insets.top, 24) + (insets.bottom > 0 ? 8 : 16) + 22;
  const composerBottomPad = Platform.OS === "android" ? Math.max(insets.bottom, 8) : 10;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? iosKeyboardOffset : 0}
      enabled={Platform.OS === "ios"}
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
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const mine = item.senderEmail.trim().toLowerCase() === USER_EMAIL.trim().toLowerCase();
          const sentAt = item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return (
            <View style={[styles.msgOuter, mine ? styles.msgOuterMine : styles.msgOuterOther]}>
              <View style={styles.msgStack}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
                  {mine ? (
                    <View style={[styles.meta, styles.metaInBubbleMine]}>
                      <Text style={[styles.messageTime, styles.messageTimeInBubble]}>{sentAt}</Text>
                      <MessageReceipt status={item.status} onOrangeBubble />
                    </View>
                  ) : null}
                </View>
                {!mine ? (
                  <View style={[styles.meta, styles.metaOther]}>
                    <Text style={styles.messageTime}>{sentAt}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
      />

      <View style={[styles.composerWrap, { paddingBottom: composerBottomPad }]}>
        {isPeerTyping ? (
          <View style={styles.liveMetaRow}>
            <Text style={styles.typingText}>Typing...</Text>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { height: Math.min(88, Math.max(36, composerHeight)) }]}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.iconMuted}
            multiline
            textAlignVertical="top"
            onContentSizeChange={(e) => setComposerHeight(e.nativeEvent.contentSize.height + 10)}
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

function MessageReceipt({ status, onOrangeBubble }: { status?: "sent" | "delivered" | "read"; onOrangeBubble?: boolean }) {
  const tickColor = onOrangeBubble ? "rgba(255,255,255,0.78)" : COLORS.textMuted;
  const readColor = onOrangeBubble ? "#E0F2FE" : COLORS.primary;
  const iconSize = onOrangeBubble ? 14 : 12;
  if (status === "read") {
    return (
      <Ionicons
        name="checkmark-done"
        size={iconSize}
        color={readColor}
        style={styles.messageTick}
      />
    );
  }
  if (status === "delivered") {
    return (
      <Ionicons
        name="checkmark-done"
        size={iconSize}
        color={tickColor}
        style={styles.messageTick}
      />
    );
  }
  return (
    <Ionicons
      name="checkmark"
      size={iconSize}
      color={tickColor}
      style={styles.messageTick}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  accessDeniedWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  accessDeniedTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  accessDeniedMeta: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  accessDeniedBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  accessDeniedBtnText: { color: COLORS.card, fontWeight: "800", fontSize: 14 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 10 },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", maxWidth: 220 },
  headerTitleText: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  presenceDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 7 },
  presenceDotOnline: { backgroundColor: COLORS.success },
  presenceDotOffline: { backgroundColor: COLORS.textSoft },
  msgOuter: { marginBottom: 10, flexDirection: "row", width: "100%" },
  msgOuterMine: { justifyContent: "flex-end" },
  msgOuterOther: { justifyContent: "flex-start" },
  msgStack: { maxWidth: "80%" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: "stretch",
  },
  bubbleMine: { backgroundColor: COLORS.primary },
  bubbleOther: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: COLORS.card },
  meta: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  metaInBubbleMine: {
    marginTop: 6,
    justifyContent: "flex-end",
    paddingHorizontal: 0,
  },
  metaOther: { justifyContent: "flex-start" },
  messageTime: { fontSize: 10, color: COLORS.textMuted },
  messageTimeInBubble: { color: "rgba(255,255,255,0.88)" },
  messageTick: { marginTop: 0 },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 0,
  },
  liveMetaRow: { paddingBottom: 2 },
  typingText: { fontSize: 11, color: COLORS.primary, fontWeight: "700" },
  inputRow: {
    paddingTop: 0,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    minHeight: 36,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
  },
  sendBtnDisabled: { opacity: 0.65 },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 24 },
  conversationSkeletonWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  conversationBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    maxWidth: "75%",
  },
  conversationBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    maxWidth: "75%",
  },
  skeletonGapXs: { height: 6 },
  conversationComposerSkeleton: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
});

