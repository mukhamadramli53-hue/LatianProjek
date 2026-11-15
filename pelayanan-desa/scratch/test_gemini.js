
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY belum ditemukan di file .env");
    return;
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey
  });

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Halo, kamu siapa?"
    });

    console.log("Gemini response:", res.text);
  } catch (err) {
    console.error("Gemini error:", err.message);
  }
}

main();
