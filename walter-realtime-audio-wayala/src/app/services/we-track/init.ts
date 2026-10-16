/**
 * Initialize We-Track services
 * Call this when the app starts
 */
import { mongoService } from './mongoService';
import { memoryService } from './memoryService';

let initialized = false;

export async function initializeWeTrackServices(): Promise<void> {
  if (initialized) {
    console.log('⚠️ We-Track services already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing We-Track services...');
    
    // Initialize MongoDB connections
    await mongoService.connect();
    await memoryService.connect();
    
    initialized = true;
    console.log('✅ We-Track services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize We-Track services:', error);
    // Don't throw - allow app to continue without We-Track
  }
}

export async function shutdownWeTrackServices(): Promise<void> {
  if (!initialized) return;

  try {
    await mongoService.disconnect();
    await memoryService.disconnect();
    initialized = false;
    console.log('✅ We-Track services shut down');
  } catch (error) {
    console.error('❌ Error shutting down We-Track services:', error);
  }
}

