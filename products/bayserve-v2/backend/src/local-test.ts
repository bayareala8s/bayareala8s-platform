import { handler } from "./handler";

(async () => {
  const event = {
    version: "2.0",
    routeKey: "OPTIONS /flows",
    rawPath: "/flows",
    rawQueryString: "",
    headers: {
      origin: "https://selfserve.bayareala8s.com",
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization,content-type",
    },
    requestContext: {
      http: {
        method: "OPTIONS",
        path: "/flows",
      },
      authorizer: undefined,
    },
    body: null,
    isBase64Encoded: false,
  } as any;

  const res = await handler(event);
  console.log("Response:", res);
})();
