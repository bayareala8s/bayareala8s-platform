import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { log } from './logger';

const stateMachineArn = process.env.FLOW_STATE_MACHINE_ARN as string;

const sfnClient = new SFNClient({});

export const startFlowExecution = async (flowId: string, payload: unknown) => {
  if (!stateMachineArn) {
    log('ERROR', 'FLOW_STATE_MACHINE_ARN env var is not set');
    throw new Error('State machine ARN not configured');
  }

  const input = JSON.stringify({
    flowId,
    payload,
    requestedAt: new Date().toISOString(),
  });

  const cmd = new StartExecutionCommand({
    stateMachineArn,
    input,
  });

  const res = await sfnClient.send(cmd);
  log('INFO', 'Started flow execution', { flowId, executionArn: res.executionArn });

  return res;
};
