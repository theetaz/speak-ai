import { llm } from '@livekit/agents';
import { z } from 'zod';

export interface PronunciationNote {
  word: string;
  issue: string;
  tip: string;
}

export function createPronunciationTool(
  notes: PronunciationNote[],
  onFeedback?: (data: PronunciationNote) => void,
) {
  return llm.tool({
    description:
      "Flag a pronunciation concern based on the student's native language patterns or common English pronunciation difficulties.",
    parameters: z.object({
      word: z.string().describe('The word with pronunciation concern'),
      issue: z.string().describe('What the pronunciation issue is'),
      tip: z.string().describe('A helpful tip for correct pronunciation'),
    }),
    execute: async ({ word, issue, tip }) => {
      const note: PronunciationNote = { word, issue, tip };
      notes.push(note);
      onFeedback?.(note);
      return `Noted pronunciation note for "${word}"`;
    },
  });
}
