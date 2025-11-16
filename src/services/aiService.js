const { Ollama } = require('ollama');
const CustomError = require('../utils/customError');
const serverConfig = require('../config/server.config');

// Initialize Ollama client
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
});

/**
 * Generate CV summary using Ollama
 * @param {string} cvText - Extracted text from CV
 * @returns {Promise<string>} Generated summary
 */
const generateSummaryWithOllama = async (cvText) => {
  try {
    // Limit text length to avoid token limits (most models have 4k-8k context)
    const maxTextLength = 4000;
    const truncatedText = cvText.length > maxTextLength 
      ? cvText.substring(0, maxTextLength) + '...' 
      : cvText;

    const prompt = `You are a professional CV analyzer. Analyze the following CV/resume and create a concise, well-structured summary in 150-200 words.

The summary should include:
1. Professional background and experience level
2. Key technical and soft skills
3. Education highlights
4. Notable achievements or accomplishments
5. Career focus or specialization

Write in a clear, professional tone. Use bullet points or short paragraphs.

CV Content:
${truncatedText}

Please provide the summary now:`;

    const model = process.env.OLLAMA_MODEL || 'llama3';

    const response = await ollama.generate({
      model: model,
      prompt: prompt,
      options: {
        temperature: 0.7, // Balance between creativity and consistency
        num_predict: 400, // Limit response to ~400 tokens (roughly 300 words)
      }
    });

    const summary = response.response?.trim() || 'Summary generation completed but no content returned.';

    // Validate summary length
    if (summary.length < 50) {
      throw new Error('Generated summary is too short. Please try again.');
    }

    return summary;
  } catch (error) {
    // Check if it's a connection error (Ollama not running)
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      throw new CustomError(503, 'Ollama service is not running. Please start Ollama service or check OLLAMA_HOST in environment variables.');
    }
    
    // Check if model is not found
    if (error.message.includes('model') && error.message.includes('not found')) {
      throw new CustomError(404, `Ollama model "${process.env.OLLAMA_MODEL || 'llama3'}" not found. Please install it using: ollama pull ${process.env.OLLAMA_MODEL || 'llama3'}`);
    }

    throw new CustomError(500, `Failed to generate summary: ${error.message}`);
  }
};

/**
 * Test Ollama connection
 * @returns {Promise<boolean>} True if connection successful
 */
const testOllamaConnection = async () => {
  try {
    const model = process.env.OLLAMA_MODEL || 'llama3';
    await ollama.generate({
      model: model,
      prompt: 'test',
      options: { num_predict: 5 }
    });
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateSummaryWithOllama,
  testOllamaConnection,
};
