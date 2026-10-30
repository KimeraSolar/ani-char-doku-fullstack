import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let connectingPromise: Promise<Db | null> | null = null;

export interface DatabaseStatus {
  isConfigured: boolean;
  usingFallback: boolean;
  error?: string;
}

export async function getDb(): Promise<Db | null> {
  if (dbInstance) return dbInstance;
  if (connectingPromise) return connectingPromise;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE;

  if (!uri || !dbName) {
    console.warn("⚠️ MongoDB environment variables are not fully configured.");
    return null;
  }

  connectingPromise = (async () => {
    try {
      client = new MongoClient(uri, { maxPoolSize: 10 });
      await client.connect();
      dbInstance = client.db(dbName);
      console.log(`⚡ Successfully connected to MongoDB database "${dbName}".`);
      return dbInstance;
    } catch (err) {
      console.error("❌ Failed to connect to MongoDB:", err);
      client = null;
      dbInstance = null;
      return null;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const hasConfig = !!(process.env.MONGODB_URI && process.env.MONGODB_DATABASE);

  if (!hasConfig) {
    return {
      isConfigured: false,
      usingFallback: true,
    };
  }

  try {
    const db = await getDb();
    return {
      isConfigured: !!db,
      usingFallback: !db,
    };
  } catch (err: any) {
    return {
      isConfigured: false,
      usingFallback: true,
      error: err.message,
    };
  }
}
