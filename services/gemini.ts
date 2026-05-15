
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
  'gemini-2.5-flash',
  'gemini-2.5-pro'
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
  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: `Write a high-quality video script about "${topic}". 
    The script should be interesting, engaging, and well-structured.
    Include scene descriptions and speaker labels.
    If the language is Burmese, ensure it's natural and attractive (စကားပြော script).`
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
  const response = await generateWithFallback(ai, 'gemini-3-flash-preview', {
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: "Please transcribe the content of this media file directly into text. Output only the raw transcription without any extra explanations or restructuring. Use the same language as the spoken words in the media. (အသံတွင် ပါဝင်သော စကားလုံးများကို စာသားအဖြစ် တိုက်ရိုက် ပြန်ဆိုပေးပါ)" }
      ]
    }
  });
  return response.text || "Failed to transcribe media.";
};

export const transcribeYoutubeLink = async (url: string, apiKey?: string, translateToBurmese?: boolean): Promise<{text: string, sources: any[]}> => {
  const apiUrl = '/api/youtube-transcribe';
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, apiKey, translateToBurmese })
    });

    if (response.ok) {
      return await response.json();
    }
    
    const status = response.status;
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    const error = new Error(errorData.error || "Failed to fetch transcription");
    (error as any).status = status;
    throw error;
  } catch (error: any) {
    if (error.status) throw error;
    console.error("YouTube Transcription Error:", error);
    throw error;
  }
};

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
        { text: "Generate a standard .srt subtitle file for this media. Ensure accurate timestamps synchronized with the audio. Output only the SRT file content." }
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
};

export const createContent = async (params: {
  category: string,
  type: string,
  gender: string,
  platform: string,
  lang: string
}, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const { category, type, gender, platform, lang } = params;
  
  const response = await generateWithFallback(ai, 'gemini-3.1-pro-preview', {
    contents: `Generate a viral ${type} for ${platform}. 
               Category: ${category}. 
               Perspective: ${gender} creator. 
               Language: ${lang}. 
               Focus on high engagement and value. Output the content with structure.`
  });
  
  return response.text || "Failed to generate content.";
};

export const generateVideo = async (prompt: string, style: string, apiKey?: string): Promise<string | null> => {
  const ai = getAIClient(apiKey);
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${prompt} in a ${style} style.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
        return `${downloadLink}&key=${apiKey || process.env.API_KEY}`;
    }
    return null;
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
};
