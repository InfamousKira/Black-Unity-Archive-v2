const container = document.getElementById('entry-container');

function getPlaceholder(name) {
    // Generates a Gold & Black placeholder with the entry's name
    const formattedName = name.replace(/\s+/g, '+');
    return `https://placehold.co/400x300/1e1e1e/DAA520?text=${formattedName}`;
}

function renderEntries(data) {
    container.innerHTML = '';
    data.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'entry-card';

        // Check if image exists, otherwise use the auto-placeholder
        const imageSrc = (entry.images && entry.images.length > 0 && entry.images[0] !== "") 
                         ? entry.images[0] 
                         : getPlaceholder(entry.name);

        card.innerHTML = `
            <img src="${imageSrc}" alt="${entry.name}" loading="lazy">
            <div class="card-content">
                <span class="category-tag">${entry.type}</span>
                <h3>${entry.name}</h3>
                <p class="dates">${entry.dates}</p>
                <p class="summary">${entry.summary}</p>
                <div class="key-terms">
                    ${entry.key_terms.map(term => `<span class="term">${term}</span>`).join('')}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
