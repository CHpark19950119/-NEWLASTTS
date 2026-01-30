// ===== 기사 자동 생성 스크립트 (NewsAPI + GPT 확장) =====
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY || '31c8561e2d334252b9c6a06d5a30702a';

// NewsAPI 카테고리 매핑
const CATEGORIES = [
  { newsapi: 'business', local: 'economy', name: '경제' },
  { newsapi: 'technology', local: 'tech', name: '기술' },
  { newsapi: 'health', local: 'health', name: '보건' },
  { newsapi: 'science', local: 'science', name: '과학' }
];

// NewsAPI에서 뉴스 가져오기
async function fetchNewsAPI(category) {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=3&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      console.error(`NewsAPI error: ${data.message}`);
      return [];
    }
    
    return data.articles.filter(a => a.title && a.description && a.title !== '[Removed]').map(a => ({
      title: a.title,
      description: a.description,
      source: a.source?.name || 'News',
      url: a.url
    }));
  } catch (error) {
    console.error(`NewsAPI fetch error: ${error.message}`);
    return [];
  }
}

// GPT로 기사 본문 확장 + 한국어 번역 생성
async function expandArticle(title, description, category) {
  const prompt = `You are a professional news editor and translator.

Based on this real news:
- Title: "${title}"
- Summary: "${description}"
- Category: ${category}

TASK 1: Expand into a full 350-450 word English news article
- Use formal journalistic style (Reuters/Bloomberg level)
- Structure: Lead → Background → Analysis → Expert perspective → Outlook
- Include realistic details, statistics, expert quotes
- Use advanced vocabulary for translation exam preparation

TASK 2: Translate the ENTIRE article to Korean
- Professional translation quality (통번역대학원 수준)
- Natural Korean, not translationese

TASK 3: Extract 5 key terms for vocabulary study

Respond with JSON only (no markdown):
{
  "title": "${title}",
  "content": "Full English article (350-450 words)",
  "koreanContent": "전체 한국어 번역",
  "summary": "${description}",
  "level": "advanced",
  "keyTerms": [
    {"en": "term1", "ko": "용어1"},
    {"en": "term2", "ko": "용어2"},
    {"en": "term3", "ko": "용어3"},
    {"en": "term4", "ko": "용어4"},
    {"en": "term5", "ko": "용어5"}
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // 토큰 사용량 로그
    if (data.usage) {
      console.log(`  📊 Tokens used: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    }
    
    // JSON 추출
    let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Article expansion error:', error.message);
    return null;
  }
}

async function main() {
  console.log('📰 Starting article generation (NewsAPI + GPT)...\n');
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set!');
    process.exit(1);
  }
  
  const articlesPath = path.join(__dirname, '..', 'data', 'articles.json');
  let existingData = { articles: [], categories: [], levels: [] };
  
  try {
    existingData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    console.log(`📂 Existing articles: ${existingData.articles.length}\n`);
  } catch (e) {
    console.log('📂 Creating new articles.json\n');
  }
  
  // 카테고리/레벨 설정
  existingData.categories = [
    { id: 'economy', name: '경제', icon: '💰' },
    { id: 'politics', name: '정치/외교', icon: '🌍' },
    { id: 'tech', name: '기술', icon: '💻' },
    { id: 'health', name: '보건', icon: '🏥' },
    { id: 'science', name: '과학', icon: '🔬' }
  ];
  
  existingData.levels = [
    { id: 'intermediate', name: '중급', icon: '📗' },
    { id: 'advanced', name: '고급', icon: '📘' },
    { id: 'expert', name: '전문가', icon: '📕' }
  ];
  
  const newArticles = [];
  let articleId = Math.max(0, ...existingData.articles.map(a => a.id || 0)) + 1;
  
  // 각 카테고리에서 기사 가져오기
  for (const cat of CATEGORIES) {
    console.log(`\n📁 Category: ${cat.name} (${cat.newsapi})`);
    
    const news = await fetchNewsAPI(cat.newsapi);
    
    if (news.length === 0) {
      console.log('  ⚠️ No news found, skipping...');
      continue;
    }
    
    // 첫 번째 기사만 처리
    const item = news[0];
    console.log(`  📄 Processing: ${item.title.substring(0, 50)}...`);
    
    const expanded = await expandArticle(item.title, item.description, cat.name);
    
    if (expanded && expanded.content) {
      newArticles.push({
        id: articleId++,
        title: expanded.title || item.title,
        summary: expanded.summary || item.description,
        content: expanded.content,
        koreanContent: expanded.koreanContent || '',
        category: cat.local,
        level: expanded.level || 'advanced',
        source: item.source,
        sourceUrl: item.url,
        keyTerms: expanded.keyTerms || [],
        wordCount: expanded.content.split(/\s+/).length,
        generatedAt: new Date().toISOString()
      });
      console.log(`  ✅ Added article #${articleId - 1}`);
    }
    
    // API 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // 새 기사를 맨 앞에 추가
  existingData.articles = [...newArticles, ...existingData.articles].slice(0, 100);
  
  // 저장
  fs.writeFileSync(articlesPath, JSON.stringify(existingData, null, 2));
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Generated ${newArticles.length} new articles`);
  console.log(`📊 Total articles: ${existingData.articles.length}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
