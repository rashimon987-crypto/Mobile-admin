/**
 * BLUE CART SHOPPING - ADMIN CONTROLLER (FIXED PERSISTENCE)
 */

const SUPABASE_URL = "https://mxwcnkopzlktfgyyhych.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14d2Nua29wemxrdGZneXloeWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzU3ODgsImV4cCI6MjEwMjExMTc4OH0.jEm_GRhCNcmeVRphRy5XdzCopGhP79CzxrR-9hOQROw";

const client = (SUPABASE_URL.startsWith("http") && !SUPABASE_URL.includes("YOUR_PROJECT"))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let orders = JSON.parse(localStorage.getItem('bluecart_orders') || '[]');
let categories = JSON.parse(localStorage.getItem('bluecart_categories') || '[]');
let products = JSON.parse(localStorage.getItem('bluecart_products') || '[]');

if (!categories.length) {
  categories = [
    { name: 'Women', photo: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300', sub: 'TOP PICKS', desc: 'Kurtis & Sarees', theme: 'banner-women' },
    { name: 'Electronics', photo: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300', sub: 'BEST MARGINS', desc: 'Earbuds & Audio', theme: 'banner-electronics' },
    { name: 'Men', photo: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300', sub: 'TRENDING', desc: 'Shirts & Trousers', theme: 'banner-men' },
    { name: 'Home', photo: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300', sub: 'ESSENTIALS', desc: 'Bottles & Flasks', theme: 'banner-home' }
  ];
  localStorage.setItem('bluecart_categories', JSON.stringify(categories));
}

// 1. ADMIN UPI
function initAdminUpi() {
  const el = document.getElementById('admin-upi-input');
  if (el) el.value = localStorage.getItem('bluecart_admin_upi') || "bluecart@upi";
}

function saveAdminUpi() {
  const upi = document.getElementById('admin-upi-input').value.trim();
  if (!upi || !upi.includes('@')) { alert('Please enter valid UPI ID'); return; }
  localStorage.setItem('bluecart_admin_upi', upi);
  alert('Admin UPI ID saved: ' + upi);
}

// 2. TAB CONTROLLER
function switchAdminTab(tab) {
  document.getElementById('admin-tab-orders').style.display = tab === 'orders' ? 'block' : 'none';
  document.getElementById('admin-tab-products').style.display = tab === 'products' ? 'block' : 'none';
  document.getElementById('admin-tab-categories').style.display = tab === 'categories' ? 'block' : 'none';
  document.getElementById('admin-tab-withdrawals').style.display = tab === 'withdrawals' ? 'block' : 'none';

  document.getElementById('tab-orders-btn').className = tab === 'orders' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  document.getElementById('tab-products-btn').className = tab === 'products' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  document.getElementById('tab-categories-btn').className = tab === 'categories' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  document.getElementById('tab-withdrawals-btn').className = tab === 'withdrawals' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';

  if (tab === 'products') { loadProducts(); populateProductCategoryDropdown(); }
  if (tab === 'categories') { loadCategories(); }
}

// 3. LOAD PRODUCTS (SMART MERGE - DATA WILL NEVER DISAPPEAR)
async function loadProducts() {
  if (client) {
    try {
      const { data, error } = await client.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (!error && data && data.length) {
        // Smart Merge: Supabase-ലെ ഡാറ്റയും ലോക്കൽ ഡാറ്റയും ഒന്നിപ്പിക്കുന്നു
        const serverIds = new Set(data.map(p => p.id));
        const localOnly = products.filter(p => !serverIds.has(p.id));
        products = [...localOnly, ...data];
        localStorage.setItem('bluecart_products', JSON.stringify(products));
      }
    } catch(err) {
      console.warn("Offline products load:", err);
    }
  }
  renderAdminProducts();
}

function renderAdminProducts() {
  const tbody = document.getElementById('admin-products-table-body');
  document.getElementById('admin-products-count').innerText = products.length;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No products found. Add a product above.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p, idx) => {
    const isCod = p.is_cod_available !== false;
    return `
      <tr>
        <td><img src="${p.images?.[0] || 'https://via.placeholder.com/50'}" style="width:45px; height:45px; object-fit:cover; border-radius:6px;" /></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge-tag">${p.category}</span></td>
        <td>₹${p.base_price}</td>
        <td style="color:var(--success); font-weight:700;">₹${p.default_reseller_profit}</td>
        <td>
          <button onclick="toggleProductCod(${idx})" class="btn btn-sm ${isCod ? 'btn-accent' : 'btn-outline'}" style="font-size:0.75rem; padding:4px 8px;">
            ${isCod ? '✅ COD ON' : '❌ COD OFF'}
          </button>
        </td>
        <td>
          <button onclick="deleteProduct(${idx})" class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger); padding:2px 8px;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 4. ADD NEW PRODUCT (WITH ERROR ALERTING)
async function handleAdminAddProduct(e) {
  e.preventDefault();
  const isCodSelected = document.getElementById('p-add-cod').value === 'true';

  const newProduct = {
    id: 'p' + Math.floor(100 + Math.random() * 900),
    name: document.getElementById('p-add-name').value.trim(),
    category: document.getElementById('p-add-cat').value,
    mrp: Number(document.getElementById('p-add-mrp').value),
    base_price: Number(document.getElementById('p-add-base').value),
    default_reseller_profit: Number(document.getElementById('p-add-margin').value),
    images: [document.getElementById('p-add-img').value.trim()],
    description: document.getElementById('p-add-desc').value.trim(),
    is_cod_available: isCodSelected,
    is_active: true
  };

  // 1. Save in local memory first
  products.unshift(newProduct);
  localStorage.setItem('bluecart_products', JSON.stringify(products));

  // 2. Insert into Supabase
  if (client) {
    const { error } = await client.from('products').insert([newProduct]);
    if (error) {
      alert("⚠️ Supabase Notice: " + error.message + "\n(Product is saved in your local app)");
    }
  }

  alert(`✅ Product "${newProduct.name}" added successfully!`);
  document.getElementById('add-product-form').reset();
  renderAdminProducts();
}

async function toggleProductCod(idx) {
  const p = products[idx];
  p.is_cod_available = p.is_cod_available === false ? true : false;
  localStorage.setItem('bluecart_products', JSON.stringify(products));

  if (client && p.id) {
    await client.from('products').update({ is_cod_available: p.is_cod_available }).eq('id', p.id);
  }
  renderAdminProducts();
}

async function deleteProduct(idx) {
  const p = products[idx];
  if (!confirm(`Delete "${p.name}"?`)) return;

  if (client && p.id) {
    await client.from('products').delete().eq('id', p.id);
  }
  products.splice(idx, 1);
  localStorage.setItem('bluecart_products', JSON.stringify(products));
  renderAdminProducts();
}

// 5. CATEGORIES
async function loadCategories() {
  if (client) {
    const { data } = await client.from('categories').select('*');
    if (data && data.length) {
      categories = data;
      localStorage.setItem('bluecart_categories', JSON.stringify(categories));
    }
  }
  renderAdminCategories();
  populateProductCategoryDropdown();
}

function populateProductCategoryDropdown() {
  const select = document.getElementById('p-add-cat');
  if (!select) return;
  select.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function renderAdminCategories() {
  const tbody = document.getElementById('admin-categories-body');
  if (!tbody) return;
  tbody.innerHTML = categories.map((c, idx) => `
    <tr>
      <td><img src="${c.photo || 'https://via.placeholder.com/50'}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;" /></td>
      <td><strong>${c.name}</strong></td>
      <td><small style="color:var(--muted);">${c.sub || ''}</small></td>
      <td>
        <button onclick="deleteCategory(${idx})" class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger); padding:2px 8px;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleAdminAddCategory(e) {
  e.preventDefault();
  const photoUrl = document.getElementById('cat-add-photo').value.trim();

  const newCat = {
    name: document.getElementById('cat-add-name').value.trim(),
    photo: photoUrl,
    sub: document.getElementById('cat-add-sub').value.trim(),
    desc: document.getElementById('cat-add-desc').value.trim(),
    theme: document.getElementById('cat-add-theme').value
  };

  categories.push(newCat);
  localStorage.setItem('bluecart_categories', JSON.stringify(categories));

  if (client) {
    await client.from('categories').insert([newCat]);
  }

  alert(`Category "${newCat.name}" created!`);
  document.getElementById('add-category-form').reset();
  renderAdminCategories();
  populateProductCategoryDropdown();
}

function deleteCategory(idx) {
  if (!confirm(`Delete "${categories[idx].name}"?`)) return;
  categories.splice(idx, 1);
  localStorage.setItem('bluecart_categories', JSON.stringify(categories));
  renderAdminCategories();
  populateProductCategoryDropdown();
}

// 6. ORDERS
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-body');
  if (!tbody) return;

  if (client) {
    const { data } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (data && data.length) orders = data;
  }

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--muted);">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map((o) => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td><strong>${o.customer_name}</strong><br><small style="color:var(--muted);">${o.customer_mobile}</small></td>
      <td>
        <span class="badge-tag">${o.payment_method || 'COD'}</span><br>
        ${o.upi_ref_id ? `<small style="font-weight:700; color:var(--primary);">UTR: ${o.upi_ref_id}</small>` : '<small>No UTR (COD)</small>'}
      </td>
      <td style="font-weight:700;">₹${o.total_amount}</td>
      <td>
        ${o.payment_status === 'Verified'
          ? '<span class="badge-status-verified">Verified</span>'
          : `<button class="btn btn-sm btn-accent" style="font-size:0.7rem; padding:3px 8px;" onclick="verifyPayment('${o.id}')">Verify Payment</button>`}
      </td>
      <td>
        <select onchange="updateDeliveryStatus('${o.id}', this.value)" style="padding:4px; border-radius:6px;">
          <option ${o.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option ${o.order_status === 'Packed' ? 'selected' : ''}>Packed</option>
          <option ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function verifyPayment(orderId) {
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) orders[idx].payment_status = 'Verified';
  localStorage.setItem('bluecart_orders', JSON.stringify(orders));
  if (client) await client.from('orders').update({ payment_status: 'Verified' }).eq('id', orderId);
  alert('Payment Verified!');
  loadAdminOrders();
}

async function updateDeliveryStatus(orderId, newStatus) {
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) orders[idx].order_status = newStatus;
  localStorage.setItem('bluecart_orders', JSON.stringify(orders));
  if (client) await client.from('orders').update({ order_status: newStatus }).eq('id', orderId);
  alert('Order status updated!');
  loadAdminOrders();
}

// INIT
initAdminUpi();
loadProducts();
loadCategories();
loadAdminOrders();