import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { log } from './logger';

const tableName = process.env.FLOWS_TABLE_NAME as string;

if (!tableName) {
  log('ERROR', 'FLOWS_TABLE_NAME env var is not set');
}

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export interface SftpSourceConfig {
  type: 'sftp';
  host: string;
  port?: number;
  username?: string;
  authMethod?: 'password' | 'key';
  passwordSecretId?: string;
  privateKeySecretId?: string;
  remotePath?: string;
}

export interface S3TargetConfig {
  type: 's3';
  bucket: string;
  prefix?: string;
  kmsKeyId?: string;
}

export interface Flow {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Optional extra fields so a flow can represent
  // a reusable connection definition.
  type?: 'FLOW' | 'CONNECTION';
  sourceConfig?: SftpSourceConfig;
  targetConfig?: S3TargetConfig;
}

export const listFlows = async (): Promise<Flow[]> => {
  const result = await docClient.send(new ScanCommand({
    TableName: tableName,
  }));

  return (result.Items as Flow[] | undefined) || [];
};

export const createFlow = async (input: Partial<Flow>): Promise<Flow> => {
  const id = input.id ?? `flow-${Date.now()}`;
  const now = new Date().toISOString();

  const item: Flow = {
    id,
    name: input.name || 'Untitled Flow',
    status: input.status || 'DRAFT',
    createdAt: now,
    updatedAt: now,
    type: input.type ?? 'FLOW',
    sourceConfig: input.sourceConfig,
    targetConfig: input.targetConfig,
  };

  await docClient.send(new PutCommand({
    TableName: tableName,
    Item: item,
  }));

  log('INFO', 'Flow created', { id });

  return item;
};

export const getFlow = async (id: string): Promise<Flow | null> => {
  const result = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: { id },
  }));

  return (result.Item as Flow | undefined) || null;
};
