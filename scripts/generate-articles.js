// ===== 기사 자동 생성 스크립트 (GPT 직접 생성) =====
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 기사 주제 템플릿 (RSS 대신 사용)
const ARTICLE_TOPICS = [
  { category: 'economy', topics: [
    '중앙은행 금리 정책과 인플레이션',
    '글로벌 공급망 변화와 무역',
    '주요국 GDP 성장률 전망',
    '원자재 가격 동향과 시장 영향',
    '기업 실적 발표와 주식시장'
  ]},
  { category: 'politics', topics: [
    '국제 정상회담과 외교 관계',
    '지역 안보 협력과 동맹',
    '국제기구 정책 결정',
    '선거와 정치 변화',
    '국제 제재와 외교적 대응'
  ]},
  { category: 'tech', topics: [
    'AI 기술 발전과 산업 적용',
    '반도체 산업 경쟁과 공급',
    '사이버 보안 위협과 대응',
    '빅테크 기업 규제 동향',
    '신재생 에너지 기술 혁신'
  ]},
  { category: 'health', topics: [
    '신약 개발과 임상시험 결과',
    '공중보건 정책과 예방',
    '의료 시스템 개혁 논의',
    '글로벌 건강 위기 대응',
    '바이오테크 산업 동향'
  ]}
];

async function generateArticle(category, topic) {
  const prompt = `You are a Reuters/Bloomberg professional journalist writing for Korean translation exam preparation.

Generate a REALISTIC news article about: "${topic}"
Category: ${category}

CRITICAL REQUIREMENTS:
1. Write 350-450 words in formal journalistic English
2. Create REALISTIC but FICTIONAL details:
   - Use plausible organization names (e.g., "Federal Reserve", "World Bank", "IMF")
   - Use realistic but generic expert names (e.g., "Dr. Sarah Chen, economist at...")
   - Include believable statistics and figures
   - Use recent-sounding dates (January 2026)
3. Structure: Lead paragraph → Background → Expert quote → Analysis → Outlook
4. Use advanced vocabulary suitable for translation exams:
   - Economic terms: fiscal policy, monetary easing, inflationary pressure
   - Political terms: bilateral relations, diplomatic channels, multilateral framework
   - Technical terms: leverage, benchmark, trajectory, implications

ALSO provide Korean translation for bilingual practice.

Respond with JSON only (no markdown):
{
  "title": "Article headline in English",
  "content": "Full English article (350-450 words)",
  "koreanContent": "전체 한국어 번역 (기사 전문)",
  "summary": "2-3 sentence summary",
  "level": "advanced",
  "keyTerms": [
    {"en": "monetary policy", "ko": "통화 정책"},
    {"en": "fiscal stimulus", "ko": "재정 부양책"},
    {"en": "term3", "ko": "용어3"},
    {"en": "term4", "ko": "용어4"},
    {"en": "term5", "ko": "용어5"}
  ]
}`;

  try {
    console.log(`  Generating article about: ${topic}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // JSON 추출 (마크다운 코드블록 제거)
    let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`  ✅ Generated: ${parsed.title?.substring(0, 50)}...`);
      return parsed;
    } else {
      console.error('  ❌ Failed to parse JSON from response');
      return null;
    }
  } catch (error) {
    console.error('  ❌ Generation error:', error.message);
    return null;
  }
}

async function main() {
  console.log('📰 Starting article generation (GPT Direct Mode)...\n');
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set!');
    process.exit(1);
  }
  
  const articlesPath = path.join(__dirname, '..', 'data', 'articles.json');
  let existingData = { articles: [], categories: [], levels: [] };
  
  try {
    existingData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    console.log(`📂 Loaded existing data: ${existingData.articles.length} articles\n`);
  } catch (e) {
    console.log('📂 Creating new articles.json\n');
  }
  
  // 카테고리/레벨 설정
  existingData.categories = [
    { id: 'economy', name: '경제', icon: '💰' },
    { id: 'politics', name: '정치/외교', icon: '🌍' },
    { id: 'tech', name: '기술', icon: '💻' },
    { id: 'health', name: '보건', icon: '🏥' }
  ];
  
  existingData.levels = [
    { id: 'intermediate', name: '중급', icon: '📗' },
    { id: 'advanced', name: '고급', icon: '📘' },
    { id: 'expert', name: '전문가', icon: '📕' }
  ];
  
  const newArticles = [];
  let articleId = Math.max(0, ...existingData.articles.map(a => a.id || 0)) + 1;
  
  // 각 카테고리에서 랜덤 주제 선택하여 기사 생성
  for (const categoryData of ARTICLE_TOPICS) {
    console.log(`\n📁 Category: ${categoryData.category.toUpperCase()}`);
    
    // 랜덤 주제 선택
    const randomIndex = Math.floor(Math.random() * categoryData.topics.length);
    const topic = categoryData.topics[randomIndex];
    
    const article = await generateArticle(categoryData.category, topic);
    
    if (article && article.content) {
      newArticles.push({
        id: articleId++,
        title: article.title,
        summary: article.summary || article.content.substring(0, 150) + '...',
        content: article.content,
        koreanContent: article.koreanContent || '',
        category: categoryData.category,
        level: article.level || 'advanced',
        source: 'AI Generated',
        keyTerms: article.keyTerms || [],
        wordCount: article.content.split(/\s+/).length,
        generatedAt: new Date().toISOString()
      });
    }
    
    // API 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // 새 기사를 맨 앞에 추가 (최대 100개 유지)
  existingData.articles = [...newArticles, ...existingData.articles].slice(0, 100);
  
  // 저장
  fs.writeFileSync(articlesPath, JSON.stringify(existingData, null, 2));
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Complete! Generated ${newArticles.length} new articles.`);
  console.log(`📊 Total articles: ${existingData.articles.length}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
