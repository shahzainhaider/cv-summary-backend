require('dotenv').config();
module.exports = {
    port: process.env.PORT || 8000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cv-summary',
    groqApiKey: process.env.GROQ_API_KEY || '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',
    groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
}