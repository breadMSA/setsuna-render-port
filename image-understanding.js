// 圖像理解模塊 - 使用 Google GenAI 進行圖片內容理解和文字識別
const { GoogleGenAI, createUserContent } = require('@google/genai');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// 確保臨時目錄存在
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// 從環境變數或配置中獲取 API 密鑰
function getGeminiApiKey() {
  // 嘗試從多個來源獲取 API 密鑰
  return process.env.GEMINI_API_KEY || 
         process.env.GOOGLE_API_KEY || 
         global.GEMINI_API_KEYS?.[0] || 
         null;
}

/**
 * 從URL下載圖片並轉換為 base64
 * @param {string} url - 圖片URL
 * @returns {Promise<{data: string, mimeType: string}>} - base64 數據和 MIME 類型
 */
async function downloadImageAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const base64Data = buffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    return {
      data: base64Data,
      mimeType: mimeType
    };
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * 使用 Google GenAI 進行圖像理解和文字識別
 * @param {string} imageUrl - 圖片URL
 * @param {string} task - 任務類型：'ocr'（文字識別）、'describe'（圖像描述）、'analyze'（圖像分析）
 * @param {string} customPrompt - 自定義提示詞（可選）
 * @returns {Promise<Object>} - 識別結果
 */
async function analyzeImageWithGemini(imageUrl, task = 'ocr', customPrompt = null) {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Google GenAI API key not found. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
  }
  
  try {
    // 初始化 Google GenAI
    const ai = new GoogleGenAI({ apiKey });
    
    // 下載圖片並轉換為 base64
    const { data: base64Data, mimeType } = await downloadImageAsBase64(imageUrl);
    
    // 根據任務類型設置提示詞
    let prompt;
    switch (task) {
      case 'ocr':
        prompt = customPrompt || `請仔細識別這張圖片中的所有文字內容，包括中文、英文和其他語言。請按照原始排版格式輸出文字，保持換行和段落結構。如果圖片中沒有文字，請回答「圖片中沒有可識別的文字」。`;
        break;
      case 'describe':
        prompt = customPrompt || `請詳細描述這張圖片的內容，包括：
1. 主要物體和人物
2. 場景和背景
3. 顏色和光線
4. 整體氛圍和風格
請用繁體中文回答。`;
        break;
      case 'analyze':
        prompt = customPrompt || `請分析這張圖片，包括：
1. 圖片類型（照片、插畫、截圖等）
2. 主要內容和元素
3. 可能的用途或背景
4. 任何值得注意的細節
請用繁體中文回答。`;
        break;
      default:
        prompt = customPrompt || '請描述這張圖片的內容。';
    }
    
    // 創建請求內容
    const contents = createUserContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ]);
    
    // 發送請求到 Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: {
        temperature: 0.1, // 較低的溫度以獲得更準確的結果
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048
      }
    });
    
    // 提取回應文字
    const resultText = response.text || '';
    
    return {
      text: resultText.trim(),
      success: true,
      task: task,
      imageUrl: imageUrl
    };
    
  } catch (error) {
    console.error('Error in Google GenAI image analysis:', error);
    return {
      text: '',
      success: false,
      error: error.message,
      task: task,
      imageUrl: imageUrl
    };
  }
}

/**
 * 從圖片中提取文字（OCR功能，兼容原有接口）
 * @param {string} imageUrl - 圖片URL
 * @param {string} lang - 語言代碼（保留兼容性，實際由 Gemini 自動識別）
 * @returns {Promise<Object>} - 識別結果
 */
async function extractTextFromImage(imageUrl, lang = 'auto') {
  try {
    const result = await analyzeImageWithGemini(imageUrl, 'ocr');
    return result;
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * 描述圖片內容
 * @param {string} imageUrl - 圖片URL
 * @param {string} customPrompt - 自定義提示詞（可選）
 * @returns {Promise<Object>} - 描述結果
 */
async function describeImage(imageUrl, customPrompt = null) {
  try {
    const result = await analyzeImageWithGemini(imageUrl, 'describe', customPrompt);
    return result;
  } catch (error) {
    console.error('Error in describeImage:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * 分析圖片內容
 * @param {string} imageUrl - 圖片URL
 * @param {string} customPrompt - 自定義提示詞（可選）
 * @returns {Promise<Object>} - 分析結果
 */
async function analyzeImage(imageUrl, customPrompt = null) {
  try {
    const result = await analyzeImageWithGemini(imageUrl, 'analyze', customPrompt);
    return result;
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * 回答關於圖片的問題
 * @param {string} imageUrl - 圖片URL
 * @param {string} question - 問題
 * @returns {Promise<Object>} - 回答結果
 */
async function askAboutImage(imageUrl, question) {
  try {
    const prompt = `請根據這張圖片回答以下問題：${question}`;
    const result = await analyzeImageWithGemini(imageUrl, 'custom', prompt);
    return result;
  } catch (error) {
    console.error('Error in askAboutImage:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  extractTextFromImage,    // 兼容原有 OCR 接口
  describeImage,          // 新功能：描述圖片
  analyzeImage,           // 新功能：分析圖片
  askAboutImage,          // 新功能：回答關於圖片的問題
  analyzeImageWithGemini  // 通用圖像理解函數
};