import { GoogleGenAI, Type } from "@google/genai";
import { OptimizedPrompt } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are an elite Video Prompt Engineer. 
Your goal is to write the PERFECT prompt for a specific AI Video Model.

**CRITICAL PROCESS:**
1. **SEARCH FIRST**: Use Google Search to find the latest "prompting guide" or specs for the requested User Model.
2. **ANALYZE IMAGES (If provided)**:
   - If a **Start Frame** is provided: Describe its style, composition, and subject.
   - If an **End Frame** is provided: Describe the target state.
   - **TRANSITION**: Your prompt must explicitly describe the *motion* and *transformation* required to get from Start to End.
3. **REWRITE**: Write an English prompt tailored to the specific model's strengths.
4. **NO NEGATIVE PROMPTS**: Focus on positive descriptors.

**OUTPUT FORMAT**:
Return a JSON object:
- "mainPrompt": The optimized English prompt.
- "suggestedSettings": Resolution, FPS, Motion Scale (1-10).
- "reasoning": Explanation in Italian of the strategy used.
`;

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export interface PromptOptions {
  isShortPrompt: boolean;
  includeTechParams: boolean;
}

export const generateVideoPrompt = async (
  inputText: string,
  modelName: string,
  startImage?: ImageInput,
  endImage?: ImageInput,
  options: PromptOptions = { isShortPrompt: true, includeTechParams: false }
): Promise<OptimizedPrompt> => {
  
  if (!apiKey) {
    throw new Error("API Key mancante. Assicurati che process.env.API_KEY sia configurato.");
  }

  // Determine models
  const hasImages = !!(startImage || endImage);
  
  // Primary: Use Pro models (best quality)
  const primaryModel = hasImages ? 'gemini-3-pro-image-preview' : 'gemini-3-pro-preview';
  
  // Fallback: Use Flash model (most accessible/permissive, supports multimodal)
  const fallbackModel = 'gemini-3-flash-preview';

  let userPromptContext = `
    Input User (Text): "${inputText}"
    Target Model: "${modelName}"
    
    ACTION: Search for "${modelName} prompting guide" and generate the best prompt.
  `;

  // Apply User Options Constraints
  if (options.isShortPrompt) {
    userPromptContext += `\nCONSTRAINT: Keep the 'mainPrompt' CONCISE and SHORT (approx 20-40 words). Focus only on the core action and visual style. Avoid unnecessary fluff.`;
  } else {
    userPromptContext += `\nCONSTRAINT: Write a rich, detailed, and descriptive prompt (Long form).`;
  }

  if (options.includeTechParams) {
    userPromptContext += `\nCONSTRAINT: You MUST include specific TECHNICAL CAMERA PARAMETERS in the prompt (e.g., 'Shot on Arri Alexa, 35mm anamorphic lens, f/1.8 aperture, cinematic lighting'). Choose gear that fits the scene mood.`;
  }

  if (startImage && endImage) {
    userPromptContext += "\nTASK: Create a prompt that bridges the Start Frame to the End Frame (Image-to-Video generation).";
  } else if (startImage) {
    userPromptContext += "\nTASK: Create a video prompt based on this Start Frame.";
  }

  const parts: any[] = [];
  
  if (startImage) {
    parts.push({
      inlineData: {
        data: startImage.base64,
        mimeType: startImage.mimeType
      }
    });
    parts.push({ text: "[THIS IS THE START FRAME / FIRST FRAME]" });
  }

  if (endImage) {
    parts.push({
      inlineData: {
        data: endImage.base64,
        mimeType: endImage.mimeType
      }
    });
    parts.push({ text: "[THIS IS THE END FRAME / LAST FRAME]" });
  }

  parts.push({ text: userPromptContext });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      mainPrompt: { type: Type.STRING, description: "The detailed English prompt." },
      suggestedSettings: {
        type: Type.OBJECT,
        properties: {
          resolution: { type: Type.STRING },
          fps: { type: Type.STRING },
          motionScale: { type: Type.NUMBER }
        }
      },
      reasoning: { type: Type.STRING, description: "Analysis in Italian." }
    },
    required: ["mainPrompt", "suggestedSettings", "reasoning"]
  };

  const makeRequest = async (model: string, useSearch: boolean) => {
    return await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });
  };

  try {
    // Attempt 1: Primary Model (Pro) + Google Search
    const response = await makeRequest(primaryModel, true);
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as OptimizedPrompt;

  } catch (error: any) {
    // Handle Permission Denied (403) or generic errors
    const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    const isPermissionError = errorMessage.includes("403") || 
                              errorMessage.includes("PERMISSION_DENIED") || 
                              error.status === 403;

    if (isPermissionError) {
      console.warn(`Primary model (${primaryModel}) failed (403). Retrying with Fallback Model (${fallbackModel})...`);
      try {
        // Attempt 2: Fallback Model (Flash) + NO Search
        const fallbackResponse = await makeRequest(fallbackModel, false);
        const text = fallbackResponse.text;
        if (!text) throw new Error("No response from AI (Fallback)");
        return JSON.parse(text) as OptimizedPrompt;
      } catch (fallbackError) {
        console.error("Fallback generation failed:", fallbackError);
        throw fallbackError;
      }
    }
    
    console.error("Error generating prompt:", error);
    throw error;
  }
};