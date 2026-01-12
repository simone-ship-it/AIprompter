import { GoogleGenAI, Type } from "@google/genai";
import { OptimizedPrompt, PromptOptions } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are an elite Video Prompt Engineer. 
Your goal is to write the PERFECT prompt for a specific AI Video Model (Kling, Veo, Hailuo, etc.).

**CRITICAL PROCESS:**
1. **IDENTIFY MODEL ARCHITECTURE**: Each model has a preferred "language".
   - **Kling/Hailuo**: Prefer structured, descriptive, physics-based prompts.
   - **Veo**: Prefers cinematic, natural language narrative.
2. **ANALYZE IMAGES (If provided)**:
   - If a **Start Frame** is provided: Describe its style, composition, and subject.
   - If an **End Frame** is provided: Describe the target state.
   - **TRANSITION**: Your prompt must explicitly describe the *motion* and *transformation* required to get from Start to End.
3. **REWRITE**: Write an English prompt tailored to the specific model's strengths.
4. **NO NEGATIVE PROMPTS**: Focus on positive descriptors.

**OUTPUT FORMAT**:
Return a JSON object:
- "mainPrompt": The optimized English prompt.
- "reasoning": Explanation in Italian of the strategy used.
`;

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export const generateVideoPrompt = async (
  inputText: string,
  modelName: string,
  startImage?: ImageInput,
  endImage?: ImageInput,
  options: PromptOptions = { isShortPrompt: true, includeTechParams: false, fixColorShift: true, isHighFidelity: true }
): Promise<OptimizedPrompt> => {
  
  if (!apiKey) {
    throw new Error("API Key mancante. Assicurati che process.env.API_KEY sia configurato.");
  }

  // Determine models
  const hasImages = !!(startImage || endImage);
  const isImg2Vid = hasImages;
  
  // Primary: Use Pro models (best quality)
  const primaryModel = hasImages ? 'gemini-3-pro-image-preview' : 'gemini-3-pro-preview';
  
  // Fallback: Use Flash model (most accessible/permissive, supports multimodal)
  const fallbackModel = 'gemini-3-flash-preview';

  let userPromptContext = `
    Input User (Text): "${inputText}"
    Target Model: "${modelName}"
    
    ACTION: Generate the best prompt for this model.
  `;

  // --- MODEL SPECIFIC OPTIMIZATIONS (Based on Documentation & Blog Posts) ---
  
  // KLING O1 SPECIFIC LOGIC (Ref: Higgsfield/Kling Prompt Banks)
  if (modelName.toLowerCase().includes('kling')) {
    
    if (isImg2Vid) {
        // --- KLING IMAGE-TO-VIDEO STRATEGY (DELTA ONLY) ---
        userPromptContext += `\nCONSTRAINT: **KLING IMAGE-TO-VIDEO DETECTED**.
        **CRITICAL RULES TO PREVENT ARTIFACTS AND FADES**:
        1. **DO NOT DESCRIBE THE STATIC IMAGE**: The model already sees the start frame. Describing the static subject (e.g., "A man in a suit") causes hallucinations and double-rendering.
        2. **FOCUS 100% ON MOTION (THE DELTA)**: Describe ONLY the movement, the change, and the physics. 
        3. **ENFORCE CONTINUITY**: Use keywords like 'continuous motion', 'fluid transformation', 'morphing', 'dynamic action'. 
        4. **NO CUTS**: Explicitly avoid 'fade to', 'cut to', 'scene change'. The video must be a single continuous shot.
        
        **STRUCTURE FOR IMG2VID**:
        [PHYSICS & MOVEMENT DETAILS] -> [CAMERA MOVEMENT] -> [ATMOSPHERE MAINTAINED]
        `;
    } else {
        // --- KLING TEXT-TO-VIDEO STRATEGY (FULL DESCRIPTION) ---
        userPromptContext += `\nCONSTRAINT: **KLING TEXT-TO-VIDEO OPTIMIZATION**.
        Kling requires a STRICT MODULAR STRUCTURE for best coherence from scratch.
        Organize the prompt visually in this order:
        1. **SUBJECT**: Detailed appearance of the character/object.
        2. **ACTION**: Explicit description of movement (focus on physics, weight, inertia).
        3. **ENVIRONMENT**: Background, depth, and texture.
        4. **ATMOSPHERE/CAMERA**: Lighting, lens type, camera movement.
        `;
    }

  }
  // VEO SPECIFIC LOGIC
  else if (modelName.toLowerCase().includes('veo')) {
     userPromptContext += `\nCONSTRAINT: **VEO OPTIMIZATION ACTIVE**.
     Veo prefers a natural, flowing narrative style. Focus on the "Cinematic Feel" and "Lighting". 
     Use terms like "HDR", "Cinematic composition", "Volumetric lighting".`;
  }

  // --- USER OPTIONS CONSTRAINTS ---
  
  // 1. Creative Freedom vs Fidelity
  if (options.isHighFidelity) {
    userPromptContext += `\nCONSTRAINT: **STRICT FIDELITY**. Follow the user's description and images EXACTLY. Do NOT hallucinate new objects, characters, or major actions not specified by the user. Your job is to translate strictly, not to invent.`;
  } else {
    userPromptContext += `\nCONSTRAINT: **CREATIVE FREEDOM**. Use the user's input as a base inspiration, but you are free to embellish details, improve the atmosphere, add cinematic lighting, and fill in missing details to make the video viral and stunning.`;
  }

  // 2. Short Prompt vs Color Fix Logic
  if (options.isShortPrompt) {
    if (options.fixColorShift && hasImages) {
        // Relax length constraint to allow technical keywords
        userPromptContext += `\nCONSTRAINT: Keep the visual narrative CONCISE (20-30 words). HOWEVER, you **MUST** append the technical color fidelity keywords at the end. It is ACCEPTABLE for the total prompt to exceed 40 words to accommodate these mandatory technical terms.`;
    } else {
        userPromptContext += `\nCONSTRAINT: Keep the 'mainPrompt' CONCISE and SHORT (approx 20-40 words). Focus only on the core action and visual style. Avoid unnecessary fluff.`;
    }
  } else {
    userPromptContext += `\nCONSTRAINT: Write a rich, detailed, and descriptive prompt (Long form).`;
  }

  // 3. Tech Params (Context Aware)
  if (options.includeTechParams) {
    if (hasImages) {
      // Image Aware: Reverse engineer the look
      userPromptContext += `\nCONSTRAINT: **MATCH CAMERA VISUALS**. Analyze the provided image(s) closely. Identify the specific lens type (e.g., wide-angle, telephoto, anamorphic), depth of field (bokeh), lighting setup (soft, hard, rim light), and film stock/grain. You **MUST** include these inferred technical parameters in the prompt to ensure the video generation matches the exact aesthetic of the input image.`;
    } else {
      // Text Only: Generative fit
      userPromptContext += `\nCONSTRAINT: You MUST include specific TECHNICAL CAMERA PARAMETERS in the prompt (e.g., 'Shot on Arri Alexa, 35mm anamorphic lens, f/1.8 aperture, cinematic lighting'). Choose gear that best fits the mood of the described scene.`;
    }
  }

  // 4. Color Shift Fix
  if (options.fixColorShift && hasImages) {
    userPromptContext += `\nCONSTRAINT: **CRITICAL COLOR FIDELITY**. The user wants to animate an existing image and needs the video to match the original image exactly. 
    You **MUST** include specific keywords to prevent the model from changing exposure, contrast, or color grading. 
    **MANDATORY PHRASES TO INCLUDE**: 'unchanged raw footage', 'maintain source exposure', 'identical color grading', 'no contrast boost', 'original saturation'.`;
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
      reasoning: { type: Type.STRING, description: "Analysis in Italian." }
    },
    required: ["mainPrompt", "reasoning"]
  };

  const makeRequest = async (model: string, useSearch: boolean) => {
    return await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Only use search if not falling back to models that might not support it well or if explicitly needed
        // For this specific prompt logic, we rely more on the internal system instruction knowledge
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
    
    const parsed = JSON.parse(text);
    return {
        ...parsed,
        usedOptions: options // Include the options used for this specific generation
    } as OptimizedPrompt;

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
        
        const parsed = JSON.parse(text);
        return {
            ...parsed,
            usedOptions: options
        } as OptimizedPrompt;
      } catch (fallbackError) {
        console.error("Fallback generation failed:", fallbackError);
        throw fallbackError;
      }
    }
    
    console.error("Error generating prompt:", error);
    throw error;
  }
};