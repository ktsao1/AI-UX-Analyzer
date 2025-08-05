
import { GoogleGenAI } from "@google/genai";
import { FLOW_SUS_ANALYSIS_PROMPT } from '../constants';
import { FlowAnalysisStep } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export const analyzeImage = async (
    base64Image: string, 
    mimeType: string, 
    prompt: string
): Promise<string> => {
  try {
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
    });

    return response.text ?? "No response text received from Gemini.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    if (error instanceof Error) {
        return `An error occurred during analysis: ${error.message}`;
    }
    return "An unknown error occurred during analysis.";
  }
};

export const generateFlowSusAnalysis = async (persona: string, challenge: string, steps: FlowAnalysisStep[]): Promise<string> => {
    const journeyTranscript = steps.map(step => 
      `Step ${step.step} on screen "${step.nodeName}":\n${step.analysisText}`
    ).join('\n\n---\n\n');

    const prompt = FLOW_SUS_ANALYSIS_PROMPT
      .replace(/\$\{persona\}/g, persona)
      .replace(/\$\{challenge\}/g, challenge)
      .replace(/\$\{journey\}/g, journeyTranscript);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text?? "No response text received from Gemini.";
    } catch (error) {
        console.error("Error generating SUS analysis:", error);
        if (error instanceof Error) {
            return `An error occurred while generating the SUS analysis: ${error.message}`;
        }
        return "An unknown error occurred while generating the SUS analysis.";
    }
}