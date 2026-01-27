
import { GoogleGenAI, Type } from "@google/genai";
import { Workout } from "../types";

/**
 * Helper to check if AI is configured.
 * Per guidelines, the API key must be obtained exclusively from process.env.API_KEY.
 */
export const isAIConfigured = () => {
  return !!process.env.API_KEY;
};

const CONFIG_ERROR_MSG = "AI is not configured. Please set the API_KEY environment variable to enable coaching features.";

export const getWorkoutFeedback = async (history: Workout[]) => {
  // Obtain API key exclusively from process.env.API_KEY as mandated by guidelines.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return CONFIG_ERROR_MSG;
  }

  // Create a new GoogleGenAI instance right before making an API call to ensure use of the most up-to-date configuration.
  const ai = new GoogleGenAI({ apiKey });

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
    return response.text || "No feedback available at this time.";
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    return "Failed to fetch AI feedback. Please try again later.";
  }
};

export const generatePlan = async (goal: string) => {
  // Obtain API key exclusively from process.env.API_KEY as mandated by guidelines.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { error: CONFIG_ERROR_MSG };
  }

  // Create a new GoogleGenAI instance right before making an API call to ensure use of the most up-to-date configuration.
  const ai = new GoogleGenAI({ apiKey });

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
