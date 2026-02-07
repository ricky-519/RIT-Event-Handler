
import { GoogleGenAI } from "@google/genai";
import { Event } from "../types";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const isApiKeyAvailable = () => {
  if (!apiKey) {
    console.warn("Gemini API key not configured. Using fallback responses.");
    return false;
  }
  return true;
};

export const getCampusAIResponse = async (
  userQuery: string,
  events: Event[]
): Promise<string> => {
  if (!isApiKeyAvailable() || !ai) {
    return "Campus AI is currently offline. Please check back later.";
  }

  try {
    const eventContext = events.map(e => 
      `- ${e.title} (${e.date} at ${e.time}): ${e.description}. Location: ${e.location}. Category: ${e.category}`
    ).join('\n');

    const systemPrompt = `You are "CampusBot", a helpful AI assistant for a Smart Campus university.
    
    Here is the list of upcoming events on campus:
    ${eventContext}
    
    Answer the student's question based on this information. 
    If the question is about general campus life (OD, attendance, library), provide a helpful, polite generic answer assuming standard university policies.
    Keep answers concise and friendly.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "I'm sorry, I couldn't process that request right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the campus network. Please try again later.";
  }
};

export const generateSmartEventDescription = async (title: string, category: string): Promise<string> => {
  if (!isApiKeyAvailable() || !ai) {
    return `Join us for this amazing ${category} event: ${title}!`;
  }

  try {
    const prompt = `Write a catchy, engaging, and professional 2-sentence description for a university event titled "${title}" in the category "${category}".`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Join us for this amazing event!";
  }
};

export const analyzeODRequest = async (
  studentName: string,
  attendance: number,
  eventTitle: string
): Promise<string> => {
  if (!isApiKeyAvailable() || !ai) {
    if (attendance >= 75) {
      return "Recommendation: Approval recommended (Good attendance record).";
    } else if (attendance >= 65) {
      return "Recommendation: Proceed with caution (Borderline attendance).";
    } else {
      return "Recommendation: Rejection recommended (Low attendance).";
    }
  }

  try {
    const prompt = `
    Role: Academic Advisor AI.
    Task: Recommend whether to approve an On-Duty (OD) request for a student based on their attendance.
    
    Student: ${studentName}
    Current Attendance: ${attendance}%
    Event: ${eventTitle}
    
    Guidelines:
    - Attendance >= 75%: Recommend Approval (Safe zone).
    - Attendance 65-75%: Recommend Caution (Borderline).
    - Attendance < 65%: Recommend Rejection (Critical academic risk).
    
    Output: A single concise sentence starting with "Recommendation:". Do not use markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Recommendation: Unable to analyze.";
  } catch (error) {
    return "Recommendation: AI Service Unavailable.";
  }
};
