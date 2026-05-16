import React from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { CommunityPostDto } from "../lib/types";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { androidChipText } from "../theme/chipAndroid";
import { useSnackbar } from "../components/Snackbar";

type KindFilter = "all" | "feedback" | "idea" | "general";

const KIND_OPTIONS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "feedback", label: "Feedback" },
  { key: "idea", label: "Ideas" },
  { key: "general", label: "General" },
];

function kindLabel(kind: CommunityPostDto["kind"]): string {
  if (kind === "feedback") return "Feedback";
  if (kind === "idea") return "Idea";
  return "General";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CommunityScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const { showSnackbar } = useSnackbar();
  const [posts, setPosts] = React.useState<CommunityPostDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [filter, setFilter] = React.useState<KindFilter>("all");
  const [composeKind, setComposeKind] = React.useState<CommunityPostDto["kind"]>("feedback");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const load = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const q = filter === "all" ? "" : `&kind=${encodeURIComponent(filter)}`;
        const list = await api.get<CommunityPostDto[]>(`/community/posts?take=80${q}`);
        setPosts(list);
      } catch {
        if (!isRefresh) setPosts([]);
        showSnackbar("Could not load community posts.", { type: "error" });
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [filter, showSnackbar],
  );

  React.useEffect(() => {
    load(false);
  }, [load]);

  const onSubmit = async () => {
    const t = title.trim();
    const b = body.trim();
    if (b.length < 4) {
      showSnackbar("Please write a few words for your post.", { type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post<CommunityPostDto>("/community/posts", {
        email: USER_EMAIL,
        kind: composeKind,
        title: t.length ? t : undefined,
        body: b,
      });
      setTitle("");
      setBody("");
      showSnackbar("Thanks — your post is live.", { type: "success" });
      await load(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not post";
      showSnackbar(msg, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={styles.headerIntro}>
        <Text style={styles.introTitle}>Player community</Text>
        <Text style={styles.introSub}>
          Share product feedback, feature ideas, and tips with other PadelMe players. Posts are visible to everyone in
          the app.
        </Text>
      </View>

      <View style={styles.filterRow}>
        {KIND_OPTIONS.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => setFilter(o.key)}
            style={[styles.filterChip, filter === o.key && styles.filterChipOn]}
          >
            <Text style={[styles.filterChipText, filter === o.key && styles.filterChipTextOn]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.composeCard}>
        <Text style={styles.composeLabel}>New post</Text>
        <View style={styles.kindRow}>
          {(
            [
              { k: "feedback" as const, label: "Feedback" },
              { k: "idea" as const, label: "Idea" },
              { k: "general" as const, label: "General" },
            ] as const
          ).map(({ k, label }) => (
            <Pressable
              key={k}
              onPress={() => setComposeKind(k)}
              style={[styles.miniChip, composeKind === k && styles.miniChipOn]}
            >
              <Text style={[styles.miniChipText, composeKind === k && styles.miniChipTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.titleInput}
          placeholder="Optional title"
          placeholderTextColor={COLORS.textSoft}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="What’s on your mind?"
          placeholderTextColor={COLORS.textSoft}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          style={[styles.submitBtn, submitting && styles.disabled]}
          onPress={() => onSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.card} />
          ) : (
            <Text style={styles.submitBtnText}>Post to community</Text>
          )}
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={36} color={COLORS.iconMuted} />
              <Text style={styles.emptyText}>No posts yet. Be the first to share feedback or an idea.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={styles.postMetaRow}>
                <Text style={styles.postKind}>{kindLabel(item.kind)}</Text>
                <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
              </View>
              {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
              <Text style={styles.postAuthor}>
                {item.author.fullName?.trim() || item.author.email.split("@")[0]}
              </Text>
              <Text style={styles.postBody}>{item.body}</Text>
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  headerIntro: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
  },
  introTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  introSub: { marginTop: 6, fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filterChipOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoftAlt,
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted, ...androidChipText(12) },
  filterChipTextOn: { color: COLORS.primaryDark },
  composeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  composeLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textSubtle, marginBottom: 8 },
  kindRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniChipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale },
  miniChipText: { fontSize: 11, fontWeight: "600", color: COLORS.textMuted, ...androidChipText(11) },
  miniChipTextOn: { color: COLORS.primaryDark },
  titleInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 88,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.55 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 28 },
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  postKind: { fontSize: 11, fontWeight: "700", color: COLORS.primary, textTransform: "uppercase" },
  postTime: { fontSize: 11, color: COLORS.textSoft },
  postTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  postAuthor: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8, fontWeight: "600" },
  postBody: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
