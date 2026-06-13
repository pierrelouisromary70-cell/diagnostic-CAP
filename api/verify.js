// Vérifie qu'une session Stripe Checkout a bien été payée.
// Appelé au retour de Stripe avec ?session_id=...
// Sans clé Stripe : mode démo → considéré comme payé.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(200).json({ paid: true, demo: true });

  const sessionId = req.query && req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: "session_id required" });

  try {
    const Stripe = require("stripe");
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res.status(200).json({ paid: session.payment_status === "paid" });
  } catch (e) {
    console.error("Verify error:", e);
    return res.status(500).json({ error: e.message });
  }
};
