import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { listFlows } from "./flows";

// You can override this later via env var if needed
const allowedOrigin =
  process.env.CORS_ORIGIN ?? "https://selfserve.bayareala8s.com";

function jsonResponse(
  statusCode: number,
  body?: unknown
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    },
    body: body === undefined ? "" : JSON.stringify(body),
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  // 1) Handle all CORS preflight here so API Gateway stops returning 404
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
      },
    };
  }

  // 2) Simple health check (used by /health if you call it)
  if (method === "GET" && path === "/health") {
    return jsonResponse(200, { ok: true });
  }

  // 3) GET /flows – this is what the UI is calling
  if (method === "GET" && path === "/flows") {
    const items = await listFlows();
    return jsonResponse(200, { items });
  }

  // 4) POST /ai/explain – stub implementation for now (no ai.ts needed)
  if (method === "POST" && path === "/ai/explain") {
    const parsedBody = event.body ? JSON.parse(event.body) : {};
    return jsonResponse(200, {
      explanation:
        "AI Assistant is not wired to a model yet. You sent: " + JSON.stringify(parsedBody),
    });
  }

  // 5) Fallback
  return jsonResponse(404, { message: "Not Found" });
};
