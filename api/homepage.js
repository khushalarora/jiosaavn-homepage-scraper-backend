import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import vm from 'node:vm';

let cachedData = null;
let lastFetched = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 3; // 3 hours

const scrapeJioSaavnHome = async () => {
  console.log('Scraping JioSaavn homepage...');

  const response = await fetch('https://www.jiosaavn.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const scriptTag = $('script').filter((i, el) => {
    const content = $(el).html();
    return content && content.includes('window.__INITIAL_DATA__');
  }).first().html();

  if (scriptTag) {
    try {
      const context = {
        window: {} // Define window manually
      };
      vm.createContext(context); // Create VM context
      const script = new vm.Script(scriptTag);
      script.runInContext(context); // Run script inside the VM context

      cachedData = context.window.__INITIAL_DATA__;
      lastFetched = Date.now();
      console.log(cachedData);
      console.log('✅ Homepage data scraped and cached.');
    } catch (err) {
      console.error('❌ Failed to evaluate __INITIAL_DATA__:', err);
    }
  } else {
    console.error('❌ Failed to find __INITIAL_DATA__ script tag.');
  }
};

scrapeJioSaavnHome();

// ✅ Vercel handler function
export default async function handler(req, res) {
  const now = Date.now();
  if (!cachedData || now - lastFetched > CACHE_DURATION) {
    await scrapeJioSaavnHome();
  }

  if (cachedData) {
    res.status(200).json(cachedData);
  } else {
    res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
}
