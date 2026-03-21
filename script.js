let archiveData = [];
let lastActiveListSection = 'home';
let isTimelineHorizontal = false;

document.addEventListener('DOMContentLoaded', () => {
    loadDataAndBuildInterface();
    loadNotes('globalNotes');
});

// 1. Data Loading & Initialization
async function loadDataAndBuildInterface() {
    const loadingMessage = document.getElementById('loadingMessage');
    try {
        const response = await fetch('data.json');
        archiveData = await response.json();

        // Build all sections using the high-performance renderer
        renderContentGrids(archiveData);
        renderDailyReview();
        renderTimeline(archiveData);
        
        // Show Home and start the welcome sequence
        showSection('home');
        setTimeout(() => { runWelcomeSequence(); }, 100);
        
        loadingMessage.style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        loadingMessage.innerHTML = '<p style="color:red">Error loading data.json. Please check your JSON syntax.</p>';
    }
}

// 2. Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('main section').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });

    // Show target section
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.classList.remove('hidden');
    }

    // Remember the last list we looked at so the "Back" button works
    if (sectionId !== 'detailPage') {
        lastActiveListSection = sectionId;
    }

    if (sectionId === 'home') renderDailyReview();
}

function hideDetailPage() {
    document.getElementById('detailPage').classList.add('hidden');
    showSection(lastActiveListSection);
}

// 3. High-Performance Grid Rendering
function renderContentGrids(data) {
    const grids = {
        'Person': document.getElementById('personsGrid'),
        'Movement': document.getElementById('movementsGrid'),
        'Event': document.getElementById('movementsGrid'), // Events share the Movements grid
        'Resource': document.getElementById('resourcesGrid')
    };

    // Clear existing content
    Object.values(grids).forEach(g => { if(g) g.innerHTML = ''; });

    // Create virtual DocumentFragments to prevent lag
    const fragments = {
        'Person': document.createDocumentFragment(),
        'Movement': document.createDocumentFragment(),
        'Resource': document.createDocumentFragment()
    };

    data.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'content-card';
        // Make the whole card clickable
        card.onclick = () => showDetail(entry.id);
        
        // Auto-Placeholder Logic
        const imageSrc = (entry.images && entry.images.length > 0 && entry.images[0] !== "") 
            ? entry.images[0] 
            : `https://placehold.co/400x300/1e1e1e/DAA520?text=${encodeURIComponent(entry.name)}`;

        // Build the card with Lazy Loading
        card.innerHTML = `
            <img src="${imageSrc}" class="card-thumb" alt="${entry.name}" loading="lazy">
            <h3 class="card-title">${entry.name} <span style="font-size:0.7em; color:#888;">(${entry.dates})</span></h3>
            <p style="font-size: 0.85em; color: var(--accent-color); margin-bottom: 5px;">
               <strong>Keys:</strong> ${(entry.key_terms || []).join(', ')}
            </p>
            <p>${entry.summary}</p>
            <button style="margin-top:auto; padding:8px; background:var(--primary-color); color:var(--secondary-color); border:none; border-radius:4px; cursor:pointer;">Explore More</button>
        `;
        
        // Route to the correct fragment
        let targetType = entry.type === 'Event' ? 'Movement' : entry.type;
        if (fragments[targetType]) {
            fragments[targetType].appendChild(card);
        }
    });

    // Push all fragments to the screen in one move
    if (grids['Person']) grids['Person'].appendChild(fragments['Person']);
    if (grids['Movement']) grids['Movement'].appendChild(fragments['Movement']);
    if (grids['Resource']) grids['Resource'].appendChild(fragments['Resource']);
}

