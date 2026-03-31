// YDS Kelime Paketleri - Main Application
(function() {
    'use strict';

    // Pack system: each pack has its own words and separate progress
    const PACKS = {
        '1000': { name: '1000 Kelime Kampı', data: WORDS_DATA, storageKey: 'yds_progress_1000', hasDays: true },
        'pdf':  { name: 'YDS/YÖKDİL Essential', data: WORDS_PDF, storageKey: 'yds_progress_pdf', hasDays: false }
    };

    // State
    let currentPack = '1000';
    let currentView = 'cards';
    let currentGroupMode = 'type';
    let currentListTab = 'known';
    let quizWords = [];
    let quizIndex = 0;
    let quizRevealed = false;
    let quizSessionResults = { known: 0, half: 0, unknown: 0 };

    function getProgress() {
        return JSON.parse(localStorage.getItem(PACKS[currentPack].storageKey) || '{}');
    }
    function setProgress(data) {
        localStorage.setItem(PACKS[currentPack].storageKey, JSON.stringify(data));
    }
    function getWords() {
        return PACKS[currentPack].data;
    }

    function saveWordStatus(wordId, status) {
        const p = getProgress();
        p[wordId] = status;
        setProgress(p);
        updateStats();
    }
    function removeWordStatus(wordId) {
        const p = getProgress();
        delete p[wordId];
        setProgress(p);
        updateStats();
    }

    function updateStats() {
        const p = getProgress();
        let known = 0, half = 0, unknown = 0;
        Object.values(p).forEach(v => {
            if (v === 'known') known++;
            else if (v === 'half') half++;
            else if (v === 'unknown') unknown++;
        });
        document.querySelector('#stat-known .stat-count').textContent = known;
        document.querySelector('#stat-half .stat-count').textContent = half;
        document.querySelector('#stat-unknown .stat-count').textContent = unknown;
        document.getElementById('list-known-count').textContent = known;
        document.getElementById('list-half-count').textContent = half;
        document.getElementById('list-unknown-count').textContent = unknown;
    }

    // ==========================================
    // PACK SWITCHING
    // ==========================================
    document.querySelectorAll('.pack-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pack = btn.dataset.pack;
            if (pack === currentPack) return;
            currentPack = pack;
            document.querySelectorAll('.pack-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update day filter visibility
            const dayFilter = document.getElementById('filter-day');
            dayFilter.style.display = PACKS[currentPack].hasDays ? '' : 'none';
            dayFilter.parentElement.style.display = PACKS[currentPack].hasDays ? '' : 'none';

            // Update quiz source options
            updateQuizSourceOptions();

            // Re-render current view
            updateStats();
            if (currentView === 'cards') renderCards();
            if (currentView === 'groups') renderGroups();
            if (currentView === 'lists') renderLists();
        });
    });

    function updateQuizSourceOptions() {
        const select = document.getElementById('quiz-source');
        const words = getWords();
        const hasDays = PACKS[currentPack].hasDays;

        let html = `<option value="all">Tüm Kelimeler (${words.length})</option>`;
        html += `<option value="unknown">Bilmediğim Kelimeler</option>`;
        html += `<option value="half">Yarı Bildiğim Kelimeler</option>`;
        html += `<option value="unknown-half">Bilmediğim + Yarı Bildiğim</option>`;

        if (hasDays) {
            for (let d = 1; d <= 10; d++) {
                const start = (d - 1) * 100 + 1;
                const end = d * 100;
                html += `<option value="day-${d}">${d}. Gün (${start}-${end})</option>`;
            }
        }
        select.innerHTML = html;
    }

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    function switchView(view) {
        currentView = view;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
        if (view === 'cards') renderCards();
        if (view === 'groups') renderGroups();
        if (view === 'lists') renderLists();
    }

    // ==========================================
    // CARDS VIEW
    // ==========================================
    function getFilteredWords() {
        let words = [...getWords()];
        const search = document.getElementById('search-input').value.toLowerCase();
        const sentiment = document.getElementById('filter-sentiment').value;
        const type = document.getElementById('filter-type').value;
        const day = document.getElementById('filter-day').value;

        if (search) words = words.filter(w => w.en.toLowerCase().includes(search) || w.tr.toLowerCase().includes(search));
        if (sentiment !== 'all') words = words.filter(w => w.sentiment === sentiment);
        if (type !== 'all') words = words.filter(w => w.type === type);
        if (day !== 'all' && PACKS[currentPack].hasDays) words = words.filter(w => w.day === parseInt(day));
        return words;
    }

    function renderCards() {
        const words = getFilteredWords();
        const grid = document.getElementById('cards-grid');
        const progress = getProgress();
        document.getElementById('cards-count').textContent = `${words.length} kelime gösteriliyor`;

        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        words.forEach(word => {
            const card = document.createElement('div');
            card.className = `word-card ${word.sentiment}`;
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-number">#${word.id}</span>
                    <span class="card-type ${word.type}">${TYPE_LABELS[word.type] || word.type}</span>
                </div>
                <div class="card-word">${word.en}</div>
                <div class="card-meaning">${word.tr}</div>
                ${word.synonyms && word.synonyms.length > 0 ? `
                    <div class="card-synonyms">
                        ${word.synonyms.map(s => `<span class="synonym-tag">${s}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="card-details">
                    ${word.day ? `<div class="card-detail-row"><span class="detail-label">Gün:</span><span class="detail-value">${word.day}. Gün</span></div>` : ''}
                    <div class="card-detail-row"><span class="detail-label">Duygu:</span><span class="detail-value">${SENTIMENT_LABELS[word.sentiment]}</span></div>
                    ${progress[word.id] ? `<div class="card-detail-row"><span class="detail-label">Durum:</span><span class="detail-value">${progress[word.id] === 'known' ? '✅ Biliyorum' : progress[word.id] === 'half' ? '🔶 Yarı' : '❌ Bilmiyorum'}</span></div>` : ''}
                </div>
                <div class="card-sentiment"></div>
            `;
            card.addEventListener('click', () => card.classList.toggle('expanded'));
            fragment.appendChild(card);
        });
        grid.appendChild(fragment);
    }

    document.getElementById('search-input').addEventListener('input', debounce(renderCards, 250));
    document.getElementById('filter-sentiment').addEventListener('change', renderCards);
    document.getElementById('filter-type').addEventListener('change', renderCards);
    document.getElementById('filter-day').addEventListener('change', renderCards);

    function debounce(fn, ms) {
        let timer;
        return () => { clearTimeout(timer); timer = setTimeout(fn, ms); };
    }

    // ==========================================
    // GROUPS VIEW
    // ==========================================
    document.querySelectorAll('.group-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.group-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentGroupMode = tab.dataset.group;
            renderGroups();
        });
    });

    function renderGroups() {
        const container = document.getElementById('groups-container');
        container.innerHTML = '';
        if (currentGroupMode === 'type') renderTypeGroups(container);
        else if (currentGroupMode === 'sentiment') renderSentimentGroups(container);
        else renderSemanticGroups(container);
    }

    function renderTypeGroups(container) {
        const groups = {};
        getWords().forEach(w => { if (!groups[w.type]) groups[w.type] = []; groups[w.type].push(w); });
        Object.keys(groups).sort().forEach(type => {
            createGroupSection(container, TYPE_ICONS[type] || '📌', TYPE_LABELS[type] || type, groups[type]);
        });
    }

    function renderSentimentGroups(container) {
        const groups = { positive: [], neutral: [], negative: [] };
        getWords().forEach(w => groups[w.sentiment].push(w));
        createGroupSection(container, '🟢', `Olumlu (${groups.positive.length})`, groups.positive);
        createGroupSection(container, '🟡', `Nötr (${groups.neutral.length})`, groups.neutral);
        createGroupSection(container, '🔴', `Olumsuz (${groups.negative.length})`, groups.negative);
    }

    function renderSemanticGroups(container) {
        if (typeof SEMANTIC_GROUPS === 'undefined') {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Bu paket için anlam grupları henüz oluşturulmamıştır.</p>';
            return;
        }
        Object.entries(SEMANTIC_GROUPS).forEach(([name, keywords]) => {
            const words = getWords().filter(w => {
                const enLower = w.en.toLowerCase();
                return keywords.some(kw => enLower.includes(kw.toLowerCase()) || enLower === kw.toLowerCase());
            });
            if (words.length > 0) createGroupSection(container, '📂', `${name} (${words.length})`, words);
        });
    }

    function createGroupSection(container, icon, title, words) {
        const section = document.createElement('div');
        section.className = 'group-section';
        section.innerHTML = `
            <div class="group-header">
                <div class="group-header-left">
                    <span class="group-icon">${icon}</span>
                    <span class="group-title">${title}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="group-count">${words.length} kelime</span>
                    <span class="group-toggle">▼</span>
                </div>
            </div>
            <div class="group-body">
                <div class="group-words">
                    ${words.map(w => `<div class="group-word-item"><span class="group-word-dot ${w.sentiment}"></span><span class="group-word-en">${w.en}</span><span class="group-word-tr">${w.tr}</span></div>`).join('')}
                </div>
            </div>`;
        section.querySelector('.group-header').addEventListener('click', () => section.classList.toggle('open'));
        container.appendChild(section);
    }

    // ==========================================
    // QUIZ VIEW
    // ==========================================
    document.getElementById('quiz-start-btn').addEventListener('click', startQuiz);
    document.getElementById('quiz-restart-btn').addEventListener('click', () => {
        document.getElementById('quiz-results').style.display = 'none';
        document.getElementById('quiz-setup').style.display = 'flex';
    });
    document.getElementById('quiz-card').addEventListener('click', () => {
        if (!quizRevealed) {
            quizRevealed = true;
            document.getElementById('quiz-card').classList.add('revealed');
            document.getElementById('quiz-actions').style.display = 'flex';
        }
    });
    document.getElementById('quiz-btn-known').addEventListener('click', () => quizAnswer('known'));
    document.getElementById('quiz-btn-half').addEventListener('click', () => quizAnswer('half'));
    document.getElementById('quiz-btn-unknown').addEventListener('click', () => quizAnswer('unknown'));
    document.getElementById('quiz-exit-btn').addEventListener('click', endQuiz);

    function startQuiz() {
        const source = document.getElementById('quiz-source').value;
        const order = document.getElementById('quiz-order').value;
        const progress = getProgress();
        let words = [...getWords()];

        if (source === 'unknown') words = words.filter(w => progress[w.id] === 'unknown');
        else if (source === 'half') words = words.filter(w => progress[w.id] === 'half');
        else if (source === 'unknown-half') words = words.filter(w => progress[w.id] === 'unknown' || progress[w.id] === 'half');
        else if (source.startsWith('day-')) {
            const day = parseInt(source.split('-')[1]);
            words = words.filter(w => w.day === day);
        }

        if (words.length === 0) { alert('Bu kategoride kelime bulunamadı!'); return; }
        if (order === 'random') {
            for (let i = words.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [words[i], words[j]] = [words[j], words[i]];
            }
        }

        quizWords = words;
        quizIndex = 0;
        quizSessionResults = { known: 0, half: 0, unknown: 0 };
        document.getElementById('quiz-setup').style.display = 'none';
        document.getElementById('quiz-active').style.display = 'block';
        showQuizWord();
    }

    function showQuizWord() {
        if (quizIndex >= quizWords.length) { endQuiz(); return; }
        const word = quizWords[quizIndex];
        quizRevealed = false;
        document.getElementById('quiz-card').classList.remove('revealed');
        document.getElementById('quiz-actions').style.display = 'none';
        document.getElementById('quiz-word-number').textContent = `#${word.id}`;
        document.getElementById('quiz-word').textContent = word.en;
        document.getElementById('quiz-word-type').textContent = TYPE_LABELS[word.type] || word.type;
        document.getElementById('quiz-meaning').textContent = word.tr;
        document.getElementById('quiz-synonyms').textContent = word.synonyms && word.synonyms.length > 0 ? `= ${word.synonyms.join(', ')}` : '';
        const pct = (quizIndex / quizWords.length) * 100;
        document.getElementById('quiz-progress-fill').style.width = pct + '%';
        document.getElementById('quiz-counter').textContent = `${quizIndex + 1} / ${quizWords.length}`;
    }

    function quizAnswer(status) {
        const word = quizWords[quizIndex];
        saveWordStatus(word.id, status);
        quizSessionResults[status]++;
        quizIndex++;
        showQuizWord();
    }

    function endQuiz() {
        document.getElementById('quiz-active').style.display = 'none';
        document.getElementById('quiz-results').style.display = 'flex';
        const { known, half, unknown } = quizSessionResults;
        const total = known + half + unknown;
        document.getElementById('result-known').textContent = known;
        document.getElementById('result-half').textContent = half;
        document.getElementById('result-unknown').textContent = unknown;
        const pct = total > 0 ? Math.round((known / total) * 100) : 0;
        document.getElementById('percentage-text').textContent = pct + '%';
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (pct / 100) * circumference;
        const circle = document.getElementById('progress-circle');
        circle.style.transition = 'stroke-dashoffset 1s ease';
        setTimeout(() => circle.setAttribute('stroke-dashoffset', offset), 100);
    }

    // ==========================================
    // LISTS VIEW
    // ==========================================
    document.querySelectorAll('.list-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.list-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentListTab = tab.dataset.list;
            renderLists();
        });
    });

    function renderLists() {
        const container = document.getElementById('lists-container');
        const emptyMsg = document.getElementById('empty-list-message');
        const progress = getProgress();
        const wordsInList = getWords().filter(w => progress[w.id] === currentListTab);

        if (wordsInList.length === 0) {
            container.innerHTML = '';
            container.appendChild(emptyMsg);
            emptyMsg.style.display = 'flex';
            return;
        }
        emptyMsg.style.display = 'none';
        let html = '<div class="list-words-grid">';
        wordsInList.forEach(word => {
            const otherStatuses = ['known', 'half', 'unknown'].filter(s => s !== currentListTab);
            html += `<div class="list-word-item">
                <div class="list-word-info">
                    <span class="group-word-dot ${word.sentiment}"></span>
                    <span class="list-word-en">${word.en}</span>
                    <span class="list-word-tr">— ${word.tr}</span>
                </div>
                <div class="list-word-actions">
                    ${otherStatuses.map(s => `<button class="list-action-btn move-${s}" onclick="moveWord(${word.id}, '${s}')" title="${s === 'known' ? 'Biliyorum' : s === 'half' ? 'Yarı Biliyorum' : 'Bilmiyorum'}">${s === 'known' ? '✅' : s === 'half' ? '🔶' : '❌'}</button>`).join('')}
                    <button class="list-action-btn remove-btn" onclick="removeWord(${word.id})" title="Listeden kaldır">🗑️</button>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    window.moveWord = function(id, status) { saveWordStatus(id, status); renderLists(); };
    window.removeWord = function(id) { removeWordStatus(id); renderLists(); };

    // ==========================================
    // INIT
    // ==========================================
    // Set PDF pack count dynamically
    if (typeof WORDS_PDF !== 'undefined') {
        document.getElementById('pdf-pack-count').textContent = WORDS_PDF.length;
    }
    updateStats();
    updateQuizSourceOptions();
    renderCards();
})();
