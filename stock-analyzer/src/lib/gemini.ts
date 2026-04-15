import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

export async function getGeminiAnalysis(prompt: string): Promise<string> {
  try {
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip surrounding code fences if present
    if (text.startsWith("```") && text.endsWith("```")) {
      return text.slice(3, -3).replace(/^markdown\n?/, "").trim();
    }

    return text;
  } catch (e) {
    console.error("[GEMINI ERROR]", e);
    return "AI summary unavailable";
  }
}
