
import { GoogleGenAI } from "@google/genai";

export const getAIClient = (apiKey?: string) => {
  console.log("getAIClient called with apiKey:", apiKey ? "provided" : "undefined");
  const finalKey = apiKey || process.env.GEMINI_API_KEY || '';
  if (!finalKey) {
    console.error("No API Key found in getAIClient!");
  }
  return new GoogleGenAI({ apiKey: finalKey });
};

const FALLBACK_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro-preview',
  'gemini-1.5-flash',
];

const generateWithFallback = async (ai: GoogleGenAI, initialModel: string, params: any) => {
  let modelIndex = FALLBACK_MODELS.indexOf(initialModel);
  const modelsToTry = modelIndex >= 0 
    ? FALLBACK_MODELS.slice(modelIndex) 
    : [initialModel, ...FALLBACK_MODELS.filter(m => m !== initialModel)];

  let lastError: any;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: modelName
      });
      
      if (modelName !== initialModel) {
        window.dispatchEvent(new CustomEvent('gemini-fallback', { 
          detail: { oldModel: initialModel, newModel: modelName } 
        }));
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      const errMsg = error?.message || String(error);
      
      const isLimitError = errMsg.includes('429') || 
                           errMsg.includes('503') || 
                           errMsg.includes('RESOURCE_EXHAUSTED') ||
                           errMsg.includes('quota') ||
                           errMsg.includes('overloaded');
                           
      if (!isLimitError) {
        throw error;
      }
      console.warn(`Model ${modelName} failed with limit error. Trying next model...`, errMsg);
    }
  }
  
  throw lastError;
};

export const generateScript = async (topic: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);

  /* // မူရင်းကုတ်အဟောင်းကို Comment ပိတ်ထားခြင်း
  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: `Write a high-quality vi script about "${topic}". 
    The script should be interesting, engaging, and well-structured.
    Include scene descriptions and speaker labels.
    If the language is Burmese, ensure it's natural and attractive (စကားပြော script).`
  });
  */

  // Narrator Style စစ်စစ်ရအောင် ပြင်ဆင်ထားသော အသစ်
  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: `You are a professional storyteller. Write an immersive, high-quality narrator-style video script about "${topic}".

    Instructions:
    1. Language & Style: Use natural, heart-touch ing Burmese "Spoken Style" (စကားပြော script). Avoid formal or bookish language.
    2. Tone: The tone must be deeply emotional, reflective, and engaging.
    3. Structure: 
       - Start with a scene description or background music cue in parentheses, e.g., (Scene: Slow, emotional piano music...).
       - Use clear speaker labels like "Narrator:".
       - Use ellipses (...) frequently to indicate dramatic pauses and add emotional weight to the delivery.
    4. Impact: Ensure the script feels like a real human is sharing a deep life lesson or a moving story.

    Return only the script content.`
  });

  return response.text || "Failed to generate script.";
};


export const refineScript = async (script: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: `Refine and improve the following video script to make it more engaging, professional, and attractive: \n\n${script}`
  });
  return response.text || "Failed to refine script.";
};
export const transcribeMedia = async (fileBase64: string, mimeType: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  
  // Prompt ကို ပိုပြီး တိကျအောင် ပြင်ဆင်ထားပါတယ်
  const narratorPrompt = `
    Please listen to and watch this media file carefully. 
    Your task is to generate a professional, engaging, and attractive Narrator Script (စကားပြော script) based on the content.
    
    CRITICAL RULES:
    1. Output ONLY the spoken text that a narrator will read.
    2. DO NOT include timestamps, scene descriptions, or labels like [Intro], [Music], or "Narrator:".
    3. DO NOT include any explanations or introductory remarks.
    4. The tone should be professional and storytelling-style.
    5. Keep the output in Burmese language.
    6. Ensure the flow is natural for a continuous voice-over recording.
  `;

  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', { // Model name ကို version အသစ်ပြောင်းပေးထားပါတယ်
    contents: [{
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: narratorPrompt }
      ]
    }]
  });
  
  return response.text || "Failed to generate script.";
};
export const transcribeYoutubeLink = async (url: string, apiKey?: string, translateToBurmese?: boolean): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient(apiKey);
  
  const systemPrompt = `You are a Professional Narrator Script Writer. Your primary task is to transform video content from provided links ${url} into a high-quality, engaging speaking script (Narrator Style) without any unnecessary metadata.

Strict Instructions:
1. Analysis & Style Adaptation: Analyze the video's genre. 
   - If it's News: Use a formal, authoritative, and direct reporting tone.
   - If it's Discovery/Documentary: Use an informative, steady, and thought-provoking storytelling tone.
   - If it's a Story/Fable: Use an emotional, descriptive, and captivating narrative tone.
   - For other genres: Adapt the most suitable narrative flow.

2. Fallback Strategy: If the video content is inaccessible or restricted, provide a high-fidelity reconstructed script based on the video's title, description, and available metadata/search results. Ensure it maintains the requested narrator style.

3. Content Transformation: Do NOT provide a raw transcript. Rewrite the information into a smooth, professional script that a narrator can read fluently.

4. Negative Constraints (Strictly Prohibited):
   - NO Timestamps.
   - NO Scene descriptions or visual cues.
   - NO Speaker labels (e.g., Narrator:, Person A:).
   - NO Introductory or concluding remarks from the AI.
   - NO extra text outside the script itself.

5. Language: Write the script in the same language as the video's primary content.

6. Formatting: Output the final script ONLY within a single code block.
`;

  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: systemPrompt,
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }]
    }
  });
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return {
    text: response.text || "Failed to fetch video transcription information.",
    sources
  };
};
/*export const transcribeMedia = async (fileBase64: string, mimeType: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: "Please listen to and watch this media file carefully. Your task is to generate an interesting, engaging, and attractive speaking script (စကားပြော script) based on the content. Do not just provide a raw transcription; instead, create a script that is well-structured and compelling for an audience. Output the script in the same language as the media, unless it's Burmese, in which case keep it in Burmese." }
      ]
    }
  });
  return response.text || "Failed to generate script.";
};*/

