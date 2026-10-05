/**
 * ocr.js - Image OCR & MCQ Text Parsing Engine
 * Uses Tesseract.js in-browser with smart text parsing heuristics.
 */

const MCQ_OCR = {
  /**
   * Resizes an image or file to optimal OCR resolution (max 1500px)
   * to ensure fast execution and avoid browser memory crashes on mobile.
   */
  async optimizeImageForOCR(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1500;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw image onto canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Optional: enhance contrast slightly for cleaner OCR
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          // Simple contrast adjustment
          const contrast = 1.15;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;     // R
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // Cross-origin fallback, skip pixel manipulation
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };

      img.onerror = (err) => reject(err);

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof Blob || imageSource instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => (img.src = e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(imageSource);
      } else {
        reject(new Error('Invalid image source'));
      }
    });
  },

  /**
   * Performs in-browser OCR using Tesseract.js with live progress callbacks
   */
  async extractText(imageSource, onProgress) {
    if (!window.Tesseract) {
      throw new Error('Tesseract OCR engine is not loaded. Check internet connection or fill manually.');
    }

    // Step 1: Pre-process image
    if (onProgress) onProgress({ status: 'Optimizing image...', progress: 0.1 });
    const optimizedDataUrl = await this.optimizeImageForOCR(imageSource);

    // Step 2: Run Tesseract recognize
    if (onProgress) onProgress({ status: 'Initializing OCR worker...', progress: 0.2 });

    const result = await Tesseract.recognize(
      optimizedDataUrl,
      'eng',
      {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') {
            const pct = 0.2 + (m.progress || 0) * 0.75;
            onProgress({
              status: `Recognizing text (${Math.round((m.progress || 0) * 100)}%)...`,
              progress: Math.min(pct, 0.95)
            });
          }
        }
      }
    );

    if (onProgress) onProgress({ status: 'Formatting MCQ fields...', progress: 1.0 });

    const rawText = result?.data?.text || '';
    return {
      rawText,
      parsed: this.parseMCQText(rawText),
      optimizedImage: optimizedDataUrl
    };
  },

  /**
   * Intelligently parses raw OCR text into Question and Options A, B, C, D
   */
  parseMCQText(text) {
    if (!text || typeof text !== 'string') {
      return { question: '', options: { A: '', B: '', C: '', D: '' }, detectedAnswer: '', detectedAnswers: [], detectedType: 'single' };
    }

    // Clean whitespace and normalize line breaks
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    let questionLines = [];
    const options = { A: '', B: '', C: '', D: '' };
    let currentOptionKey = null;
    let detectedAnswer = '';
    let detectedAnswers = [];
    let detectedType = 'single';

    // Regex to match Option markers:
    // Matches "A.", "A)", "(A)", "[A]", "A -", "A:", "1.", "(1)", etc.
    const optionRegex = /^(\(?\s*([A-Da-d1-4])\s*[\.\)\:\-\]]\s*)(.*)$/;
    
    // Regex to detect multiple answers keyword: e.g. "Ans: A, B" or "Answer: A and C"
    const ansKeyMultiRegex = /(?:Ans|Answer|Correct\s*Options?|Key)[\s\:\-\.]*([A-Da-d](?:[\s,\&and\-\/]+[A-Da-d])+)/i;
    // Single answer keyword: e.g. "Ans: B", "Answer: (C)", "Key: D"
    const ansKeyRegex = /(?:Ans|Answer|Correct\s*Option|Key)[\s\:\-\.]*([A-Da-d])/i;

    const optMap = {
      '1': 'A', '2': 'B', '3': 'C', '4': 'D',
      'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
      'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line contains multiple answers declaration
      const multiMatch = line.match(ansKeyMultiRegex);
      if (multiMatch && multiMatch[1]) {
        const found = multiMatch[1].toUpperCase().match(/[A-D]/g);
        if (found && found.length > 1) {
          detectedAnswers = Array.from(new Set(found));
          detectedType = 'multiple';
          continue;
        }
      }

      // Check if line contains single answer key declaration
      const ansMatch = line.match(ansKeyRegex);
      if (ansMatch && ansMatch[1] && detectedAnswers.length === 0) {
        detectedAnswer = ansMatch[1].toUpperCase();
        detectedAnswers = [detectedAnswer];
        continue;
      }

      // Check if line starts an option
      const match = line.match(optionRegex);
      if (match) {
        const rawMarker = match[2];
        const key = optMap[rawMarker];
        if (key) {
          currentOptionKey = key;
          const optContent = match[3].trim();
          options[key] = optContent;
          continue;
        }
      }

      // If we are currently accumulating an option's text
      if (currentOptionKey) {
        options[currentOptionKey] += (options[currentOptionKey] ? ' ' : '') + line;
      } else {
        // Still part of the question text
        questionLines.push(line);
      }
    }

    // Question cleanup: remove leading numbers like "1.", "Q1.", "Question 1:"
    let question = questionLines.join(' ').trim();
    question = question.replace(/^(?:Q(?:uestion)?\s*\d*[\.\:\-\s]*|\d+[\.\)\:\-]\s*)/i, '').trim();

    // If options weren't detected via line starts, try inline detection:
    // e.g. "A. 21  B. 80  C. 443  D. 25"
    if (!options.A && !options.B) {
      const inlineRegex = /(?:^|\s)(?:[\(\[]?([A-D])[\.\)\]\:\-])\s+([^A-D\(\[]+)/gi;
      let inlineMatch;
      let lastIndex = 0;
      const foundOpts = {};

      while ((inlineMatch = inlineRegex.exec(cleanText)) !== null) {
        const key = inlineMatch[1].toUpperCase();
        foundOpts[key] = inlineMatch[2].trim();
        if (lastIndex === 0) lastIndex = inlineMatch.index;
      }

      if (foundOpts.A && foundOpts.B) {
        options.A = foundOpts.A || '';
        options.B = foundOpts.B || '';
        options.C = foundOpts.C || '';
        options.D = foundOpts.D || '';
        if (lastIndex > 0) {
          question = cleanText.substring(0, lastIndex).trim();
          question = question.replace(/^(?:Q(?:uestion)?\s*\d*[\.\:\-\s]*|\d+[\.\)\:\-]\s*)/i, '').trim();
        }
      }
    }

    // Detect multiple answers phrase in question text
    if (detectedType === 'single') {
      const multiPhraseRegex = /(?:select all|choose all|choose (?:two|three|multiple)|which of the following are|check all)/i;
      if (multiPhraseRegex.test(question)) {
        detectedType = 'multiple';
      }
    }

    return {
      question: question || cleanText,
      options,
      detectedAnswer,
      detectedAnswers,
      detectedType
    };
  }
};

window.MCQ_OCR = MCQ_OCR;
