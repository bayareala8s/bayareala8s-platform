// products/bayserve-v2/backend/src/handler.ts

import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * CORS – lock this down to your CloudFront / custom domain
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://selfserve.bayareala8s.com",
  "Access-Control-Allow-Credentials": "true",
};

/**
 * DynamoDB setup – table name is injected via Terraform
 */
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const FLOWS_TABLE = process.env.FLOWS_TABLE;

/**
 * Helper: list all flows from DynamoDB.
 * Returns [] if table not configured.
 */
async function listFlows() {
  if (!FLOWS_TABLE) {
    console.warn("FLOWS_TABLE env var is not set; returning empty list");
    return [];
  }

  const cmd = new ScanCommand({
    TableName: FLOWS_TABLE,
    Limit: 100,
  });

  const res = await ddb.send(cmd);
  return res.Items ?? [];
}

/**
 * Helper: very simple AI explanation placeholder.
 * You can later replace this with a Bedrock invocation.
 */
async function explainError(error: string | undefined) {
  if (!error || !error.trim()) {
    return "No error provided. Please paste the full error message from your file transfer logs.";
  }

  return `This is a placeholder AI explanation for the error: "${error}". In the real implementation, BayServe v2 would call an AI service (for example, Amazon Bedrock) to analyze the error and suggest remediation steps.`;
}

/**
 * Main Lambda handler for the BayServe v2 HTTP API
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  console.log("Incoming request", {
    method,
    path,
    headers: event.headers,
  });

  // 1) CORS preflight – must succeed or browser will block the real call
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...CORS_HEADERS,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "authorization,content-type",
      },
      body: "",
    };
  }

  // 2) Health check
  if (method === "GET" && path === "/health") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        service: "bayserve-v2-backend",
      }),
    };
  }

  // 3) GET /flows  – secure endpoint, expects JWT from Cognito
  if (method === "GET" && path === "/flows") {
    try {
      // If you want to inspect claims:
      // const claims = (event.requestContext.authorizer as any)?.jwt?.claims;
      // console.log("JWT claims", claims);

      const items = await listFlows();

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ items }),
      };
    } catch (err) {
      console.error("Error listing flows", err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: "Failed to load flows",
        }),
      };
    }
  }

  // 4) POST /ai/explain – simple stub for now
  if (method === "POST" && path === "/ai/explain") {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const explanation = await explainError(body.error);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ explanation }),
      };
    } catch (err) {
      console.error("Error in AI explain", err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: "Failed to generate AI explanation",
        }),
      };
    }
  }

  // 5) Default 404
  console.warn("No matching route", { method, path });

  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: "Not Found" }),
  };
};
