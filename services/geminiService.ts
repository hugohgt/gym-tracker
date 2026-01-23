
import { GoogleGenAI, Type } from "@google/genai";
import { Workout } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getWorkoutFeedback = async (history: Workout[]) => {
  const model = 'gemini-3-flash-preview';
  
  const historySummary = history.slice(-5).map(w => ({
    date: w.date,
    title: w.title,
    exercises: w.exercises.map(e => ({
      name: e.name,
      sets: e.sets.length,
      // Fix: Use s.weight || 0 to avoid NaN if weight is undefined
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

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite bodybuilding and strength coach. Keep responses punchy, motivating, and professional."
      }
    });
    // The response.text property directly returns the extracted string.
    return response.text;
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    return "Failed to fetch AI feedback. Please try again later.";
  }
};

export const generatePlan = async (goal: string) => {
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
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

  // Extract text and parse as JSON for the workout plan.
  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
};
