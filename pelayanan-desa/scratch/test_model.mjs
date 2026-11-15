import fs from "fs";

const envContent = fs.readFileSync("./.env.local", "utf8");
const apiKeyMatch = envContent.match(/GROQ_API_KEY="([^"]+)"/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : "";

async function testModel(modelName) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 50,
      messages: [{ role: "user", content: "Halo" }],
    }),
  });
  console.log(modelName, "Status:", res.status);
  const data = await res.json();
  if (!res.ok) console.log("Error:", data);
  else console.log("Reply:", data.choices?.[0]?.message?.content);
}

async function run() {
  await testModel("llama-3.3-70b-versatile");
  await testModel("llama-3.1-8b-instant");
}
run();
