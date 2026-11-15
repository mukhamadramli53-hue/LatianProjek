import fs from "fs";

const envContent = fs.readFileSync("./.env.local", "utf8");
const apiKeyMatch = envContent.match(/GROQ_API_KEY="([^"]+)"/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : "";

async function listModels() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  console.log("Available models:", data.data?.map(m => m.id));
}
listModels();
