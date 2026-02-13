import { llm } from '@livekit/agents';
import { z } from 'zod';

export interface VocabSuggestion {
  word: string;
  definition: string;
  example: string;
}

export function createVocabularyTool(
  suggestions: VocabSuggestion[],
  onFeedback?: (data: VocabSuggestion) => void,
) {
  return llm.tool({
    description:
      'Call occasionally when it fits naturally. Suggest better synonyms, idioms, phrasal verbs, or collocations related to what the student is discussing. Call silently and continue talking.',
    parameters: z.object({
      word: z.string().describe('The vocabulary word or phrase'),
      definition: z.string().describe('Simple definition appropriate for the student level'),
      example: z.string().describe('An example sentence using the word'),
    }),
    execute: async ({ word, definition, example }) => {
      const suggestion: VocabSuggestion = { word, definition, example };
      suggestions.push(suggestion);
      onFeedback?.(suggestion);
      return `Vocabulary suggestion noted: "${word}" - ${definition}`;
    },
  });
}
