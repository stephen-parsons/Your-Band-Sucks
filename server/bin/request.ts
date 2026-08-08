// request.ts
import { parseArgs, ParseArgsOptionsConfig } from "node:util";
import getBearerAuthToken from "./login";

const options: ParseArgsOptionsConfig = {
  path: { type: "string", short: "p" },
  method: { type: "string", short: "m", default: "GET" },
  body: { type: "string", short: "b" },
};

const { values } = parseArgs({ options, strict: false });

const pathArg = values.path as string | undefined;
const methodArg = (
  (values.method as string | undefined) ?? "GET"
).toUpperCase();
const bodyArg = values.body as string | undefined;

if (!pathArg) {
  console.error("❌ Error: Please provide a path argument. Example: /users");
  process.exit(1);
}

if (methodArg === "POST" && !bodyArg) {
  console.error(
    '❌ Error: POST requests require a --body argument. Example: --body \'{"key":"value"}\'',
  );
  process.exit(1);
}

if (bodyArg) {
  try {
    JSON.parse(bodyArg);
  } catch {
    console.error("❌ Error: --body must be valid stringified JSON");
    process.exit(1);
  }
}

// 2. Format the path to ensure it starts with a forward slash
const formattedPath = pathArg.startsWith("/") ? pathArg : `/${pathArg}`;
const url = `${process.env.API_URL}${formattedPath}`;

if (!process.env.API_URL) {
  console.error("❌ Error: API_URL is not set");
  process.exit(1);
}

async function makeRequest(): Promise<void> {
  const token = await getBearerAuthToken();

  try {
    console.log(`🚀 Sending ${methodArg} request to: ${url}`);

    const headers: Record<string, string> = {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    };

    if (bodyArg) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: methodArg,
      headers,
      body: bodyArg,
    });

    const data = JSON.stringify(await response.json(), null, 2);
    console.log(`✅ Status: ${response.status}`);
    console.log("📄 Response Data:", data);
  } catch (error) {
    console.error(
      "❌ Request failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

makeRequest();
