// State
let items = [];
let focusPriceInputId = null;

// DOM Elements
const form = document.getElementById('add-item-form');
const input = document.getElementById('new-item-input');
const list = document.getElementById('shopping-list');
const totalDisplay = document.getElementById('total-amount');

// Initialize
function init() {
      const saved = localStorage.getItem('shopping-list-items');
      if (saved) {
                items = JSON.parse(saved);
      }
      render();
}

// Save
function save() {
      localStorage.setItem('shopping-list-items', JSON.stringify(items));
}

// Add
form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      items.push({ id: Date.now(), name: text, purchased: false, price: 0 });
      input.value = '';
      save();
      render();
});

// Render
function render() {
      list.innerHTML = '';
      items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-item';
                li.innerHTML = `
                            <input type="checkbox" ${item.purchased ? 'checked' : ''}>
                                        <span>${item.name}</span>
                                                    <input type="number" value="${item.price}" style="width: 60px">
                                                                <button>Delete</button>
                                                                        `;
                list.appendChild(li);
      });
      updateTotal();
}

function updateTotal() {
      const total = items.reduce((s, i) => s + (i.price || 0), 0);
      totalDisplay.textContent = '$' + total;
}

document.addEventListener('DOMContentLoaded', init);
