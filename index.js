const admin = require("firebase-admin");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Initialize Firebase Admin SDK
const serviceAccount = require("./service-account-key.json"); // Replace with your Firebase service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ecommerce-638a3-default-rtdb.firebaseio.com", // Replace with your database URL
});

// Firebase Database References
const db = admin.database();
const paymentsRef = db.ref("payments"); // Reference to the "payments" node
const productsRef = db.ref("products"); // Reference to the "products" node

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = "7648305074:AAFVZGfzI42JueHKmepmTU4n2c5KoRbEvQg"; // Replace with your bot token
const CHAT_ID = "-1002487166805"; // Replace with your Telegram chat ID

// Function to send Telegram notifications
async function sendTelegramNotification(message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID, // ID of the chat where the message will be sent
        text: message, // Message text
        parse_mode: "Markdown", // Enable Markdown formatting for the message
      }),
    });

    if (!response.ok) {
      console.error("Failed to send Telegram notification:", await response.text());
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}

// Function to fetch product title
async function getProductTitle(productId) {
  try {
    if (!productId) {
      console.warn("Product ID is undefined or null.");
      return "Unknown Product";
    }

    const productSnapshot = await productsRef.child(productId).once("value");
    const productData = productSnapshot.val();

    if (!productData) {
      console.warn(`No product found for Product ID: ${productId}`);
      return "Unknown Product";
    }

    return productData.name || "Unknown Product";
  } catch (error) {
    console.error("Error fetching product title:", error);
    return "Unknown Product";
  }
}
// Listen for new payments
paymentsRef.on(
    "child_added", // Event triggered when a new payment is added
    async (snapshot) => {
      try {
        const paymentData = snapshot.val(); // Extract payment data
        const paymentId = snapshot.key; // Extract payment ID
  
       
  
        // Check for correct productId (case-sensitive)
        if (!paymentData || !paymentData.productId) {
          console.error(`Missing productId in payment data for Payment ID: ${paymentId}`);
          return; // Skip processing this payment
        }
  
        const productTitle = await getProductTitle(paymentData.productId);
  
        const message = `🚨 **New Payment Detected!** 🚨\n\n` +
          `💳 **Payment ID**: ${paymentId}\n` +
          `💰 **Amount**: ₹${paymentData.amount}\n` +
          `📧 **Customer Email**: ${paymentData.customerEmail}\n` +
          `📱 **Customer Phone**: ${paymentData.customerPhone}\n\n` +
          `🧾 **Payment Proof**: [View Payment Proof](${paymentData.paymentProof})\n\n` +
          `🛍️ **Product Title**: ${productTitle}\n` +
          `🛍️ **Product ID**: ${paymentData.productId}\n\n` +
          `📅 **Timestamp**: ${new Date(paymentData.timestamp).toLocaleString()}\n\n` +
          `🔍 **Product Details**:\n` +
          `- *Last Update*: ${new Date().toLocaleString()}\n\n` +
          `💬 *For more details, check the transaction on the [dashboard](https://www.a.official-store.in)!*`;
  
        await sendTelegramNotification(message);
        console.log("Notification sent successfully!");
      } catch (error) {
        console.error("Error processing payment change:", error);
      }
    },
    (error) => {
      console.error("Error listening to Firebase changes:", error);
    }
  );
  

setInterval(() => console.log("a..."), 60000);
