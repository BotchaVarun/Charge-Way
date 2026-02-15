import { type User, type InsertUser } from "@shared/schema";
import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, query, where, addDoc } from "firebase/firestore";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class FirebaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as User;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate a new ID using randomUUID (or leverage Firestore auto-id, but keeping consistent with schema)
    // However, schema uses randomUUID default. Let's let Firestore handle ID generation if we want, or supply one.
    // The schema defines 'id' as a varchar.
    // Let's use crypto.randomUUID() for consistency with the original code if needed, 
    // or just use the doc ID from firestore. 
    // The original code used randomUUID. Let's stick to that to be safe with the schema.
    const { randomUUID } = await import("crypto");
    const id = randomUUID();
    const user: User = { ...insertUser, id };

    await setDoc(doc(db, "users", id), user);
    return user;
  }
}

export const storage = new FirebaseStorage();
