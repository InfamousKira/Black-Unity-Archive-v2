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
    else if (sectionId === 'mindmap') {
        // Re-render map to fit container correctly
        document.getElementById('mindmapContainer').innerHTML = '';
        renderMindMap(archiveData);
    }
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
            
            // Image Logic (Show first image as thumbnail if exists)
            let imgHTML = '';
            if (item.images && item.images.length > 0) {
                imgHTML = `<img src="${item.images[0]}" class="card-thumb" alt="${item.name}">`;
            }

            card.innerHTML = `
                ${imgHTML}
                <h3 class="card-title">${item.name} <span style="font-size:0.7em; color:#888;">(${item.dates})</span></h3>
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

    // Render Sources (Clickable)
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
            div.style.borderTopColor = '#2e7d32'; // Green override
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
    // Basic jump implementation
    // Finds the first element that has a year ID >= the requested year
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

// --- Mind Map ---
function renderMindMap(data) {
    const nodes = [];
    const edges = [];
    
    // Color Map (Green for Events as requested)
    const colorMap = {
        'Person': '#A0522D', 
        'Movement': '#DAA520', 
        'Event': '#2e7d32', // GREEN
        'Resource': '#4682B4'
    };

    data.forEach(item => {
        nodes.push({
            id: item.id,
            label: item.name,
            title: item.summary,
            color: { background: colorMap[item.type] || '#777', border: '#FFF' },
            font: { color: '#F8F8FF', size: 16, face: 'Georgia' },
            shape: 'box'
        });

        if (item.connections) {
            item.connections.forEach(targetName => {
                const target = data.find(i => i.name === targetName);
                if (target) {
                    edges.push({ from: item.id, to: target.id });
                }
            });
        }
    });

    const networkData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
    const container = document.getElementById('mindmapContainer');
    
    // Enable manipulation so he can move arrows if he wants
    window.network = new vis.Network(container, networkData, {
        physics: { enabled: true, stabilization: { iterations: 100 } },
        interaction: { hover: true, dragNodes: true },
        manipulation: { enabled: true, initiallyActive: false } 
    });
}

function resetMindMap() {
    renderMindMap(archiveData);
}

function downloadMindMap() {
    const canvas = document.querySelector('#mindmapContainer canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'archive-map.png';
        link.href = canvas.toDataURL();
        link.click();
    }
}

// --- Floating Notes ---
function toggleNotes() {
    const notes = document.getElementById('floatingNotes');
    notes.classList.toggle('minimized');
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
