const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { OpenAI } = require('openai');
const RateLimiter = require('./utils/rateLimiter');

const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const rateLimiter = new RateLimiter(process.env.MONTHLY_LIMIT || 1000);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

// Usage endpoint
app.get('/usage/:userId', async (req, res) => {
  try {
    const usage = await rateLimiter.getUsage(req.params.userId);
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate content
app.post('/generate', async (req, res) => {
  try {
    const { prompt, user_id } = req.body;
    
    if (!prompt || !user_id) {
      return res.status(400).json({ 
        error: 'prompt and user_id required' 
      });
    }

    // Check rate limit
    if (!await rateLimiter.checkLimit(user_id)) {
      return res.status(429).json({
        error: 'Monthly limit exceeded',
        upgrade_url: 'https://velariq.ai/upgrade',
        pro_benefits: [
          '50,000 API calls/month',
          'GPT-4 access',
          'Fully managed hosting',
          'Analytics dashboard'
        ]
      });
    }

    // Generate content
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });

    await rateLimiter.recordUsage(user_id);

    res.json({
      content: response.choices[0].message.content,
      model: 'gpt-3.5-turbo',
      tokens: response.usage.total_tokens,
      remaining_calls: await rateLimiter.getRemainingCalls(user_id)
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Generation failed' });
  }
});

app.listen(port, () => {
  console.log(`🧠 VelarIQ Brain Free running on port ${port}`);
});
