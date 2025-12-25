let archiveData = [];
let lastActiveListSection = 'home';
let isTimelineHorizontal = false;

document.addEventListener('DOMContentLoaded', () => {
    loadDataAndBuildInterface();
    loadNotes('globalNotes');
});

// --- Data Loading ---
async function loadDataAndBuildInterface() {
    const loadingMessage = document.getElementById('loadingMessage');
    try {
        const response = await fetch('data.json');
        archiveData = await response.json();

        // Build all sections
        renderContentGrids(archiveData);
        renderDailyReview();
        renderTimeline(archiveData);
        
        // Show Home and start sequence
        showSection('home');
        
        // Slight delay to ensure CSS is ready for animation
        setTimeout(() => { runWelcomeSequence(); }, 100);
        
        loadingMessage.style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        loadingMessage.innerHTML = '<p style="color:red">Error loading data.json</p>';
    }
}

// --- Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.classList.remove('hidden');
    }

    if (sectionId !== 'detailPage') lastActiveListSection = sectionId;

    if (sectionId === 'home') renderDailyReview();
    // Mind Map render logic removed for "Coming Soon" state
}

function hideDetailPage() {
    document.getElementById('detailPage').classList.add('hidden');
    showSection(lastActiveListSection);
}

// --- Search & Filter ---
function filterContent() {
    const input = document.getElementById('searchInput').value.toUpperCase();
    
    // Checkboxes
    const showAll = document.getElementById('filterAll').checked;
    const showPerson = document.querySelector('input[value="Person"]').checked;
    const showMovement = document.querySelector('input[value="Movement"]').checked;
    const showResource = document.querySelector('input[value="Resource"]').checked;

    const filtered = archiveData.filter(item => {
        // 1. Check Type Matches
        let typeMatch = false;
        if (showAll) {
            typeMatch = true;
        } else {
            // Uncheck "All" if user starts clicking specific filters
            if (showPerson && item.type === 'Person') typeMatch = true;
            if (showMovement && (item.type === 'Movement' || item.type === 'Event')) typeMatch = true;
            if (showResource && item.type === 'Resource') typeMatch = true;
        }

        // 2. Check Text Matches
        const textMatch = item.name.toUpperCase().includes(input) || 
                          item.summary.toUpperCase().includes(input) ||
                          item.key_terms.some(t => t.toUpperCase().includes(input));

        return typeMatch && textMatch;
    });

    renderContentGrids(filtered);
}

// --- Rendering Grids (Persons, Movements, Resources) ---
function renderContentGrids(data) {
    const grids = {
        'Person': document.getElementById('personsGrid'),
        'Movement': document.getElementById('movementsGrid'),
        'Event': document.getElementById('movementsGrid'), // Events go with movements
        'Resource': document.getElementById('resourcesGrid')
    };

    // Clear all grids first
    Object.values(grids).forEach(g => { if(g) g.innerHTML = ''; });

    data.forEach(item => {
        const grid = grids[item.type];
        if (grid) {
            const card = document.createElement('div');
            card.className = 'content-card';
            card.onclick = () => showDetail(item.id);
            
            // Image Logic
            let imgHTML = '';
            if (item.images && item.images.length > 0) {
                imgHTML = `<img src="${item.images[0]}" class="card-thumb" alt="${item.name}">`;
            }

            // RE-ADDED KEY TERMS HERE
            card.innerHTML = `
                ${imgHTML}
                <h3 class="card-title">${item.name} <span style="font-size:0.7em; color:#888;">(${item.dates})</span></h3>
                <p style="font-size: 0.85em; color: var(--accent-color); margin-bottom: 5px;">
                   <strong>Keys:</strong> ${item.key_terms.join(', ')}
                </p>
                <p>${item.summary}</p>
            `;
            grid.appendChild(card);
        }
    });
}

// --- Detail View ---
function showDetail(id) {
    const item = archiveData.find(d => d.id === id);
    if (!item) return;

    showSection('detailPage');
    document.getElementById('detailTitle').textContent = item.name;
    document.getElementById('detailDates').textContent = `Period: ${item.dates}`;
    document.getElementById('detailContent').innerHTML = item.detail;

    // Render Gallery
    const gallery = document.getElementById('detailImages');
    gallery.innerHTML = '';
    if (item.images) {
        item.images.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            gallery.appendChild(img);
        });
    }

    // Render Sources
    const sourcesList = document.getElementById('detailSources');
    sourcesList.innerHTML = item.sources.map(src => {
        if (src.startsWith('http')) {
            return `<li><a href="${src}" target="_blank">View Source</a></li>`;
        }
        return `<li>${src}</li>`;
    }).join('');
}

