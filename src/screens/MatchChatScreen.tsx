import React from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../lib/api";
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

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<MatchChatMessageDto[]>(
        `/matches/${matchId}/chat-messages`,
      );
      setMessages(res);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    const payload = text.trim();
    if (!payload || sending) return;
    try {
      setSending(true);
      await api.post(`/matches/${matchId}/chat-messages`, {
        senderEmail: USER_EMAIL,
        senderName: USER_NAME,
        text: payload,
      });
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  };

  if (loading) return <MatchChatSkeleton />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const mine = item.senderEmail === USER_EMAIL;
          return (
            <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
                <Text style={[styles.bubbleText, mine && { color: COLORS.card }]}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No chat messages yet.</Text>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message players..."
          placeholderTextColor={COLORS.iconMuted}
          style={styles.input}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { marginBottom: 8, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  mine: { backgroundColor: COLORS.primary },
  other: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { color: COLORS.text, fontSize: 14 },
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

