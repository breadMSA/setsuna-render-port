/**
 * 圖像理解模塊 - 使用Google GenAI API進行圖像理解
 * 此模塊提供圖像理解功能，可以分析圖像內容並生成描述
 */

import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 獲取當前文件的目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 創建臨時目錄
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * 從URL下載圖片並保存到臨時文件
 * @param {string} imageUrl - 圖片URL
 * @returns {Promise<string>} - 臨時文件路徑
 */
async function downloadImage(imageUrl) {
  try {
    // 動態導入node-fetch
    const fetch = (await import('node-fetch')).default;
    
    // 發送請求獲取圖片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`無法下載圖片: ${response.statusText}`);
    }
    
    // 獲取圖片數據
    const buffer = await response.arrayBuffer();
    
    // 創建臨時文件名
    const tempFilePath = path.join(tempDir, `image_${Date.now()}.jpg`);
    
    // 將圖片數據寫入臨時文件
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));
    
    console.log(`圖片已下載到: ${tempFilePath}`);
    return tempFilePath;
  } catch (error) {
    console.error('下載圖片時出錯:', error);
    throw error;
  }
}

/**
 * 使用Google GenAI API分析圖片內容
 * @param {string} imageUrl - 圖片URL
 * @param {string} apiKey - Google GenAI API密鑰
 * @returns {Promise<{success: boolean, description: string, error: string}>} - 分析結果
 */
async function analyzeImage(imageUrl, apiKey) {
  let tempFilePath = null;
  
  try {
    console.log(`開始分析圖片: ${imageUrl}`);
    
    // 檢查API密鑰
    if (!apiKey) {
      throw new Error('未提供Google GenAI API密鑰');
    }
    
    // 下載圖片到臨時文件
    tempFilePath = await downloadImage(imageUrl);
    
    // 讀取圖片文件並轉換為Base64
    const imageBuffer = fs.readFileSync(tempFilePath);
    const base64Image = imageBuffer.toString('base64');
    
    // 初始化Google GenAI客戶端
    const genAI = new GoogleGenAI({ apiKey });
    
    // 使用gemini-pro-vision模型
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // 構建提示詞
    const prompt = "請詳細描述這張圖片中的內容，包括主要物體、人物、場景、顏色、動作等。如果有文字，請提取出來。如果是表格，請分析表格內容。";
    
    // 構建請求
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    });
    
    // 處理響應
    const response = result.response;
    const description = response.text();
    
    console.log(`圖片分析完成，生成描述長度: ${description.length}字符`);
    
    // 清理臨時文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`已刪除臨時文件: ${tempFilePath}`);
    }
    
    return {
      success: true,
      description: description,
      error: ""
    };
  } catch (error) {
    console.error('分析圖片時出錯:', error);
    
    // 清理臨時文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`已刪除臨時文件: ${tempFilePath}`);
    }
    
    return {
      success: false,
      description: "",
      error: error.message || '圖片分析失敗'
    };
  }
}

export { analyzeImage };