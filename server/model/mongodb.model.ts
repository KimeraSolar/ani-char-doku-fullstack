import { MongoClient } from "mongodb";

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
