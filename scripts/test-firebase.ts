
import { storage } from "../server/storage";
import { type InsertUser } from "../shared/schema";

async function runTest() {
    console.log("Starting Firebase integration test...");

    // 1. Create a user
    const newUser: InsertUser = {
        username: `testuser_${Date.now()}`,
        password: "password123",
    };

    console.log(`Attempting to create user: ${newUser.username}`);
    try {
        const createdUser = await storage.createUser(newUser);
        console.log("User created successfully:", createdUser);

        // 2. Retrieve user by ID
        console.log(`Attempting to retrieve user by ID: ${createdUser.id}`);
        const retrievedUserById = await storage.getUser(createdUser.id);
        if (retrievedUserById) {
            console.log("User retrieved by ID successfully:", retrievedUserById);
        } else {
            console.error("Failed to retrieve user by ID.");
        }

        // 3. Retrieve user by username
        console.log(`Attempting to retrieve user by username: ${createdUser.username}`);
        const retrievedUserByUsername = await storage.getUserByUsername(createdUser.username);
        if (retrievedUserByUsername) {
            console.log("User retrieved by username successfully:", retrievedUserByUsername);
        } else {
            console.error("Failed to retrieve user by username.");
        }

    } catch (error) {
        console.error("Test failed with error:", error);
    }

    console.log("Test finished.");
    process.exit(0);
}

runTest();