// --- Timeline ---
function toggleTimelineView(mode) {
    isTimelineHorizontal = (mode === 'horizontal');
    renderTimeline(archiveData);
}

function renderTimeline(data) {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';
    container.className = isTimelineHorizontal ? 'horizontal-timeline' : 'vertical-timeline';

    const sorted = [...data].sort((a, b) => parseInt(a.dates) - parseInt(b.dates));

    sorted.forEach(item => {
        const div = document.createElement('div');
        div.className = 'timeline-event';
        div.id = 'year-' + parseInt(item.dates); // For jumping
        div.onclick = () => showDetail(item.id);
        
        // Add color styling for events
        if (item.type === 'Event') {
            div.style.borderTopColor = '#2e7d32'; // Green override for horizontal
            div.style.borderLeftColor = '#2e7d32'; // Green override for vertical
        }

        div.innerHTML = `
            <h4>${item.dates}</h4>
            <p><strong>${item.name}</strong></p>
            <p style="font-size:0.8em">${item.summary}</p>
        `;
        container.appendChild(div);
    });
}

function scrollToYear(year) {
    const container = document.getElementById('timelineContainer');
    const eventDivs = Array.from(container.children);
    
    // Find closest match
    const target = eventDivs.find(div => {
        const divYear = parseInt(div.id.replace('year-', ''));
        return divYear >= year;
    });

    if (target) {
        target.scrollIntoView({behavior: "smooth", inline: "center", block: "center"});
    }
}

// --- Floating Notes ---
function toggleNotes() {
    const notes = document.getElementById('floatingNotes');
    const toggleBtn = document.getElementById('notesToggleIcon');
    
    notes.classList.toggle('minimized');
    
    // Check if minimized or not to change the icon
    if (notes.classList.contains('minimized')) {
        toggleBtn.textContent = '+'; // Show Plus when small
    } else {
        toggleBtn.textContent = '–'; // Show Minus when big
    }
}

function saveNotes(id) {
    const val = document.getElementById(id).value;
    localStorage.setItem(id, val);
}

function loadNotes(id) {
    const val = localStorage.getItem(id);
    if(val) document.getElementById(id).value = val;
}

function copyNotes(id) {
    const txt = document.getElementById(id);
    txt.select();
    navigator.clipboard.writeText(txt.value).then(() => {
        alert('Notes copied to clipboard!');
    });
}

// --- Welcome Sequence ---
function renderDailyReview() {
    const dailyReviewEl = document.getElementById('dailyReviewContent');
    if (!archiveData.length) return;
    const item = archiveData[Math.floor(Math.random() * archiveData.length)];
    dailyReviewEl.innerHTML = `
        <h3 class="card-title">${item.name} (${item.type})</h3>
        <p>${item.summary}</p>
        <button onclick="showDetail('${item.id}')">Learn More</button>
    `;
}

function runWelcomeSequence() {
    const welcomeText = document.getElementById('welcome-text');
    const quotes = [
        "\"We have survived the roughest game in the history of the world. No matter what we say against ourselves, no matter what our limits and hang-ups are, we have come through something, and if we can get this far, we can get further.\" — James Baldwin",
        "\"I go away to prepare a place for you, and where I am ye may be also.\" — Harriet Tubman",
        "\"May your words echo enough to cause an avalanche and your actions ripple into waves. Knowledge is power. A closed mind is a weak mind.\" — Love, Kira"
    ];

    let currentQuote = 0;
    function showNextQuote() {
        if (currentQuote < quotes.length) {
            welcomeText.innerText = quotes[currentQuote];
            welcomeText.classList.add('visible');
            
            // Baldwin (0) gets 7s, others get 5s
            let time = (currentQuote === 0) ? 7000 : 5000;
            
            setTimeout(() => {
                // Fade out unless it's the last one
                if (currentQuote < quotes.length - 1) {
                    welcomeText.classList.remove('visible');
                    setTimeout(() => { currentQuote++; showNextQuote(); }, 1500);
                }
            }, time);
        }
    }
    showNextQuote();
}
