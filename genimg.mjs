import { GoogleGenAI, Modality } from "@google/genai";

// 從環境變數獲取 API 密鑰，如果沒有則使用默認值
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBnUuCbcSEs9qweAzTZC0uY17mZvOB1Sp4";

async function generateImage(prompt) {
  try {
    // 初始化 Google GenAI
    const ai = new GoogleGenAI({ apiKey });

    // 設置 responseModalities 包含 "Image" 以便模型生成圖片
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // 初始化結果對象
    const result = {
      success: false,
      text: "",
      imageData: "",
      mimeType: "",
      error: ""
    };

    // 處理響應
    for (const part of response.candidates[0].content.parts) {
      // 根據部分類型，處理文本或圖片
      if (part.text) {
        result.text = part.text;
      } else if (part.inlineData) {
        result.imageData = part.inlineData.data; // Base64 編碼的圖片數據
        result.mimeType = part.inlineData.mimeType;
        result.success = true;
      }
    }

    // 如果沒有找到圖片數據，拋出錯誤
    if (!result.imageData) {
      throw new Error("No image data found in the response");
    }

    return result;
  } catch (error) {
    return {
      success: false,
      text: "",
      imageData: "",
      mimeType: "",
      error: error.message
    };
  }
}

// 主函數
async function main() {
  try {
    // 獲取命令行參數作為 prompt
    const prompt = process.argv.slice(2).join(" ");
    
    if (!prompt) {
      throw new Error("No prompt provided");
    }

    // 生成圖片
    console.log(`Generating image with prompt: ${prompt}`);
    const result = await generateImage(prompt);
    
    // 將結果輸出為 JSON
    console.error('Generated result:', result);
    console.log(JSON.stringify(result));
    
    // 成功時返回 0
    process.exit(0);
  } catch (error) {
    // 將錯誤輸出為 JSON
    console.log(JSON.stringify({
      success: false,
      text: "",
      imageData: "",
      mimeType: "",
      error: error.message
    }));
    
    // 失敗時返回 1
    process.exit(1);
  }
}

// 執行主函數
main();