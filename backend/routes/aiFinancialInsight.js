const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

/**
 * POST /api/ai/financial-insight
 * Body: { period, snapshot, loans, profitConfig? }
 * Returns: { summary, bullets, direction }
 */
router.post('/financial-insight', auth, async (req, res) => {
  try {
    const { period, snapshot, loans, profitConfig } = req.body;

    if (!snapshot || !period) {
      return res.status(400).json({ success: false, message: 'period and snapshot are required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-YOUR_KEY_HERE') {
      // Return mock data when key is not configured
      return res.json({
        success: true,
        data: {
          summary: `Your clinic's <b>${period}</b> financial performance shows <b>ETB ${(snapshot.totalRevenue || 0).toLocaleString()}</b> in revenue with a collection rate of <b>${snapshot.collectionRate || 0}%</b>. Review the action points below to improve profitability.`,
          bullets: [
            `Focus on reducing the ${snapshot.outstandingAmount > 0 ? 'ETB ' + snapshot.outstandingAmount.toLocaleString() + ' outstanding' : 'outstanding'} amount by following up on pending invoices within 7 days.`,
            `With ${snapshot.patientCount || 0} patients seen, target a 10% increase through referral incentives and appointment reminders.`,
            `Maintain your ${snapshot.collectionRate || 0}% collection rate — the industry benchmark for private clinics is 85%+.`,
          ],
          direction: snapshot.collectionRate >= 85 ? 'grow' : snapshot.collectionRate >= 70 ? 'maintain' : 'caution',
        },
      });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const userContent = `Analyze this ${period} financial data and give directional advice: ${JSON.stringify({ snapshot, loans: loans || [], profitConfig })}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are a financial advisor for New Life Clinic, a healthcare center in Addis Ababa.
All amounts are in ETB (Ethiopian Birr). Be specific, data-driven, and actionable.
Respond ONLY in JSON with this exact shape (no markdown, no code fences):
{
  "summary": "2-sentence summary with key metric highlighted in <b> tags",
  "bullets": ["action point 1", "action point 2", "action point 3"],
  "direction": "grow" | "maintain" | "caution"
}`,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content[0]?.text || '';

    // Parse JSON — strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_) {
      // Attempt to extract JSON object from the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Claude returned non-JSON response');
      }
    }

    if (!parsed.summary || !parsed.bullets || !parsed.direction) {
      throw new Error('Claude response missing required fields');
    }

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('POST /api/ai/financial-insight error:', err.message);
    // Return fallback instead of error so UI doesn't break
    res.json({
      success: true,
      data: {
        summary: `Unable to generate AI insight at this time. <b>Review the key metrics</b> manually and focus on outstanding collections.`,
        bullets: [
          'Follow up on all pending invoices within 48 hours.',
          'Review your pricing structure to ensure alignment with market rates.',
          'Consider running a patient recall campaign to boost visit volume.',
        ],
        direction: 'maintain',
      },
    });
  }
});

module.exports = router;
