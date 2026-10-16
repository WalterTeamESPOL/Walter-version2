/**
 * Service for MongoDB operations
 */
import { MongoClient, Db, Collection } from 'mongodb';
import { config } from './config';

type PipelineStage = Record<string, any>;

class MongoService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    if (this.client) return;

    try {
      this.client = new MongoClient(config.mongodb.uri);
      await this.client.connect();
      this.db = this.client.db(config.mongodb.database);
      
      // Test connection
      await this.client.db('admin').command({ ping: 1 });
      console.log('✅ MongoService: Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoService: Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async executePipeline(pipeline: PipelineStage[]): Promise<any[]> {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }

    try {
      console.log('🗄️ [MONGO] Executing pipeline');
      console.log('🗄️ [MONGO] Database:', config.mongodb.database);
      console.log('🗄️ [MONGO] Collection/View:', config.mongodb.view);
      console.log('🗄️ [MONGO] Pipeline stages:', pipeline.length);
      console.log('🗄️ [MONGO] Full pipeline:', JSON.stringify(pipeline, null, 2));
      
      const collection: Collection = this.db.collection(config.mongodb.view);
      
      // Check if collection exists and get count
      const collectionExists = await collection.findOne({});
      console.log('🗄️ [MONGO] Collection exists:', !!collectionExists);
      if (collectionExists) {
        const totalCount = await collection.countDocuments();
        console.log('🗄️ [MONGO] Total documents in collection:', totalCount);
      }
      
      console.log('🗄️ [MONGO] Starting aggregation...');
      const startTime = Date.now();
      const cursor = collection.aggregate(pipeline);
      const results = await cursor.toArray();
      const elapsedTime = Date.now() - startTime;
      
      console.log('✅ [MONGO] Pipeline executed successfully');
      console.log('🗄️ [MONGO] Results:', {
        document_count: results.length,
        elapsed_time_ms: elapsedTime,
        first_doc_keys: results[0] ? Object.keys(results[0]) : [],
      });
      
      if (results.length > 0) {
        console.log('🗄️ [MONGO] First document preview:', JSON.stringify(results[0], null, 2).substring(0, 500));
      }
      
      return results;
    } catch (error) {
      console.error('❌ [MONGO] Error executing pipeline');
      console.error('❌ [MONGO] Error type:', error?.constructor?.name);
      console.error('❌ [MONGO] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [MONGO] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async getViewSample(limit: number = 5): Promise<any[]> {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }

    try {
      console.log('🗄️ [MONGO] Getting sample data');
      console.log('🗄️ [MONGO] Limit:', limit);
      console.log('🗄️ [MONGO] Collection/View:', config.mongodb.view);
      
      const collection: Collection = this.db.collection(config.mongodb.view);
      const cursor = collection.find().limit(limit);
      const results = await cursor.toArray();
      
      console.log('🗄️ [MONGO] Sample data retrieved:', {
        count: results.length,
        first_doc_keys: results[0] ? Object.keys(results[0]) : [],
      });
      
      return results;
    } catch (error) {
      console.error('❌ [MONGO] Error getting view sample:', error);
      console.error('❌ [MONGO] Error message:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
}

// Singleton instance
export const mongoService = new MongoService();

