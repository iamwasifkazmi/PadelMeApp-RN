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
import { MessageDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";
const USER_NAME = "Demo Player";

export function ConversationViewScreen({
  route,
}: {
  route: { params: { id: string } };
}) {
  const id = route.params.id;
  const [loading, setLoading] = React.useState(true);
  const [messages, setMessages] = React.useState<MessageDto[]>([]);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<MessageDto[]>(`/conversations/${id}/messages`);
      setMessages(res);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    api.post(`/conversations/${id}/read`, { email: USER_EMAIL }).catch(() => undefined);
  }, [id]);

  const send = async () => {
    const payload = text.trim();
    if (!payload || sending) return;
    try {
      setSending(true);
      await api.post(`/conversations/${id}/messages`, {
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

  if (loading) return <ScreenSkeleton rows={7} topGap={12} />;

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
            <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, mine && { color: "#fff" }]}>{item.text}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#7b95a6"
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
  container: { flex: 1, backgroundColor: "#edf9fd" },
  bubbleWrap: { marginBottom: 8, flexDirection: "row" },
  bubbleWrapMine: { justifyContent: "flex-end" },
  bubbleWrapOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMine: { backgroundColor: "#06b6d4" },
  bubbleOther: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#c8e6ef" },
  bubbleText: { color: "#041521", fontSize: 14 },
  inputRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#c8e6ef",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#b7d8e2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#041521",
  },
  sendBtn: {
    backgroundColor: "#06b6d4",
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: "#4f6b7b", marginTop: 24 },
});

