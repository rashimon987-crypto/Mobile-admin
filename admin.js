/**
 * =====================================================================
 * BLUE CART SHOPPING - ADMIN CONTROLLER
 * Full Address & Product Photo Display on Orders, Safe Photo Upload
 * =====================================================================
 */

const SUPABASE_URL = "https://mxwcnkopzlktfgyyhych.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14d2Nua29wemxrdGZneXloeWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzU3ODgsImV4cCI6MjEwMjExMTc4OH0.jEm_GRhCNcmeVRphRy5XdzCopGhP79CzxrR-9hOQROw";

const client = (SUPABASE_URL.startsWith("http") && !SUPABASE_URL.includes("YOUR_PROJECT"))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let orders = JSON.parse(localStorage.getItem('bluecart_orders') || '[]');
let categories = JSON.parse(localStorage.getItem('bluecart_categories') || '[]');
let products = JSON.parse(localStorage.getItem('bluecart_products') || '[]');

if (!products.length) {
  products = [
    { id: 'p101', name: 'Pure Cotton Printed Anarkali Kurti', category: 'Women', base_price: 299, mrp: 899, default_reseller_profit: 100, is_cod_available: true, images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'], description: 'Pure breathable cotton fabric.' },
    { id: 'p102', name: 'Wireless Bluetooth Earbuds Pro (36hr Playtime)', category: 'Electronics', base_price: 399, mrp: 1499, default_reseller_profit: 150, is_cod_available: true, images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600'], description: 'Deep Bass sound.' },
    { id: 'p103', name: 'Men Premium Regular Fit Casual Shirt', category: 'Men', base_price: 349, mrp: 999, default_reseller_profit: 120, is_cod_available: true, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600'], description: 'Soft cotton fabric.' },
    { id: 'p104', name: 'Insulated Hot & Cold Water Bottle (1000ml)', category: 'Home', base_price: 199, mrp: 599, default_reseller_profit: 80, is_cod_available: true, images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600'], description: 'Double-wall stainless steel.' }
  ];
  localStorage.setItem('bluecart_products', JSON.stringify(products));
}

if (!categories.length) {
  categories = [
    { name: 'Women', photo: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300', sub: 'TOP PICKS', desc: 'Kurtis, Sarees & Ethnic Wear', theme: 'banner-women' },
    { name: 'Electronics', photo: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300', sub: 'BEST MARGINS', desc: 'Earbuds, Smartwatches & Audio', theme: 'banner-electronics' },
    { name: 'Men', photo: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300', sub: 'TRENDING', desc: 'Casual Shirts, T-Shirts & Pants', theme: 'banner-men' },
    { name: 'Home', photo: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300', sub: 'ESSENTIALS', desc: 'Flasks, Bottles & Kitchenware', theme: 'banner-home' }
  ];
  localStorage.setItem('bluecart_categories', JSON.stringify(categories));
}

// 1. ADMIN UPI SETTINGS
function initAdminUpi() {
  const el = document.getElementById('admin-upi-input');
  if (el) el.value = localStorage.getItem('bluecart_admin_upi') || "bluecart@upi";
}

function saveAdminUpi() {
  const el = document.getElementById('admin-upi-input');
  if (!el) return;
  const upi = el.value.trim();
  if (!upi || !upi.includes('@')) { 
    alert('Please enter a valid UPI ID'); 
    return; 
  }
  localStorage.setItem('bluecart_admin_upi', upi);
  alert('Admin UPI ID saved: ' + upi);
}

// 2. TAB CONTROLLER
function switchAdminTab(tab) {
  const tabs = ['orders', 'products', 'categories', 'withdrawals'];
  tabs.forEach(t => {
    const el = document.getElementById(`admin-tab-${t}`);
    const btn = document.getElementById(`tab-${t}-btn`);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
    if (btn) btn.className = (t === tab) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  });

  if (tab === 'products') { loadProducts(); populateProductCategoryDropdown(); }
  if (tab === 'categories') { loadCategories(); }
  if (tab === 'orders') { loadAdminOrders(); }
}

// 3. PRODUCT MANAGEMENT
async function loadProducts() {
  if (client) {
    try {
      const { data, error } = await client.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (!error && data && data.length) {
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
  populateProductCategoryDropdown();
}

function renderAdminProducts() {
  const tbody = document.getElementById('admin-products-table-body');
  const countEl = document.getElementById('admin-products-count');
  if (countEl) countEl.innerText = products.length;
  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No products found. Add a product above.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p, idx) => {
    const isCod = p.is_cod_available !== false;
    const photoCount = (p.images && Array.isArray(p.images)) ? p.images.length : 1;

    return `
      <tr>
        <td>
          <div style="position:relative; display:inline-block;">
            <img src="${p.images?.[0] || 'https://via.placeholder.com/50'}" style="width:45px; height:45px; object-fit:cover; border-radius:6px;" />
            <span style="position:absolute; bottom:-4px; right:-4px; background:#1e293b; color:#fff; font-size:0.6rem; font-weight:700; padding:1px 4px; border-radius:4px;">
              ${photoCount} 📷
            </span>
          </div>
        </td>
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
          <div style="display:flex; gap:6px;">
            <button onclick="editProduct(${idx})" class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary); padding:4px 8px;" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button onclick="deleteProduct(${idx})" class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger); padding:4px 8px;" title="Delete Product">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// EDIT PRODUCT
function editProduct(idx) {
  const p = products[idx];
  if (!p) return;

  const setSafe = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  };

  setSafe('p-edit-id', p.id);
  setSafe('p-add-name', p.name);
  setSafe('p-add-cat', p.category);
  setSafe('p-add-mrp', p.mrp);
  setSafe('p-add-base', p.base_price);
  setSafe('p-add-margin', p.default_reseller_profit);

  setSafe('p-add-img1', p.images?.[0] || '');
  setSafe('p-add-img2', p.images?.[1] || '');
  setSafe('p-add-img3', p.images?.[2] || '');

  setSafe('p-add-desc', p.description || '');
  setSafe('p-add-cod', (p.is_cod_available !== false) ? 'true' : 'false');

  const heading = document.getElementById('form-heading');
  if (heading) heading.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i> Edit Product: ${p.name}`;

  const btnSubmit = document.getElementById('btn-submit-product');
  if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-check"></i> Update Product`;

  const btnCancel = document.getElementById('btn-cancel-edit');
  if (btnCancel) btnCancel.style.display = 'inline-flex';

  const card = document.getElementById('product-form-card');
  if (card) card.scrollIntoView({ behavior: 'smooth' });
}

function cancelProductEdit() {
  const setSafe = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setSafe('p-edit-id', '');
  const form = document.getElementById('add-product-form');
  if (form) form.reset();

  const heading = document.getElementById('form-heading');
  if (heading) heading.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Add New Wholesale Product`;

  const btnSubmit = document.getElementById('btn-submit-product');
  if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Publish Product`;

  const btnCancel = document.getElementById('btn-cancel-edit');
  if (btnCancel) btnCancel.style.display = 'none';
}

// ADD & UPDATE PRODUCT WITH SAFE PHOTO READING
async function handleAdminAddProduct(e) {
  e.preventDefault();
  const editId = (document.getElementById('p-edit-id')?.value || '').trim();
  const isCodSelected = document.getElementById('p-add-cod')?.value === 'true';

  // Read photos safely with fallback
  const img1 = (document.getElementById('p-add-img1')?.value || document.getElementById('p-add-img')?.value || '').trim();
  const img2 = (document.getElementById('p-add-img2')?.value || '').trim();
  const img3 = (document.getElementById('p-add-img3')?.value || '').trim();

  let imageList = [img1, img2, img3].filter(url => url && url.length > 0);

  if (imageList.length === 0) {
    alert("Please enter at least Photo 1 (Main Image URL) to publish this product.");
    return;
  }

  const productData = {
    name: document.getElementById('p-add-name')?.value.trim() || 'Product',
    category: document.getElementById('p-add-cat')?.value || 'Fashion',
    mrp: Number(document.getElementById('p-add-mrp')?.value || 0),
    base_price: Number(document.getElementById('p-add-base')?.value || 0),
    default_reseller_profit: Number(document.getElementById('p-add-margin')?.value || 0),
    images: imageList,
    description: document.getElementById('p-add-desc')?.value.trim() || '',
    is_cod_available: isCodSelected,
    is_active: true
  };

  // UPDATE MODE
  if (editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...productData };
      localStorage.setItem('bluecart_products', JSON.stringify(products));

      if (client) {
        try {
          await client.from('products').update(productData).eq('id', editId);
        } catch(err) {
          console.warn("Supabase update error:", err);
        }
      }

      alert(`✅ Product "${productData.name}" updated successfully!`);
      cancelProductEdit();
      renderAdminProducts();
      return;
    }
  }

  // CREATE NEW MODE
  const newProduct = {
    id: 'p' + Math.floor(100 + Math.random() * 900),
    ...productData
  };

  products.unshift(newProduct);
  localStorage.setItem('bluecart_products', JSON.stringify(products));

  if (client) {
    try {
      await client.from('products').insert([newProduct]);
    } catch (err) {
      console.warn("Supabase insert notice:", err);
    }
  }

  alert(`✅ Product "${newProduct.name}" published with ${imageList.length} photo(s)!`);
  const form = document.getElementById('add-product-form');
  if (form) form.reset();
  renderAdminProducts();
}

async function toggleProductCod(idx) {
  const p = products[idx];
  if (!p) return;
  p.is_cod_available = p.is_cod_available === false ? true : false;
  localStorage.setItem('bluecart_products', JSON.stringify(products));

  if (client && p.id) {
    await client.from('products').update({ is_cod_available: p.is_cod_available }).eq('id', p.id);
  }
  renderAdminProducts();
}

async function deleteProduct(idx) {
  const p = products[idx];
  if (!p) return;
  if (!confirm(`Delete "${p.name}"?`)) return;

  if (client && p.id) {
    await client.from('products').delete().eq('id', p.id);
  }
  products.splice(idx, 1);
  localStorage.setItem('bluecart_products', JSON.stringify(products));
  renderAdminProducts();
}

// 4. CATEGORIES
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
  const photoUrl = (document.getElementById('cat-add-photo')?.value || '').trim();

  const newCat = {
    name: (document.getElementById('cat-add-name')?.value || '').trim(),
    photo: photoUrl,
    sub: (document.getElementById('cat-add-sub')?.value || '').trim(),
    desc: (document.getElementById('cat-add-desc')?.value || '').trim(),
    theme: document.getElementById('cat-add-theme')?.value || 'banner-women'
  };

  categories.push(newCat);
  localStorage.setItem('bluecart_categories', JSON.stringify(categories));

  if (client) {
    await client.from('categories').insert([newCat]);
  }

  alert(`Category "${newCat.name}" created!`);
  const form = document.getElementById('add-category-form');
  if (form) form.reset();
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

// 5. RICH ORDER DISPLAY: PRODUCT PHOTO, DETAILS & FULL CUSTOMER ADDRESS
async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-list-container');
  if (!container) return;

  if (client) {
    const { data } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (data && data.length) orders = data;
  }

  if (!orders.length) {
    container.innerHTML = `<div class="card" style="padding:24px; text-align:center; color:var(--muted);"><i class="fa-solid fa-box-open" style="font-size:2rem; margin-bottom:8px;"></i><p>No customer orders placed yet.</p></div>`;
    return;
  }

  container.innerHTML = orders.map((o) => {
    const isUpi = o.payment_method === 'UPI';
    const isVerified = o.payment_status === 'Verified';
    
    // Product Photo fallback from order or placeholder
    const prodPhoto = o.product_image || (o.items?.[0]?.image) || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200';
    const prodTitle = o.product_name || (o.items?.[0]?.name) || 'Reseller Catalog Item';

    return `
      <div class="card" style="padding: 16px; border: 1px solid var(--border); box-shadow: var(--shadow);">
        <!-- Order Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-weight:800; font-size:1rem; color:var(--primary);">Order #${o.id}</span>
            <small style="color:var(--muted); display:block;">Placed on: ${new Date(o.created_at || Date.now()).toLocaleDateString()}</small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="badge-tag">${o.payment_method || 'COD'}</span>
            ${isVerified 
              ? '<span class="badge-status-verified"><i class="fa-solid fa-check"></i> Paid & Verified</span>' 
              : isUpi 
                ? '<span class="badge-status-pending"><i class="fa-solid fa-clock"></i> UPI Check Required</span>' 
                : '<span style="background:#e2e8f0; color:#475569; font-weight:700; padding:3px 8px; border-radius:4px; font-size:0.75rem;">COD Pending</span>'
            }
          </div>
        </div>

        <!-- Middle Section: Product Photo & Pricing -->
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:14px;">
          <img src="${prodPhoto}" alt="${prodTitle}" style="width:75px; height:75px; object-fit:cover; border-radius:10px; border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px;">${prodTitle}</div>
            <div style="font-size:0.85rem; color:var(--muted);">
              Total Collectible: <strong style="color:var(--text);">₹${o.total_amount}</strong> | Reseller Profit: <strong style="color:var(--success);">₹${o.reseller_profit}</strong>
            </div>
            ${o.upi_ref_id ? `<div style="font-size:0.8rem; color:#2563eb; font-weight:700; margin-top:2px;"><i class="fa-solid fa-receipt"></i> UTR Ref: ${o.upi_ref_id}</div>` : ''}
          </div>
        </div>

        <!-- Full Delivery Address Box -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:14px; font-size:0.85rem;">
          <div style="font-weight:700; color:var(--text); margin-bottom:4px;">
            <i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> Shipping Destination:
          </div>
          <div><strong>Recipient:</strong> ${o.customer_name} (<a href="tel:${o.customer_mobile}" style="color:var(--primary); font-weight:700; text-decoration:none;">📞 ${o.customer_mobile}</a>)</div>
          <div style="margin-top:4px; line-height:1.4; color:#334155;">
            <strong>Address:</strong> ${o.shipping_address}, ${o.city} - <strong>PIN: ${o.pincode}</strong>
          </div>
        </div>

        <!-- Action Controls -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px solid #f1f5f9; padding-top:10px;">
          <div>
            <label style="font-size:0.8rem; font-weight:700; color:var(--muted); margin-right:6px;">Delivery Stage:</label>
            <select onchange="updateDeliveryStatus('${o.id}', this.value)" style="padding:6px 10px; border-radius:6px; font-weight:700; border:1px solid var(--border);">
              <option ${o.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option ${o.order_status === 'Packed' ? 'selected' : ''}>Packed</option>
              <option ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            </select>
          </div>

          <div>
            ${!isVerified && isUpi 
              ? `<button class="btn btn-sm btn-accent" onclick="verifyPayment('${o.id}')"><i class="fa-solid fa-shield-check"></i> Verify UPI Payment</button>`
              : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function verifyPayment(orderId) {
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) orders[idx].payment_status = 'Verified';
  localStorage.setItem('bluecart_orders', JSON.stringify(orders));
  if (client) await client.from('orders').update({ payment_status: 'Verified' }).eq('id', orderId);
  alert('Payment Verified & Confirmed!');
  loadAdminOrders();
}

async function updateDeliveryStatus(orderId, newStatus) {
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) orders[idx].order_status = newStatus;
  localStorage.setItem('bluecart_orders', JSON.stringify(orders));
  if (client) await client.from('orders').update({ order_status: newStatus }).eq('id', orderId);
  alert(`Order status updated to: ${newStatus}`);
  loadAdminOrders();
}

// INIT
initAdminUpi();
loadProducts();
loadCategories();
loadAdminOrders();