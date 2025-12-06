import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { listFlows } from "./flows";
import { explainError } from "./ai";

// Adjust if you want a different origin in future
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

  // 🔹 1. Handle all CORS preflight here
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

  // (Optional) see who is calling you
  const claims = event.requestContext.authorizer?.jwt?.claims ?? {};

  // 🔹 2. Health check – unauthenticated via $default route
  if (method === "GET" && path === "/health") {
    return jsonResponse(200, {
      ok: true,
      user: claims["email"] ?? null,
    });
  }

  // 🔹 3. GET /flows – protected by JWT authorizer
  if (method === "GET" && path === "/flows") {
    const items = await listFlows();
    return jsonResponse(200, { items });
  }

  // 🔹 4. POST /ai/explain – protected by JWT authorizer
  if (method === "POST" && path === "/ai/explain") {
    const parsedBody = event.body ? JSON.parse(event.body) : {};
    const explanation = await explainError(parsedBody);
    return jsonResponse(200, { explanation });
  }

  // 🔹 5. Fallback
  return jsonResponse(404, { message: "Not Found" });
};
