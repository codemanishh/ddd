import bcrypt from "bcrypt";
import { db } from "../server/db";
import { restaurants, tables } from "../shared/schema";

async function addAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log("Usage: npx tsx script/add-admin.ts <admin_uid> <password> <restaurant_name> <email> [table_count]");
    console.log("Example: npx tsx script/add-admin.ts mypub mypassword123 'My Awesome Pub' owner@mypub.com 15");
    process.exit(1);
  }

  const [adminUid, password, restaurantName, email, tableCountStr] = args;
  const tableCount = parseInt(tableCountStr || "10", 10);

  console.log(`Creating admin: ${adminUid}`);
  
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [restaurant] = await db.insert(restaurants).values({
      adminUid,
      password: hashedPassword,
      restaurantName,
      email,
      tableCount,
    }).returning();

    console.log(`Restaurant created: ${restaurant.restaurantName}`);

    const tableData = [];
    for (let i = 1; i <= tableCount; i++) {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      tableData.push({
        adminUid,
        tableNumber: i,
        status: "vacant" as const,
        otp,
      });
    }

    await db.insert(tables).values(tableData);
    console.log(`${tableCount} tables created!`);

    console.log("\n--- Login Details ---");
    console.log(`Admin URL: /admin/${adminUid}`);
    console.log(`Password: ${password}`);
    console.log(`Customer Menu: /user/${adminUid}/menu`);
    
    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') {
      console.error("Error: Admin UID or email already exists!");
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

addAdmin();
