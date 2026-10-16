/**
 * Service for managing conversational memory
 */
import { MongoClient, Db, Collection } from 'mongodb';
import { config } from './config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

class MemoryService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private memory: Map<string, Message[]> = new Map();
  private readonly maxHistory = config.memory.maxHistory;
  private readonly collectionName = config.memory.collectionName;

  async connect(): Promise<void> {
    if (this.client) return;

    try {
      this.client = new MongoClient(config.mongodb.uri);
      await this.client.connect();
      this.db = this.client.db(config.mongodb.database);
      console.log('✅ MemoryService: Connected to MongoDB');
    } catch (error) {
      console.error('❌ MemoryService: Failed to connect to MongoDB:', error);
      // Continuar sin MongoDB (solo memoria en RAM)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async addMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    // Add to in-memory cache
    if (!this.memory.has(userId)) {
      this.memory.set(userId, []);
    }

    const messages = this.memory.get(userId)!;
    messages.push({ role, content, timestamp: new Date() });

    // Keep only last maxHistory messages
    if (messages.length > this.maxHistory) {
      messages.shift();
    }

    // Save to MongoDB (async, non-blocking)
    this.saveToMongoDB(userId, role, content).catch((error) => {
      console.error('Error saving message to MongoDB:', error);
    });
  }

  private async saveToMongoDB(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    if (!this.db) return;

    try {
      const collection: Collection = this.db.collection(this.collectionName);
      await collection.insertOne({
        user_id: userId,
        role,
        content,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
      // Don't throw - continue with in-memory storage
    }
  }

  async getMessages(userId: string): Promise<Message[]> {
    // First check in-memory cache
    if (this.memory.has(userId) && this.memory.get(userId)!.length > 0) {
      return [...this.memory.get(userId)!];
    }

    // If not in cache, try to load from MongoDB
    const messages = await this.loadFromMongoDB(userId);

    // Update in-memory cache
    if (messages.length > 0) {
      this.memory.set(userId, messages);
    }

    return messages;
  }

  private async loadFromMongoDB(userId: string): Promise<Message[]> {
    if (!this.db) return [];

    try {
      const collection: Collection = this.db.collection(this.collectionName);
      const docs = await collection
        .find({ user_id: userId })
        .sort({ timestamp: 1 })
        .limit(this.maxHistory)
        .toArray();

      return docs.map((doc) => ({
        role: doc.role as 'user' | 'assistant',
        content: doc.content,
        timestamp: doc.timestamp,
      }));
    } catch (error) {
      console.error('Error loading from MongoDB:', error);
      return [];
    }
  }

  async getConversationContext(userId: string): Promise<string> {
    const messages = await this.getMessages(userId);
    if (messages.length === 0) return '';

    return messages
      .map((msg) => {
        const roleLabel = msg.role === 'user' ? 'Usuario' : 'Asistente';
        return `${roleLabel}: ${msg.content}`;
      })
      .join('\n');
  }

  async clearMemory(userId: string): Promise<void> {
    // Clear in-memory cache
    this.memory.delete(userId);

    // Clear from MongoDB
    if (this.db) {
      try {
        const collection: Collection = this.db.collection(this.collectionName);
        await collection.deleteMany({ user_id: userId });
      } catch (error) {
        console.error('Error clearing from MongoDB:', error);
      }
    }
  }
}

// Singleton instance
export const memoryService = new MemoryService();

