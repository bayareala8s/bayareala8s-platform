import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { log } from "./logger";

const jobsTableName = process.env.JOBS_TABLE_NAME as string | undefined;

const ddb = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(ddb);

export interface JobRecord {
  job_id: string;
  file_name: string;
  tenant: string;
  flow_id: string;
  status: "COMPLETED" | "FAILED";
  bucket: string;
  key: string;
  started_at: string;
  completed_at: string;
}

export const putJobRecord = async (record: JobRecord) => {
  if (!jobsTableName) {
    log("ERROR", "JOBS_TABLE_NAME env var is not set; skipping job record", {
      record,
    });
    return;
  }

  await doc.send(
    new PutCommand({
      TableName: jobsTableName,
      Item: record,
    })
  );
};

export const listJobs = async (): Promise<JobRecord[]> => {
  if (!jobsTableName) {
    log("ERROR", "JOBS_TABLE_NAME env var is not set; cannot list jobs");
    return [];
  }

  const res = await doc.send(
    new ScanCommand({
      TableName: jobsTableName,
      Limit: 100,
    })
  );

  const items = (res.Items as JobRecord[] | undefined) ?? [];

  // Sort newest first by completed_at
  return items.sort((a, b) =>
    (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
  );
};
