import { ClientSession, Collection, MongoClient } from "mongodb";

const DATABASE_NAME = process.env.MONGODB_DATABASE;
const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (!uri) {
  throw new Error("Environment variable MONGODB_URI not set, cannot initialize MongoDB connection.");
}

export async function getMongoClient(): Promise<MongoClient | null> {
  try {
    if (process.env.NODE_ENV === "development" && uri) {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };

      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
      }
      return await globalWithMongo._mongoClientPromise;
    }

    if (!clientPromise && uri) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return await clientPromise;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    return null;
  }
}

export async function getDBCollection(collectionName: string): Promise<Collection | null> {
  const client = await getMongoClient();
    if (!client) {
      return null;
    }
    const db = client.db(DATABASE_NAME);
    if (!db) {
      return null;
    }
    const collection = db.collection(collectionName);
    if (!collection) {
      return null;
    }
    return collection;
}

export async function startSession(): Promise<ClientSession | null> {
  const client = await getMongoClient();
  if (!client) {
    return null;
  }
  return client.startSession();
}

export async function endSession(session: ClientSession): Promise<boolean> {
  await session.endSession();
  return session.hasEnded;
}