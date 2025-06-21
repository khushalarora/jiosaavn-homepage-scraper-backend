import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import cors from 'cors';
import vm from 'node:vm';

const app = express();
app.use(cors());

let cachedData = null;
let lastFetched = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 3; // 3 hours

const scrapeJioSaavnHome = async () => {
  const response = await fetch('https://www.jiosaavn.com/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const scriptContent = $('script')
    .filter((_, el) => {
      const content = $(el).html();
      return content && content.trim().startsWith('window.__INITIAL_DATA__');
    })
    .first()
    .html();

  if (scriptContent) {
    const sandbox = { window: {} };
    try {
      vm.createContext(sandbox);
      vm.runInContext(scriptContent, sandbox);
      cachedData = sandbox.window.__INITIAL_DATA__;
      lastFetched = Date.now();
    } catch (err) {
      console.error('❌ VM parsing error:', err);
    }
  } else {
    console.error('❌ No script tag found!');
  }
};

app.get('/api/homepage', async (req, res) => {
  const now = Date.now();
  if (!cachedData || now - lastFetched > CACHE_DURATION) {
    await scrapeJioSaavnHome();
  }

  if (cachedData) {
    res.json(cachedData);
  } else {
    res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
});

// Export handler for Vercel
export default app;
