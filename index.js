require('dotenv').config();
const admin = require("firebase-admin");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Initialize Firebase Admin SDK using environment variables
const firebaseConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Firebase Database References
const db = admin.database();
const paymentsRef = db.ref("payments");
const productsRef = db.ref("products");

// Function to send Telegram notifications
async function sendTelegramNotification(message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
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
  "child_added",
  async (snapshot) => {
    try {
      const paymentData = snapshot.val();
      const paymentId = snapshot.key;

      if (!paymentData || !paymentData.productId) {
        console.error(`Missing productId in payment data for Payment ID: ${paymentId}`);
        return;
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
        `💬 *For more details, check the transaction on the [dashboard](https://a.official-store.in)!*`;

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

// Keep the process alive
setInterval(() => console.log("Heartbeat..."), 60000);
