import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { type Conversation, type ConversationFeedback } from '@/types/database';

interface Transcript {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

interface ConversationState {
  activeConversation: Conversation | null;
  transcripts: Transcript[];
  agentState: 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';
  conversations: Conversation[];
  loading: boolean;

  setAgentState: (state: ConversationState['agentState']) => void;
  addTranscript: (transcript: Transcript) => void;
  updateTranscript: (id: string, text: string, isFinal: boolean) => void;
  clearTranscripts: () => void;

  createConversation: (userId: string, topic?: string) => Promise<Conversation>;
  endConversation: (id: string) => Promise<void>;
  fetchConversations: (userId: string) => Promise<void>;
  fetchFeedback: (conversationId: string) => Promise<ConversationFeedback | null>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  activeConversation: null,
  transcripts: [],
  agentState: 'disconnected',
  conversations: [],
  loading: false,

  setAgentState: (agentState) => set({ agentState }),

  addTranscript: (transcript) =>
    set((s) => ({ transcripts: [...s.transcripts, transcript] })),

  updateTranscript: (id, text, isFinal) =>
    set((s) => ({
      transcripts: s.transcripts.map((t) =>
        t.id === id ? { ...t, text, isFinal } : t,
      ),
    })),

  clearTranscripts: () => set({ transcripts: [] }),

  createConversation: async (userId, topic) => {
    const roomName = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        topic,
        livekit_room_name: roomName,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    set({ activeConversation: data, transcripts: [] });
    return data;
  },

  endConversation: async (id) => {
    const conv = get().activeConversation;
    if (!conv) return;
    const duration = Math.floor(
      (Date.now() - new Date(conv.started_at).getTime()) / 1000,
    );
    await supabase
      .from('conversations')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq('id', id);
    set({ activeConversation: null, agentState: 'disconnected' });
  },

  fetchConversations: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    set({ conversations: data ?? [], loading: false });
  },

  fetchFeedback: async (conversationId) => {
    const { data, error } = await supabase
      .from('conversation_feedback')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
}));
