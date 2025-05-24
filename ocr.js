// OCR模塊 - 使用Tesseract.js進行圖片文字識別
const { createWorker } = require('tesseract.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// 嘗試導入 sharp 庫進行圖像預處理
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp library not available, image preprocessing will be skipped');
  sharp = null;
}

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
  // 使用新的 API 創建已預加載語言的 worker，並設置更多配置選項
  const worker = await createWorker(lang);
  
  try {
    // 設置識別參數，提高中文識別準確度
    await worker.setParameters({
      tessedit_pageseg_mode: '1',       // 自動頁面分割模式
      tessedit_char_whitelist: '',     // 不限制字符
      tessedit_ocr_engine_mode: '2',   // 使用 LSTM 引擎
      preserve_interword_spaces: '1',  // 保留詞間空格
      tessjs_create_pdf: '0',          // 不創建 PDF
      tessjs_create_hocr: '0',         // 不創建 HOCR
      tessjs_create_tsv: '0',          // 不創建 TSV
      tessjs_create_box: '0',          // 不創建 BOX
      tessjs_create_unlv: '0',         // 不創建 UNLV
      tessjs_create_osd: '0'           // 不創建 OSD
    });
    
    // 直接識別
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
 * 預處理圖像以提高OCR識別率
 * @param {string} inputPath - 輸入圖像路徑
 * @param {string} outputPath - 輸出圖像路徑
 * @returns {Promise<string>} - 處理後的圖像路徑
 */
async function preprocessImage(inputPath, outputPath) {
  // 如果沒有 sharp 庫，則跳過預處理
  if (!sharp) {
    console.log('Sharp library not available, skipping image preprocessing');
    return inputPath;
  }
  
  try {
    // 使用 sharp 進行圖像預處理
    await sharp(inputPath)
      // 調整大小，保持寬高比
      .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
      // 轉換為灰度圖像
      .grayscale()
      // 提高對比度
      .normalize()
      // 銳化圖像
      .sharpen({ sigma: 1.5 })
      // 調整亮度和對比度
      .modulate({ brightness: 1.1, contrast: 1.2 })
      // 保存為 PNG 格式
      .toFormat('png')
      .toFile(outputPath);
    
    console.log('Image preprocessing completed');
    return outputPath;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    // 如果預處理失敗，返回原始圖像路徑
    return inputPath;
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
  let processedFilePath = null;
  
  try {
    // 下載圖片到臨時文件
    tempFilePath = await downloadImage(imageUrl);
    
    // 預處理圖像
    if (sharp) {
      processedFilePath = path.join(tempDir, `processed_${Date.now()}.png`);
      const imageToProcess = await preprocessImage(tempFilePath, processedFilePath);
      
      // 使用Tesseract識別文字
      const text = await recognizeText(imageToProcess, lang);
      
      return {
        text: text.trim(),
        success: true
      };
    } else {
      // 如果沒有 sharp 庫，直接使用原始圖像
      const text = await recognizeText(tempFilePath, lang);
      
      return {
        text: text.trim(),
        success: true
      };
    }
  } catch (error) {
    console.error('Error in OCR process:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  } finally {
    // 清理臨時文件
    const filesToDelete = [tempFilePath, processedFilePath].filter(f => f && fs.existsSync(f));
    
    for (const file of filesToDelete) {
      await unlinkAsync(file).catch(err => {
        console.error(`Error deleting temp file ${file}:`, err);
      });
    }
  }
}

module.exports = {
  extractTextFromImage
};