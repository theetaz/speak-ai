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
      'Suggest a useful vocabulary word that came up in conversation or would be helpful for the student to learn.',
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
