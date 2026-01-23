
import { GoogleGenAI, Type } from "@google/genai";
import { Workout } from "../types";

/**
 * Helper to get the AI instance safely.
 * Per system instructions, we prioritize process.env.API_KEY.
 * We also handle environments where 'process' might not be defined.
 */
const getApiKey = (): string | undefined => {
  try {
    // Attempt to get from mandated process.env
    const envKey = typeof process !== 'undefined' ? process.env?.API_KEY : undefined;
    if (envKey && envKey !== 'undefined' && envKey !== '') return envKey;

    // Fallback to VITE_API_KEY as requested for the user's specific environment
    const viteKey = (import.meta as any).env?.VITE_API_KEY;
    if (viteKey && viteKey !== 'undefined' && viteKey !== '') return viteKey;
    
    return undefined;
  } catch (e) {
    return undefined;
  }
};

const getAIInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const isAIConfigured = () => {
  return !!getApiKey();
};

const CONFIG_ERROR_MSG = "AI is not configured. Please set the API_KEY environment variable to enable coaching features.";

export const getWorkoutFeedback = async (history: Workout[]) => {
  const ai = getAIInstance();
  if (!ai) {
    return CONFIG_ERROR_MSG;
  }

  try {
    const historySummary = history.slice(-5).map(w => ({
      date: w.date,
      title: w.title,
      exercises: w.exercises.map(e => ({
        name: e.name,
        sets: e.sets.length,
        avgWeight: e.sets.reduce((acc, s) => acc + (s.weight || 0), 0) / (e.sets.length || 1)
      }))
    }));

    const prompt = `
      As an expert fitness coach, analyze the last 5 workouts of this user and provide actionable feedback.
      History Data: ${JSON.stringify(historySummary)}
      
      Provide a concise analysis focusing on:
      1. Progress trends
      2. Potential plateaus
      3. Suggested improvements for the next session
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an elite bodybuilding and strength coach. Keep responses punchy, motivating, and professional."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    return "Failed to fetch AI feedback. Please try again later.";
  }
};

export const generatePlan = async (goal: string) => {
  const ai = getAIInstance();
  if (!ai) {
    return { error: CONFIG_ERROR_MSG };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 1-day workout routine for a user whose goal is: ${goal}. Include 5-6 exercises with recommended sets and reps.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.NUMBER },
                  reps: { type: Type.STRING },
                  tips: { type: Type.STRING }
                },
                required: ["name", "sets", "reps"]
              }
            }
          },
          required: ["title", "exercises"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating plan:", error);
    return { error: "Failed to generate plan. Please try again." };
  }
};
