import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AudioSession,
  LiveKitRoom,
  useVoiceAssistant,
  useTrackTranscription,
  useTracks,
  isTrackReference,
  type AgentState,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { useConversationStore } from '@/stores/conversationStore';
import { getLiveKitToken, type ConnectionDetails } from '@/services/livekit';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '@/utils/constants';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { endConversation } = useConversationStore();
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    getLiveKitToken(id)
      .then(setConnectionDetails)
      .catch((err) => setError(err?.message ?? 'Failed to connect'));
  }, [id]);

  const handleEnd = async () => {
    if (id) await endConversation(id);
    router.back();
  };

  const handleDisconnected = (reason?: unknown) => {
    const r = reason as { reason?: number; reasonName?: string } | undefined;
    // LeaveRequest (4) = server told us to leave — treat as normal end
    if (r && (r.reason === 4 || r.reasonName === 'LeaveRequest')) {
      handleEnd();
      return;
    }
    setError('Connection lost. Please try again.');
  };

  const handleRoomError = (err: Error) => {
    const msg = err?.message ?? 'Connection error';
    // LeaveRequest during reconnect — treat as normal end
    if (msg.includes('leave request') || msg.includes('LeaveRequest')) {
      handleEnd();
      return;
    }
    setError(msg);
  };

  if (error) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>Connection Error</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Button title="Go Back" onPress={() => router.back()} variant="outline" size="lg" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!connectionDetails) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.connectingText}>Setting up your session...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={connectionDetails.url}
      token={connectionDetails.token}
      connect={true}
      audio={true}
      video={false}
      connectOptions={{ peerConnectionTimeout: 30_000 }}
      onDisconnected={handleDisconnected}
      onError={handleRoomError}
    >
      <RoomContent onEnd={handleEnd} />
    </LiveKitRoom>
  );
}

interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

function RoomContent({ onEnd }: { onEnd: () => void }) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const flatListRef = useRef<FlatList>(null);

  // Get local microphone track for user transcriptions
  const tracks = useTracks([Track.Source.Microphone]);
  const localMicTrack = tracks.find(
    (t) => isTrackReference(t) && t.participant?.isLocal,
  );
  const { segments: userSegments } = useTrackTranscription(localMicTrack);

  // Combine and sort all transcriptions
  const transcripts = useMemo<TranscriptItem[]>(() => {
    const all: TranscriptItem[] = [
      ...(agentTranscriptions ?? []).map((seg) => ({
        id: seg.id,
        role: 'assistant' as const,
        text: seg.text,
        isFinal: seg.final,
        timestamp: seg.firstReceivedTime,
      })),
      ...(userSegments ?? []).map((seg) => ({
        id: seg.id,
        role: 'user' as const,
        text: seg.text,
        isFinal: seg.final,
        timestamp: seg.firstReceivedTime,
      })),
    ];
    return all
      .filter((t) => t.text.trim().length > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [agentTranscriptions, userSegments]);

  // Auto-scroll on new transcripts
  useEffect(() => {
    if (transcripts.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [transcripts.length]);

  const stateLabel: Record<string, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    'pre-connect-buffering': 'Preparing...',
    initializing: 'Setting up...',
    idle: 'Ready',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
    failed: 'Connection Failed',
  };

  const dotColor: Record<string, string> = {
    disconnected: COLORS.textMuted,
    connecting: COLORS.warning,
    'pre-connect-buffering': COLORS.warning,
    initializing: COLORS.warning,
    idle: COLORS.secondary,
    listening: COLORS.secondary,
    thinking: COLORS.primary,
    speaking: COLORS.accent,
    failed: '#ef4444',
  };

  const orbEmoji = state === 'speaking' ? '🗣️' : state === 'thinking' ? '💭' : '🎙️';
  const orbHint =
    state === 'connecting' || state === 'initializing' || state === 'pre-connect-buffering'
      ? 'Setting up your session...'
      : state === 'speaking'
        ? 'Your AI teacher is speaking...'
        : state === 'failed'
          ? 'Connection failed. Try again.'
          : 'Speak naturally — your AI teacher is listening';

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View
            style={[styles.dot, { backgroundColor: dotColor[state] ?? COLORS.textMuted }]}
          />
          <Text style={styles.statusText}>{stateLabel[state] ?? state}</Text>
        </View>
      </View>

      <View style={styles.orbContainer}>
        <View
          style={[
            styles.orb,
            state === 'speaking' && styles.orbSpeaking,
            state === 'listening' && styles.orbListening,
            state === 'thinking' && styles.orbThinking,
          ]}
        >
          <Text style={styles.orbEmoji}>{orbEmoji}</Text>
        </View>
        <Text style={styles.orbHint}>{orbHint}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={transcripts}
        keyExtractor={(t) => t.id}
        style={styles.transcriptList}
        contentContainerStyle={styles.transcriptContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.aiBubble,
              !item.isFinal && styles.pendingBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === 'user' && styles.userBubbleText,
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          state === 'listening' || state === 'idle' ? (
            <Text style={styles.emptyHint}>Start speaking to begin...</Text>
          ) : null
        }
      />

      <Button title="End Conversation" onPress={onEnd} variant="outline" size="lg" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  errorEmoji: { fontSize: 48 },
  errorText: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700' },
  errorDetail: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  connectingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSpeaking: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  orbListening: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  orbThinking: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  orbEmoji: { fontSize: 48 },
  orbHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  transcriptList: { flex: 1 },
  transcriptContent: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  bubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingBubble: { opacity: 0.7 },
  bubbleText: { color: COLORS.text, fontSize: FONT_SIZE.md },
  userBubbleText: { color: '#ffffff' },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