// 4. Detail View (The Modal)
function showDetail(id) {
    const item = archiveData.find(d => d.id === id);
    if (!item) return;

    showSection('detailPage');
    
    // Populate text fields
    document.getElementById('detailTitle').textContent = item.name;
    document.getElementById('detailDates').textContent = `Period: ${item.dates}`;
    document.getElementById('detailContent').innerHTML = item.detail;

    // Populate images
    const gallery = document.getElementById('detailImages');
    gallery.innerHTML = '';
    
    if (item.images && item.images.length > 0 && item.images[0] !== "") {
        item.images.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            gallery.appendChild(img);
        });
    } else {
        // Fallback for detail page if no image exists
        const img = document.createElement('img');
        img.src = `https://placehold.co/600x400/1e1e1e/DAA520?text=${encodeURIComponent(item.name)}`;
        gallery.appendChild(img);
    }

    // Populate external sources
    const sourcesList = document.getElementById('detailSources');
    sourcesList.innerHTML = (item.sources || []).map(src => {
        if (src.startsWith('http')) {
            return `<li><a href="${src}" target="_blank">View Source Documentation</a></li>`;
        }
        return `<li>${src}</li>`;
    }).join('');
}

// 5. Search & Filters
function filterContent() {
    const input = document.getElementById('searchInput').value.toUpperCase();
    
    const showAll = document.getElementById('filterAll').checked;
    const showPerson = document.querySelector('input[value="Person"]').checked;
    const showMovement = document.querySelector('input[value="Movement"]').checked;
    const showResource = document.querySelector('input[value="Resource"]').checked;

    const filtered = archiveData.filter(item => {
        let typeMatch = false;
        if (showAll) {
            typeMatch = true;
        } else {
            if (showPerson && item.type === 'Person') typeMatch = true;
            if (showMovement && (item.type === 'Movement' || item.type === 'Event')) typeMatch = true;
            if (showResource && item.type === 'Resource') typeMatch = true;
        }

        const textMatch = item.name.toUpperCase().includes(input) || 
                          item.summary.toUpperCase().includes(input) ||
                          (item.key_terms || []).some(t => t.toUpperCase().includes(input));

        return typeMatch && textMatch;
    });

    renderContentGrids(filtered);
}

// 6. Timeline Logic
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
        div.id = 'year-' + parseInt(item.dates);
        div.onclick = () => showDetail(item.id);
        
        if (item.type === 'Event') {
            div.style.borderTopColor = '#2e7d32'; 
            div.style.borderLeftColor = '#2e7d32'; 
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
    
    const target = eventDivs.find(div => {
        const divYear = parseInt(div.id.replace('year-', ''));
        return divYear >= year;
    });

    if (target) {
        target.scrollIntoView({behavior: "smooth", inline: "center", block: "center"});
    }
}

// 7. Floating Notes
function toggleNotes() {
    const notes = document.getElementById('floatingNotes');
    const toggleBtn = document.getElementById('notesToggleIcon');
    
    notes.classList.toggle('minimized');
    
    if (notes.classList.contains('minimized')) {
        toggleBtn.textContent = '+';
    } else {
        toggleBtn.textContent = '-'; 
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

// 8. Welcome Sequence & Daily Review
function renderDailyReview() {
    const dailyReviewEl = document.getElementById('dailyReviewContent');
    if (!archiveData.length) return;
    const item = archiveData[Math.floor(Math.random() * archiveData.length)];
    dailyReviewEl.innerHTML = `
        <h3 class="card-title">${item.name} (${item.type})</h3>
        <p>${item.summary}</p>
        <button style="padding:8px 15px; background:var(--primary-color); color:var(--secondary-color); border:none; border-radius:4px; cursor:pointer;" onclick="showDetail('${item.id}')">Review Entry</button>
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
            
            let time = (currentQuote === 0) ? 7000 : 5000;
            
            setTimeout(() => {
                if (currentQuote < quotes.length - 1) {
                    welcomeText.classList.remove('visible');
                    setTimeout(() => { currentQuote++; showNextQuote(); }, 1500);
                }
            }, time);
        }
    }
    showNextQuote();
}
