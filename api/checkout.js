// Crée une session Stripe Checkout pour débloquer le programme de rééducation premium.
// Si STRIPE_SECRET_KEY n'est pas configurée, renvoie { demo: true } : le front
// débloque alors le contenu en mode démo (utile pour tester l'UX avant d'activer Stripe).

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.STRIPE_SECRET_KEY;
  const body = req.body || {};
  const origin = body.origin || req.headers.origin || `https://${req.headers.host}`;

  // Aucune clé Stripe : mode démo (paiement non activé)
  if (!key) {
    return res.status(200).json({ demo: true });
  }

  try {
    const Stripe = require("stripe");
    const stripe = new Stripe(key);
    const unitAmount = parseInt(process.env.PREMIUM_PRICE_CENTS || "100", 10);
    const currency = process.env.PREMIUM_CURRENCY || "eur";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: "Programme de rééducation personnalisé",
              description:
                "Accès complet : exercices détaillés guidés, plan de reprise par phases et programme walk-run de retour à la course.",
            },
          },
        },
      ],
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancel`,
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("Checkout error:", e);
    return res.status(500).json({ error: e.message });
  }
};
