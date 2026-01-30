// ===== DAYOUNG's 통번역 스튜디오 v3 - API Module =====

const API = {
    // Google Cloud 프록시 URL
    PROXY_URL: 'https://claude-proxy-957117035071.us-central1.run.app',
    
    // GPT 호출 (gpt-4o-mini)
    async callGPT(prompt, systemPrompt = '') {
        try {
            console.log('🚀 Calling GPT API...');
            
            const response = await fetch(this.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'gpt',
                    model: 'gpt-4o-mini',
                    max_tokens: 3000,
                    messages: [
                        { role: 'system', content: systemPrompt || '당신은 통번역대학원 교수입니다.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            
            const data = await response.json();
            console.log('📥 GPT Response received:', data);
            
            // 토큰 사용량 로그
            if (data.usage) {
                console.log(`📊 Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
            }
            
            // 에러 체크
            if (data.error) {
                console.error('❌ GPT Error:', data.error);
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            
            // 응답 형식 체크
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('❌ Unexpected response format:', data);
                throw new Error('GPT 응답 형식 오류');
            }
            
            console.log('✅ GPT call successful');
            return data.choices[0].message.content;
        } catch (error) {
            console.error('❌ callGPT error:', error);
            throw error;
        }
    },
    
    // Claude 프리미엄 호출 (claude-sonnet-4)
    async callClaude(prompt, systemPrompt = '') {
        try {
            console.log('🚀 Calling Claude API...');
            
            const response = await fetch(this.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'claude',
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 3000,
                    messages: [
                        { role: 'user', content: (systemPrompt || '당신은 통번역대학원 교수입니다.') + '\n\n' + prompt }
                    ]
                })
            });
            
            const data = await response.json();
            console.log('📥 Claude Response received:', data);
            
            // 에러 체크
            if (data.error) {
                console.error('❌ Claude Error:', data.error);
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            
            // 응답 형식 체크
            if (!data.content || !data.content[0] || !data.content[0].text) {
                console.error('❌ Unexpected response format:', data);
                throw new Error('Claude 응답 형식 오류');
            }
            
            console.log('✅ Claude call successful');
            return data.content[0].text;
        } catch (error) {
            console.error('❌ callClaude error:', error);
            throw error;
        }
    },
    
    // 번역 첨삭 요청 (매우 상세한 프롬프트)
    async getTranslationFeedback(original, userTranslation, direction = 'en-ko', usePremium = false) {
        const sourceLang = direction === 'en-ko' ? '영어' : '한국어';
        const targetLang = direction === 'en-ko' ? '한국어' : '영어';
        
        const prompt = `당신은 통번역대학원 교수로서 학생의 번역을 엄격하고 상세하게 첨삭합니다.

═══════════════════════════════════════════
📝 평가 대상
═══════════════════════════════════════════
【원문 (${sourceLang})】
"${original}"

【학습자 번역 (${targetLang})】
"${userTranslation}"

═══════════════════════════════════════════
📊 평가 기준 (100점 만점)
═══════════════════════════════════════════
1. 정확성 (35점): 오역/누락/첨가 여부
2. 자연스러움 (25점): 번역투, 어순, 연어
3. 용어 선택 (20점): 문맥 적합성, 뉘앙스
4. 문체/스타일 (20점): 격식체 일치, 가독성

═══════════════════════════════════════════
⚠️ 채점 기준
═══════════════════════════════════════════
- 50점 이하: 심각한 오역
- 51-65점: 기본 의미 전달되나 문제 많음
- 66-75점: 양호하나 개선 필요
- 76-85점: 좋음
- 86-95점: 매우 좋음
- 96-100점: 완벽

다음 JSON 형식으로만 응답하세요:
{
  "score": 점수(0-100),
  "feedback": "종합 평가 (3-4문장)",
  "analysis": {
    "accuracy": "정확성 분석",
    "naturalness": "자연스러움 분석",
    "terminology": "용어 분석",
    "style": "문체 분석"
  },
  "improvements": [
    "【개선점 1】 '원래 표현' → '개선 표현' (이유)",
    "【개선점 2】 '원래 표현' → '개선 표현' (이유)"
  ],
  "goodPoints": ["잘한 점 1", "잘한 점 2"],
  "modelAnswer": "모범 번역"
}`;

        try {
            const response = usePremium 
                ? await this.callClaude(prompt)
                : await this.callGPT(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('응답 파싱 실패');
        } catch (error) {
            console.error('Feedback error:', error);
            return {
                score: 0,
                feedback: 'AI 첨삭 오류: ' + error.message,
                analysis: {},
                improvements: [],
                goodPoints: [],
                modelAnswer: ''
            };
        }
    },
    
    // URL은 브라우저에서 직접 접근 불가 (CORS)
    // 대신 사용자가 기사 내용을 복사해서 붙여넣도록 안내
    async extractArticleFromURL(url) {
        throw new Error('URL 직접 접근 불가. 기사 내용을 복사해서 "직접 입력"을 사용하세요.');
    },
    
    // 직접 텍스트로 기사 생성
    async createArticleFromText(title, content, isKorean = false) {
        const prompt = isKorean 
            ? `다음 한국어 기사를 통번역 학습용으로 변환해주세요.

제목: ${title}
내용: ${content}

작업:
1. 영어로 번역 (350-450 단어, Reuters 스타일)
2. 원본 한국어 다듬기
3. 핵심 용어 5개

JSON 형식:
{
  "title": "영어 제목",
  "content": "영어 본문",
  "koreanContent": "한국어 본문",
  "summary": "요약",
  "category": "economy|politics|tech|health|science",
  "level": "advanced",
  "keyTerms": [{"en": "term", "ko": "용어"}]
}`
            : `다음 영어 기사를 통번역 학습용으로 변환해주세요.

제목: ${title}
내용: ${content}

작업:
1. 영어 본문 다듬기 (350-450 단어)
2. 전문적인 한국어 번역
3. 핵심 용어 5개

JSON 형식:
{
  "title": "영어 제목",
  "content": "영어 본문",
  "koreanContent": "한국어 번역",
  "summary": "요약",
  "category": "economy|politics|tech|health|science",
  "level": "advanced",
  "keyTerms": [{"en": "term", "ko": "용어"}]
}`;

        try {
            const response = await this.callGPT(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('기사 생성 실패');
        } catch (error) {
            console.error('Article creation error:', error);
            return null;
        }
    },
    
    // GitHub Actions 트리거
    async triggerArticleUpdate(githubToken, owner, repo) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${githubToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ event_type: 'update-articles' })
                }
            );
            return response.ok || response.status === 204;
        } catch (error) {
            console.error('GitHub trigger error:', error);
            return false;
        }
    }
};

// ===== TTS (토글 기능) =====
const TTS = {
    speaking: false,
    
    speak(text, lang = 'en-US', rate = 0.9) {
        if (this.speaking) {
            this.stop();
            return;
        }
        this.stop();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.onstart = () => { this.speaking = true; };
        utterance.onend = () => { this.speaking = false; };
        utterance.onerror = () => { this.speaking = false; };
        speechSynthesis.speak(utterance);
    },
    
    stop() { 
        speechSynthesis.cancel(); 
        this.speaking = false; 
    },
    
    isSpeaking() { return this.speaking; }
};

// ===== STT =====
const STT = {
    recognition: null,
    isListening: false,
    init() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            return true;
        }
        return false;
    },
    start(lang = 'ko-KR', onResult, onEnd) {
        if (!this.recognition && !this.init()) { alert('음성 인식 미지원'); return; }
        this.recognition.lang = lang;
        this.recognition.onresult = (e) => { 
            const t = Array.from(e.results).map(r => r[0].transcript).join(''); 
            onResult(t, e.results[0].isFinal); 
        };
        this.recognition.onend = () => { this.isListening = false; if (onEnd) onEnd(); };
        this.recognition.onerror = (e) => { console.error('STT Error:', e.error); this.isListening = false; };
        this.recognition.start();
        this.isListening = true;
    },
    stop() { if (this.recognition && this.isListening) { this.recognition.stop(); this.isListening = false; } }
};

// ===== BGM =====
const BGM = {
    audio: null, currentTrack: null,
    tracks: {
        lofi: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        jazz: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c5.mp3',
        nature: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
        rain: 'https://cdn.pixabay.com/download/audio/2022/02/23/audio_ea70ad08cb.mp3',
        piano: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3'
    },
    play(t) { 
        if (this.audio) this.audio.pause(); 
        const u = this.tracks[t]; 
        if (!u) return; 
        this.audio = new Audio(u); 
        this.audio.loop = true; 
        this.audio.volume = 0.3; 
        this.currentTrack = t; 
        this.audio.play().catch(e => {}); 
    },
    stop() { if (this.audio) { this.audio.pause(); this.audio = null; this.currentTrack = null; } },
    setVolume(v) { if (this.audio) this.audio.volume = v / 100; },
    isPlaying() { return this.audio && !this.audio.paused; }
};