/*export const transcribeYoutubeLink = async (url: string, apiKey?: string, translateToBurmese?: boolean): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient(apiKey);
  
  const systemPrompt = `You are a specialized AI Content Script Writer. Your task is to process video links from platforms like YouTube, TikTok, and Facebook.
  
  Instructions:
  1. Analyze: Access and understand the content of the provided link: ${url}
  2. Generate Script: Instead of a raw transcript, create an interesting, engaging, and attractive speaking script (စကားပြော script) based on the video's content.
  3. Structure: Organize the script with clear sections, speaker labels if applicable, and engaging transitions.
  4. Language: Provide the script in the original language of the video. 
  ${translateToBurmese ? "CRITICAL: The user has requested a translation. Please translate the entire generated script into Burmese while maintaining its engaging and attractive tone." : ""}
  
  If the content is inaccessible, provide a high-fidelity summary and a reconstructed script based on available metadata and search results.`;

  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: systemPrompt,
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }]
    }
  });
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return {
    text: response.text || "Failed to fetch video transcription information.",
    sources
  };
};*/

export const translateText = async (text: string, targetLang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: `Translate the following text into ${targetLang}. Preserve tone and formatting. Only return the translated text: \n\n${text}`
  });
  return response.text || "Translation failed.";
};

export const translateSRT = async (srtContent: string, targetLang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: `You are a professional subtitle translator. Translate the text within this SRT file to ${targetLang}. Keep the indices and timestamps EXACTLY the same. Only return the modified SRT content: \n\n${srtContent}`
  });
  return response.text || "SRT translation failed.";
};

export const generateSubtitles = async (fileBase64: string, mimeType: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: `Role: Expert Audiovisual Translator & Subtitle Synchronization Specialist.
Objective: To generate high-precision Burmese SRT files from any uploaded video or audio file, ensuring the translated text is perfectly synchronized with the timing of the spoken words and on-screen actions.
Task Requirements:
1. Audio-Visual Synchronization: * Analyze the audio/video stream to detect exact start and end times of speech.
• Ensure the SRT timestamps align precisely with lip movements (in video) or vocal delivery (in audio).
• Maintain a natural reading speed so subtitles do not lag or disappear too quickly.
2. Linguistic Accuracy: * Translate the source language into contextually accurate Burmese.
• Strict Constraint: Do NOT use Burmese punctuation marks (။) or (၊) and avoid Western marks (?).
3. SRT Output:
• Format the output strictly as a professional .srt file.
• Present the entire result inside a single CODE BLOCK for easy copying.
Constraints:
• No Social Media Content: Do not generate TikTok hooks, titles, or captions.
• No Introductory Text: Provide only the SRT code block immediately upon file upload.
• Zero Latency Alignment: Prioritize "Time-to-Speech" accuracy to ensure the text never feels out of sync with the audio.`}
      ]
    }
  });
  return response.text || "Failed to generate subtitles.";
};

export const convertTextToSRT = async (text: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: `Convert the following text into a valid .srt subtitle file. 
    The input might contain timestamps like "00:00:05 - 00:00:10: Text" or similar. 
    Ensure the output follows the standard SRT format:
    1
    00:00:05,000 --> 00:00:10,000
    Subtitle text

    Only return the raw SRT content, no explanations.
    
    Input Text:
    ${text}`
  });
  return response.text || "Failed to convert text to SRT.";
};
export const writeScript = async (topic: string, style: string, length: string, lang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const lengthInstruction = length === 'short' ? '1 to 3 sections/paragraphs' : '5 to 12 sections/paragraphs';
  
  const prompt = `Write a high-quality, professional video script about "${topic}" in the language: ${lang}.
    
    Format & Structure Requirements:
    1. Style: ${style} (Ensure the tone is deeply immersive and matches this style perfectly).
    2. Scene Descriptions: Include mood, background music, or sound cues inside parentheses, e.g., (Scene description or music cues).
    3. NO SPEAKER LABELS: Do NOT include labels like "Narrator:", "Speaker:", or names. Provide only the spoken lines and scene cues.
    4. Pacing: Use ellipses (...) to indicate dramatic pauses and emotional weight.
    5. Length: Approximately ${lengthInstruction}.
    
    Language Specifics:
    - If the language is Burmese (my-MM), use natural "Spoken Style" (စကားပြော script). 
    - Avoid formal or textbook language; make it feel like a real person is talking.
    - Ensure it is engaging and captures the audience's heart from the first line.

    Output only the script content itself.`;

  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: prompt
  });

  return response.text || "Failed to generate script.";
};

/*export const writeScript = async (topic: string, style: string, length: string, lang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const lengthInstruction = length === 'short' ? '1 to 3 pages/paragraphs' : '5 to 15 pages/paragraphs';
  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: `Write a high-quality ${style} video script about "${topic}" in the language: ${lang}. 
    Length: Approximately ${lengthInstruction}. 
    Style: ${style}.
    The script should be interesting, engaging, and well-structured.
    Include scene descriptions and speaker labels.
    If the language is Burmese, ensure it's natural and attractive (စကားပြော script).`
  });
  return response.text || "Failed to generate script.";
};*/
