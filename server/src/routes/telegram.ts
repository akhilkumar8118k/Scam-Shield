import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { analyzeContent, runProgrammedChecks } from '../services/gemini';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const update = req.body;
    
    // Telegram sends updates. We only care about messages containing text.
    if (!update?.message?.text || !update?.message?.chat?.id) {
      // Must return 200 OK immediately to satisfy Telegram's webhook check
      res.status(200).send('OK');
      return;
    }

    // Immediately respond 200 OK to Telegram to prevent 408 Request Timeout
    res.status(200).send('OK');

    const chatId = update.message.chat.id;
    const text = update.message.text;
    console.log(`[Telegram Webhook] Received message from chat ${chatId}: "${text}"`);

    // Process analysis in background
    (async () => {
      try {
        // Run programmatic checks
        const programmedFindings = runProgrammedChecks(text, 'message');
        
        // Pass to Gemini AI
        const { parsed: aiResult, error: aiError } = await analyzeContent(text, 'message', 'en');
        
        let assessment = aiResult?.assessment || 'insufficient_evidence';
        let summary = aiResult?.summary || '';
        
        // Fallback alignment logic if AI fails or misses strict rules
        if (!aiResult) {
            if (programmedFindings.length > 0) {
                 assessment = 'some_concerns';
                 summary = `Limited analysis — AI unavailable. Programmed checks detected suspicious patterns. ${aiError || ''}`;
            } else {
                 assessment = 'insufficient_evidence';
                 summary = `Limited analysis — AI unavailable. ${aiError || ''}`;
            }
        } else {
            const hasStrictRule = programmedFindings.some(f => !f.source.includes('Uncertain'));
            if (hasStrictRule && (assessment === 'few_signals_detected' || assessment === 'insufficient_evidence')) {
                assessment = 'some_concerns';
            }
        }

        // Map assessment to risk score
        let riskScore = 0;
        switch (assessment) {
          case 'high_concern': riskScore = 90; break;
          case 'some_concerns': riskScore = 60; break;
          case 'few_signals_detected': riskScore = 30; break;
          case 'insufficient_evidence': riskScore = 0; break;
        }

        console.log(`[Telegram Webhook] Result for chat ${chatId}: Risk=${assessment}, Score=${riskScore}`);

        // Save the submitted message, risk score, risk level, and timestamp into the database
        const { error: dbError } = await supabase
          .from('telegram_logs')
          .insert({
            chat_id: chatId,
            message_text: text,
            risk_level: assessment,
            risk_score: riskScore,
            summary: summary
          });

        if (dbError) {
          console.error('[Telegram Webhook] Error saving to Supabase:', dbError);
        } else {
          console.log('[Telegram Webhook] Saved successfully to Supabase');
        }

        // Send a reply back to the Telegram chat
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
          const riskLevelDisplay = assessment.replace(/_/g, ' ').toUpperCase();
          const replyText = `🔍 ScamShield Analysis\n\nRisk Level: ${riskLevelDisplay}\nFraud Score: ${riskScore}/100\n\nReason: ${summary}`;
          
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: replyText
            })
          });

          const tgData = await tgRes.json();
          if (!tgData.ok) {
            console.error('[Telegram Webhook] Telegram sendMessage failed:', tgData);
          } else {
            console.log(`[Telegram Webhook] Reply successfully sent to chat ${chatId}`);
          }
        }
      } catch (bgError) {
        console.error('[Telegram Webhook] Background processing error:', bgError);
      }
    })();
  } catch (error) {
    console.error('Telegram webhook error:', error);
    if (!res.headersSent) {
      res.status(200).send('OK');
    }
  }
});

router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('telegram_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch logs' });
      return;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
