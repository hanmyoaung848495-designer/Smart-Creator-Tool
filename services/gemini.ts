
import { GoogleGenAI } from "@google/genai";

export const getAIClient = (apiKey?: string) => {
  console.log("getAIClient called with apiKey:", apiKey ? "provided" : "undefined");
  const finalKey = apiKey || process.env.GEMINI_API_KEY || '';
  if (!finalKey) {
    console.error("No API Key found in getAIClient!");
  }
  return new GoogleGenAI({ apiKey: finalKey });
};

export const generateScript = async (topic: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Write a high-quality video script about "${topic}". 
    The script should be interesting, engaging, and well-structured.
    Include scene descriptions and speaker labels.
    If the language is Burmese, ensure it's natural and attractive (စကားပြော script).`
  });
  return response.text || "Failed to generate script.";
};

export const refineScript = async (script: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Refine and improve the following video script to make it more engaging, professional, and attractive: \n\n${script}`
  });
  return response.text || "Failed to refine script.";
};

export const transcribeMedia = async (fileBase64: string, mimeType: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: "Please listen to and watch this media file carefully. Your task is to generate an interesting, engaging, and attractive speaking script (စကားပြော script) based on the content. Do not just provide a raw transcription; instead, create a script that is well-structured and compelling for an audience. Output the script in the same language as the media, unless it's Burmese, in which case keep it in Burmese." }
      ]
    }
  });
  return response.text || "Failed to generate script.";
};

export const transcribeYoutubeLink = async (url: string, apiKey?: string, translateToBurmese?: boolean): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient(apiKey);
  
  const systemPrompt = `You are a specialized AI Content Script Writer. Your task is to process video links from platforms like YouTube, TikTok, and Facebook.
  
  Instructions:
  1. Analyze: Access and understand the content of the provided link: ${url}
  2. Generate Script: Instead of a raw transcript, create an interesting, engaging, and attractive speaking script (စကားပြော script) based on the video's content.
  3. Structure: Organize the script with clear sections, speaker labels if applicable, and engaging transitions.
  4. Language: Provide the script in the original language of the video. 
  ${translateToBurmese ? "CRITICAL: The user has requested a translation. Please translate the entire generated script into Burmese while maintaining its engaging and attractive tone." : ""}
  
  If the content is inaccessible, provide a high-fidelity summary and a reconstructed script based on available metadata and search results.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

export const convertTextToSRT = async (text: string, apiKey?: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
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
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
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
