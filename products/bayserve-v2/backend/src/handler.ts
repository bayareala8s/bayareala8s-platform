import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { log } from './logger';
import { listFlows, createFlow } from './flows';
import { startFlowExecution } from './sfn';
import { explainFlowFailure } from './ai';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';

const jsonResponse = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = (event.requestContext.http.method || 'GET') as HttpMethod;
  const path = event.rawPath || '/';

  log('INFO', 'Incoming request', {
    method,
    path,
    requestId: event.requestContext.requestId,
    user: event.requestContext.authorizer?.jwt?.claims?.email,
  });

  try {
    if (path === '/health') {
      return jsonResponse(200, { status: 'ok', product: process.env.PRODUCT_NAME || 'bayserve-v2' });
    }

    if (path === '/flows' && method === 'GET') {
      const flows = await listFlows();
      return jsonResponse(200, { items: flows });
    }

    if (path === '/flows' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const flow = await createFlow(body);
      return jsonResponse(201, flow);
    }

    if (path.startsWith('/flows/') && path.endsWith('/execute') && method === 'POST') {
      const parts = path.split('/');
      const flowId = parts[2];
      const body = event.body ? JSON.parse(event.body) : {};
      const exec = await startFlowExecution(flowId, body);
      return jsonResponse(202, { executionArn: exec.executionArn, startDate: exec.startDate });
    }

    if (path === '/ai/explain' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const result = await explainFlowFailure(body);
      return jsonResponse(200, result);
    }

    return jsonResponse(404, { message: 'Not Found' });
  } catch (err) {
    log('ERROR', 'Unhandled error', { error: (err as Error).message, stack: (err as Error).stack });
    return jsonResponse(500, { message: 'Internal Server Error' });
  }
};
