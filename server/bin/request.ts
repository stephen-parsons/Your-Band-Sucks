// request.ts
import { parseArgs, ParseArgsOptionsConfig } from "node:util";
import getBearerAuthToken from "./login";

const options: ParseArgsOptionsConfig = {
  path: { type: "string", short: "p" },
};

const { values } = parseArgs({ options, strict: false });

const pathArg = values.path as string;

if (!pathArg) {
  console.error("❌ Error: Please provide a path argument. Example: /users");
  process.exit(1);
}

// 2. Format the path to ensure it starts with a forward slash
const formattedPath = pathArg.startsWith("/") ? pathArg : `/${pathArg}`;
const url = `http://localhost:3000${formattedPath}`;

async function makeRequest() {
  const token = await getBearerAuthToken();

  try {
    console.log(`🚀 Sending GET request to: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
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
