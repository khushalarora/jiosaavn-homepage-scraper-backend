import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import vm from 'vm';

let cachedData = null;
let lastFetched = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 3; // 3 hours

const scrapeJioSaavnHome = async () => {
  const response = await fetch('https://www.jiosaavn.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  const scriptTag = $('script').filter((i, el) => {
    const content = $(el).html();
    return content && content.includes('window.__INITIAL_DATA__');
  }).first().html();

  if (scriptTag) {
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(scriptTag, sandbox);
    cachedData = sandbox.window.__INITIAL_DATA__;
    lastFetched = Date.now();
  }
};

export default async function handler(req, res) {
  const now = Date.now();
  if (!cachedData || (now - lastFetched > CACHE_DURATION)) {
    try {
      await scrapeJioSaavnHome();
    } catch (err) {
      return res.status(500).json({ error: 'Scraping failed', details: err.message });
    }
  }

  if (cachedData) {
    res.status(200).json(cachedData);
  } else {
    res.status(500).json({ error: 'No data available' });
  }
}
