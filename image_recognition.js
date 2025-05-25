// 圖片識別模塊 - 使用 Google GenAI 的圖像理解功能
import { GoogleGenerativeAI } from '@google/genai';
import fetch from 'node-fetch';

// 從環境變數或配置中獲取 API 密鑰
let GEMINI_API_KEYS = [];
try {
  if (process.env.GEMINI_API_KEYS) {
    GEMINI_API_KEYS = JSON.parse(process.env.GEMINI_API_KEYS);
  } else if (process.env.GEMINI_API_KEY) {
    GEMINI_API_KEYS = [process.env.GEMINI_API_KEY];
  }
} catch (error) {
  console.error('Error parsing GEMINI_API_KEYS:', error);
}

let currentGeminiKeyIndex = 0;

/**
 * 獲取下一個可用的 Gemini API 密鑰
 */
function getNextGeminiKey() {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys available');
  }
  
  currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length;
  return GEMINI_API_KEYS[currentGeminiKeyIndex];
}

/**
 * 獲取當前的 Gemini API 密鑰
 */
function getCurrentGeminiKey() {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys available');
  }
  
  return GEMINI_API_KEYS[currentGeminiKeyIndex];
}

/**
 * 使用 Google GenAI 識別圖片內容
 * @param {string} imageUrl - 圖片 URL
 * @returns {Promise<Object>} - 識別結果
 */
async function recognizeImageContent(imageUrl) {
  try {
    console.log(`開始識別圖片內容: ${imageUrl}`);
    
    // 獲取 API 密鑰
    const apiKey = getCurrentGeminiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    
    // 初始化 Google GenAI
    const ai = new GoogleGenAI({ apiKey });
    
    // 下載圖片並轉換為 base64
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`無法獲取圖片: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log(`成功獲取圖片，大小: ${arrayBuffer.byteLength} 字節，類型: ${mimeType}`);
    
    // 構建識別提示詞
    const prompt = `請詳細描述這張圖片的內容。包括：
1. 圖片中的主要物體、人物或場景
2. 如果有文字，請提取所有可見的文字內容
3. 圖片的整體風格、色彩和氛圍
4. 任何值得注意的細節或特徵

請用繁體中文回答，並盡可能詳細和準確。`;
    
    // 發送請求到 Gemini API
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        }
      ])
    });
    
    // 提取回應文字
    const description = result.response.text();
    
    console.log(`圖片識別成功，描述長度: ${description.length} 字符`);
    
    return {
      success: true,
      description: description,
      imageUrl: imageUrl,
      mimeType: mimeType
    };
    
  } catch (error) {
    console.error('圖片識別過程中發生錯誤:', error);
    
    // 如果是 API 密鑰相關錯誤，嘗試使用下一個密鑰
    if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('rate limit')) {
      console.log('嘗試使用下一個 API 密鑰...');
      try {
        getNextGeminiKey();
        // 遞歸重試一次
        return await recognizeImageContent(imageUrl);
      } catch (retryError) {
        console.error('使用備用 API 密鑰重試失敗:', retryError);
      }
    }
    
    return {
      success: false,
      error: error.message || '圖片識別失敗',
      imageUrl: imageUrl
    };
  }
}

/**
 * 批量識別多張圖片
 * @param {Array<string>} imageUrls - 圖片 URL 陣列
 * @returns {Promise<Array<Object>>} - 識別結果陣列
 */
async function recognizeMultipleImages(imageUrls) {
  const results = [];
  
  for (const imageUrl of imageUrls) {
    try {
      const result = await recognizeImageContent(imageUrl);
      results.push(result);
      
      // 在請求之間添加短暫延遲，避免觸發速率限制
      if (imageUrls.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`識別圖片 ${imageUrl} 時發生錯誤:`, error);
      results.push({
        success: false,
        error: error.message || '圖片識別失敗',
        imageUrl: imageUrl
      });
    }
  }
  
  return results;
}

export {
  recognizeImageContent,
  recognizeMultipleImages
};