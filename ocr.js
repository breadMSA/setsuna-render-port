// OCR模塊 - 使用Tesseract.js進行圖片文字識別
const { createWorker } = require('tesseract.js');
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

/**
 * 從URL下載圖片並保存到臨時文件
 * @param {string} url - 圖片URL
 * @returns {Promise<string>} - 臨時文件路徑
 */
async function downloadImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const tempFilePath = path.join(tempDir, `temp_${Date.now()}.png`);
    await writeFileAsync(tempFilePath, buffer);
    return tempFilePath;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * 使用Tesseract.js從圖片中提取文字
 * @param {string} imagePath - 圖片文件路徑
 * @param {string} lang - 語言代碼，默認為'eng+chi_tra'
 * @returns {Promise<string>} - 識別出的文字
 */
async function recognizeText(imagePath, lang = 'eng+chi_tra') {
  const worker = await createWorker({
    logger: progress => {
      if (progress.status === 'recognizing text') {
        console.log(`OCR進度: ${Math.floor(progress.progress * 100)}%`);
      }
    }
  });
  
  try {
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();
    return data.text;
  } catch (error) {
    console.error('Error recognizing text:', error);
    if (worker) {
      await worker.terminate();
    }
    throw error;
  }
}

/**
 * 從圖片URL中提取文字
 * @param {string} imageUrl - 圖片URL
 * @param {string} lang - 語言代碼，默認為'eng+chi_tra'
 * @returns {Promise<{text: string, confidence: number}>} - 識別結果
 */
async function extractTextFromImage(imageUrl, lang = 'eng+chi_tra') {
  let tempFilePath = null;
  
  try {
    // 下載圖片到臨時文件
    tempFilePath = await downloadImage(imageUrl);
    
    // 使用Tesseract識別文字
    const text = await recognizeText(tempFilePath, lang);
    
    return {
      text: text.trim(),
      success: true
    };
  } catch (error) {
    console.error('Error in OCR process:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  } finally {
    // 清理臨時文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      await unlinkAsync(tempFilePath).catch(err => {
        console.error('Error deleting temp file:', err);
      });
    }
  }
}

export {
  extractTextFromImage
};