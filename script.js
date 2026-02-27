// State
let items = [];
let focusPriceInputId = null;
let draggedItemIndex = null;

// DOM Elements
const form = document.getElementById('add-item-form');
const input = document.getElementById('new-item-input');
const list = document.getElementById('shopping-list');
const totalDisplay = document.getElementById('total-amount');
const appTitleInput = document.getElementById('app-title');


// Initialize
function init() {
    const saved = localStorage.getItem('shopping-list-items');
    if (saved) {
        try {
            items = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse localStorage data', e);
            items = [];
        }
    }

    // Load title from localStorage
    const savedTitle = localStorage.getItem('shopping-list-title');
    if (savedTitle && appTitleInput) {
        appTitleInput.value = savedTitle;
    }

    // Auto-save title changes
    if (appTitleInput) {
        appTitleInput.addEventListener('change', (e) => {
            localStorage.setItem('shopping-list-title', e.target.value.trim());
        });
    }

    render();
}

// Save to localStorage
function save() {
    localStorage.setItem('shopping-list-items', JSON.stringify(items));
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
}

// Convert full-width numbers to half-width
function toHalfWidthNumber(str) {
    return str.replace(/[０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

// Validate price input
function validatePrice(valueStr) {
    if (!valueStr) return null;

    // Convert full-width to half-width, then remove anything that's not a digit
    let cleaned = toHalfWidthNumber(valueStr).replace(/[^0-9]/g, '');

    if (cleaned === '') return null;

    // Parse as integer
    const parsed = parseInt(cleaned, 10);

    // Check if it's a valid non-negative number
    if (isNaN(parsed) || parsed < 0) {
        return null; // Invalid
    }
    return parsed;
}

// Add Item
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const newItem = {
        id: generateId(),
        name: text,
        purchased: false,
        price: 0
    };

    items.push(newItem);
    input.value = '';
    save();
    render();

    // Scroll to the bottom of the list
    setTimeout(() => {
        list.scrollTop = list.scrollHeight;
    }, 50);
});

// Toggle purchased state
function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.purchased = !item.purchased;

        if (item.purchased) {
            // Auto Focus the input when checked
            focusPriceInputId = id;
        }
        // When unchecking, we do NOT reset item.price to 0 anymore.
        // It stays in memory but is ignored by updateTotal() due to !item.purchased

        save();
        render();
    }
}

// Delete item
function deleteItem(id) {
    items = items.filter(i => i.id !== id);
    save();
    render();
}

// Recalculate and update the total display
function updateTotal() {
    const total = items.reduce((sum, item) => {
        if (item.purchased) {
            return sum + (item.price || 0);
        }
        return sum;
    }, 0);
    totalDisplay.textContent = formatCurrency(total);
}

// Render the list
function render() {
    list.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = `list-item ${item.purchased ? 'purchased' : ''}`;
        li.draggable = true;

        li.innerHTML = `
            <div class="drag-handle" aria-hidden="true">☰</div>
            <div class="checkbox-wrapper">
                <input type="checkbox" class="item-checkbox" ${item.purchased ? 'checked' : ''} aria-label="Mark ${item.name} as purchased">
            </div>
            <span class="item-name">${item.name}</span>
            <div class="price-input-container">
                <span class="currency-symbol">¥</span>
                <input type="text" inputmode="numeric" class="price-input" value="${item.price > 0 ? item.price : ''}" placeholder="金額（税込）" aria-label="Amount for ${item.name}">
            </div>
            <button type="button" class="delete-btn" aria-label="Delete ${item.name}">✕</button>
        `;

        // Event listeners for this item
        const checkbox = li.querySelector('.item-checkbox');
        checkbox.addEventListener('change', () => toggleItem(item.id));

        const priceInput = li.querySelector('.price-input');

        // Input event for real-time calculation during typing (safe from breaking Japanese IME composition)
        priceInput.addEventListener('input', (e) => {
            const validPrice = validatePrice(e.target.value);
            if (validPrice !== null) {
                item.price = validPrice;
                save();
                updateTotal();
            }
        });

        // Change event triggers visual cleansing and validation fallback on blur
        priceInput.addEventListener('change', (e) => {
            const validPrice = validatePrice(e.target.value);
            if (validPrice === null && e.target.value.trim() !== "") {
                // Invalid input visual feedback
                e.target.classList.add('error');
                setTimeout(() => e.target.classList.remove('error'), 400);
                e.target.value = "";
                item.price = 0;
            } else {
                item.price = validPrice || 0;
                // Cleanse input UI
                e.target.value = validPrice > 0 ? validPrice : "";
            }
            save();
            updateTotal();
        });

        if (focusPriceInputId === item.id) {
            setTimeout(() => priceInput.focus(), 50);
            focusPriceInputId = null;
        }

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteItem(item.id));

        // Drag and drop events
        li.addEventListener('dragstart', (e) => {
            draggedItemIndex = items.findIndex(i => i.id === item.id);
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.id);
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const bounding = li.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                li.classList.remove('drag-over-top');
                li.classList.add('drag-over-bottom');
            } else {
                li.classList.remove('drag-over-bottom');
                li.classList.add('drag-over-top');
            }
        });

        li.addEventListener('dragleave', (e) => {
            li.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.classList.remove('drag-over-top', 'drag-over-bottom');

            const targetIndex = items.findIndex(i => i.id === item.id);
            if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
                const bounding = li.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                let dropIndex = targetIndex;
                if (e.clientY - offset > 0) {
                    dropIndex = targetIndex + 1;
                }

                const draggedItem = items.splice(draggedItemIndex, 1)[0];
                if (draggedItemIndex < dropIndex) {
                    dropIndex--;
                }
                items.splice(dropIndex, 0, draggedItem);
                save();
                render();
            }
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
            draggedItemIndex = null;
        });

        // Swipe to Delete (Mobile)
        let touchStartX = 0;
        let touchCurrentX = 0;

        li.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        li.addEventListener('touchmove', (e) => {
            touchCurrentX = e.changedTouches[0].screenX;
            const diffX = touchCurrentX - touchStartX;
            // Only allow right swipe for delete based on feedback
            if (diffX > 0) {
                li.style.transform = `translateX(${diffX}px)`;
                li.style.opacity = 1 - (diffX / window.innerWidth);
            }
        }, { passive: true });

        li.addEventListener('touchend', (e) => {
            touchCurrentX = e.changedTouches[0].screenX;
            const diffX = touchCurrentX - touchStartX;
            const threshold = window.innerWidth * 0.4; // 40% of screen width

            if (diffX > threshold) {
                // Animate out and delete
                li.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                li.style.transform = `translateX(${window.innerWidth}px)`;
                li.style.opacity = 0;
                setTimeout(() => deleteItem(item.id), 300);
            } else {
                // Snap back
                li.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                li.style.transform = 'translateX(0)';
                li.style.opacity = 1;
                // Remove inline styles after transition
                setTimeout(() => {
                    li.style.transition = '';
                    li.style.transform = '';
                    li.style.opacity = '';
                }, 300);
            }
        });

        list.appendChild(li);
    });

    updateTotal();
}

// Run init on load
document.addEventListener('DOMContentLoaded', init);
