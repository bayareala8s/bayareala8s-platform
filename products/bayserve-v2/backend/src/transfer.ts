import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import SftpClient from "ssh2-sftp-client";
import { getFlow, Flow, SftpSourceConfig, S3TargetConfig } from "./flows";
import { log } from "./logger";

const s3Client = new S3Client({});
const secretsClient = new SecretsManagerClient({});

export interface TransferSummary {
  flowId: string;
  filesTransferred: number;
  bucket: string;
  prefix?: string;
}

async function resolveSecret(secretId?: string): Promise<string | undefined> {
  if (!secretId) return undefined;

  const res = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  if (res.SecretString) {
    return res.SecretString;
  }

  return undefined;
}

function ensureConnectionConfigs(flow: Flow): {
  source: SftpSourceConfig;
  target: S3TargetConfig;
} {
  if (!flow.sourceConfig || flow.sourceConfig.type !== "sftp") {
    throw new Error("Flow does not contain a valid SFTP sourceConfig");
  }
  if (!flow.targetConfig || flow.targetConfig.type !== "s3") {
    throw new Error("Flow does not contain a valid S3 targetConfig");
  }

  return {
    source: flow.sourceConfig,
    target: flow.targetConfig,
  };
}

export async function runTransferForFlow(flowId: string): Promise<TransferSummary> {
  log("INFO", "Starting transfer for flow", { flowId });

  const flow = await getFlow(flowId);
  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }

  const { source, target } = ensureConnectionConfigs(flow);

  const password =
    source.authMethod === "password"
      ? await resolveSecret(source.passwordSecretId)
      : undefined;
  const privateKey =
    source.authMethod === "key"
      ? await resolveSecret(source.privateKeySecretId)
      : undefined;

  const sftp = new SftpClient();

  const port = source.port ?? 22;
  const remotePath = source.remotePath && source.remotePath.trim().length > 0
    ? source.remotePath
    : ".";

  const bucket = target.bucket;
  const prefix = target.prefix ? target.prefix.replace(/\/+$/, "") + "/" : "";

  try {
    await sftp.connect({
      host: source.host,
      port,
      username: source.username,
      password,
      privateKey,
    });

    log("INFO", "Connected to SFTP server", { host: source.host, port });

    const list = await sftp.list(remotePath);
    const files = list.filter((item: any) => item.type === "-");

    let transferred = 0;

    for (const file of files) {
      const remoteFilePath = remotePath === "." ? file.name : `${remotePath}/${file.name}`;
      log("INFO", "Downloading file from SFTP", { remoteFilePath });

      const data = (await sftp.get(remoteFilePath)) as Buffer;

      const key = `${prefix}${file.name}`;
      log("INFO", "Uploading file to S3", { bucket, key });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: data,
        })
      );

      transferred += 1;
    }

    log("INFO", "Transfer completed", {
      flowId,
      filesTransferred: transferred,
      bucket,
      prefix,
    });

    return {
      flowId,
      filesTransferred: transferred,
      bucket,
      prefix,
    };
  } finally {
    try {
      await sftp.end();
    } catch (err) {
      log("ERROR", "Error closing SFTP connection", {
        flowId,
        error: (err as Error).message,
      });
    }
  }
}
