import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { listFlows, createFlow } from "./flows";
import { explain } from "./ai";

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

  // 3b) POST /flows – create a new flow
  if (method === "POST" && path === "/flows") {
    const parsedBody = event.body ? JSON.parse(event.body) : {};
    const created = await createFlow(parsedBody);
    return jsonResponse(201, { item: created });
  }

  // 4) POST /ai/explain – call Bedrock-backed explainer
  if (method === "POST" && path === "/ai/explain") {
    const parsedBody = event.body ? JSON.parse(event.body) : {};
    const result = await explain(parsedBody);
    return jsonResponse(200, result);
  }

  // 5) Fallback
  return jsonResponse(404, { message: "Not Found" });
};
