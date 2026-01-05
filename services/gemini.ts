
import { GoogleGenAI } from "@google/genai";

const getAIClient = (apiKey?: string) => {
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
};

export const transcribeMedia = async (fileBase64: string, mimeType: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: "Please transcribe the speech in this media file into accurate text. Output only the transcription." }
      ]
    }
  });
  return response.text || "Failed to transcribe.";
};

export const translateText = async (text: string, targetLang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following text into ${targetLang}. Preserve tone and formatting. Only return the translated text: \n\n${text}`
  });
  return response.text || "Translation failed.";
};

export const translateSRT = async (srtContent: string, targetLang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a professional subtitle translator. Translate the text within this SRT file to ${targetLang}. Keep the indices and timestamps EXACTLY the same. Only return the modified SRT content: \n\n${srtContent}`
  });
  return response.text || "SRT translation failed.";
};

export const generateSubtitles = async (fileBase64: string, mimeType: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: "Generate a standard .srt subtitle file for this media. Ensure accurate timestamps synchronized with the audio. Output only the SRT file content." }
      ]
    }
  });
  return response.text || "Failed to generate subtitles.";
};

export const writeScript = async (topic: string, tone: string, lang: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write a high-quality ${tone} video script about "${topic}" in the language: ${lang}. Include scene descriptions and speaker labels.`
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
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
