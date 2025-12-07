import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { log } from './logger';

const bedrockRegion = process.env.BEDROCK_REGION || 'us-east-1';
const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

const bedrockClient = new BedrockRuntimeClient({ region: bedrockRegion });

// Use an index signature so this can be passed where
// Record<string, unknown> is expected by the AWS SDK types.
export interface ExplainRequest {
  [key: string]: unknown;
  flowId?: string;
  error?: string;
  flowDescription?: string;
  question?: string;
}

export interface ExplainResponse {
  explanation: string;
}

export const explain = async (body: ExplainRequest): Promise<ExplainResponse> => {
  log('INFO', 'AI explain request', body);

  const { flowId, error, flowDescription, question } = body;

  const userPrompt = [
    'You are an assistant helping users understand data ingestion flows and errors.',
    flowId ? `Flow ID: ${flowId}` : '',
    flowDescription ? `Flow description:\n${flowDescription}` : '',
    error ? `Recent error:\n${error}` : '',
    question ? `User question:\n${question}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const command = new ConverseCommand({
      modelId: bedrockModelId,
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 512,
        temperature: 0.3,
      },
    });

    const result = await bedrockClient.send(command);

    const explanation =
      result.output?.message?.content
        ?.map((c) => c.text || '')
        .join('\n')
        .trim() || 'No explanation generated.';

    return { explanation };
  } catch (err) {
    log('ERROR', 'Bedrock explain failed', { error: String(err) });
    return { explanation: 'AI explanation is temporarily unavailable.' };
  }
};
