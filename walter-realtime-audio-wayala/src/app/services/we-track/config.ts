/**
 * Configuration for We-Track services
 */

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'we-track',
    view: process.env.MONGODB_VIEW || 'finance_events_view',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    modelRouter: process.env.OPENAI_MODEL_ROUTER || 'gpt-4.1-mini-2025-04-14',
    modelPipeline: process.env.OPENAI_MODEL_PIPELINE || 'gpt-4.1-2025-04-14',
  },
  memory: {
    maxHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY || '8', 10),
    collectionName: 'conversation_history',
  },
  output: {
    pngThreshold: 50, // Usar PNG si ≤ 50 filas, Excel si > 50
  },
};

