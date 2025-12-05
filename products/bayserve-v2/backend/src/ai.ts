import { log } from './logger';

/**
 * Placeholder AI explainer.
 * In production, call Bedrock Claude or OpenAI here.
 */
export const explainFlowFailure = async (body: { flowId?: string; error?: string }) => {
  log('INFO', 'AI explain request', body);

  const { flowId, error } = body;

  // TODO: Replace this with real Bedrock Claude call
  const explanation = `This is a placeholder AI explanation for flow ${flowId ?? 'unknown'} with error: ${error ?? 'n/a'}. In production, this will call Bedrock Claude to generate a human-friendly explanation and remediation steps.`;

  return {
    explanation,
    suggestions: [
      'Verify source and target credentials',
      'Check file size and format constraints',
      'Review recent configuration changes',
    ],
  };
};
