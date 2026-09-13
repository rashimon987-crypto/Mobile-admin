/**
 * =====================================================================
 * BLUE CART SHOPPING - FULL CLIENT ENGINE
 * Multi-page Navigation, Category Feed, Reseller Margins, 
 * WhatsApp Viral Sharing, Instant UPI Deep-linking & Supabase Sync
 * =====================================================================
 */

// 1. SUPABASE DATABASE CONFIGURATION
const SUPABASE_URL = "https://mxwcnkopzlktfgyyhych.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14d2Nua29wemxrdGZneXloeWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzU3ODgsImV4cCI6MjEwMjExMTc4OH0.jEm_GRhCNcmeVRphRy5XdzCopGhP79CzxrR-9hOQROw";

const client = (SUPABASE_URL.startsWith("http") && !SUPABASE_URL.includes("YOUR_PROJECT"))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ADMIN CONFIGURABLE UPI ID (Synced with Admin Panel / localStorage)
let ADMIN_UPI_ID = localStorage.getItem('bluecart_admin_upi') || "bluecart@upi";

// 2. GLOBAL APP STATE
const state = {
  currentPage: 'home',
  user: null,
  cart: JSON.parse(localStorage.getItem('bluecart_cart') || '[]'),
  referralCode: localStorage.getItem('bluecart_ref') || 'BCS-8821',
  customerSellingPrice: null, // Passed when customer clicks WhatsApp link
  isCustomerMode: false,      // True when customer views shared link
  selectedPaymentMethod: 'UPI',
  products: [
    {
      id: 'p101',
      name: 'Pure Cotton Printed Anarkali Kurti',
      category: 'Women',
      base_price: 299,
      mrp: 899,
      default_reseller_profit: 100,
      images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'],
      description: 'Pure breathable cotton fabric with rich gold foil ethnic print. Instant UPI payment and Cash On Delivery available across India.'
    },
    {
      id: 'p102',
      name: 'Wireless Bluetooth Earbuds Pro (36hr Playtime)',
      category: 'Electronics',
      base_price: 399,
      mrp: 1499,
      default_reseller_profit: 150,
      images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600'],
      description: 'Deep Bass HD sound, IPX5 water resistant, Type-C fast charging, Touch sensors with voice assistant support.'
    },
    {
      id: 'p103',
      name: 'Men Premium Regular Fit Casual Shirt',
      category: 'Men',
      base_price: 349,
      mrp: 999,
      default_reseller_profit: 120,
      images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600'],
      description: 'Soft-washed premium chambray cotton. Regular fit tailored with button-down collar and curved hem.'
    },
    {
      id: 'p104',
      name: 'Insulated Hot & Cold Water Bottle (1000ml)',
      category: 'Home',
      base_price: 199,
      mrp: 599,
      default_reseller_profit: 80,
      images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600'],
      description: 'Double-wall stainless steel vacuum flask. Keeps beverages chilled for 24 hrs and piping hot for 12 hrs.'
    }
  ],
  orders: JSON.parse(localStorage.getItem('bluecart_orders') || '[]'),
  selectedProduct: null
};

// Toast Notifications Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// 3. MULTI-PAGE NAVIGATION ROUTER (History & Query Aware)
function navigateTo(pageName, params = {}, pushHistory = true) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageName}`);

  if (target) {
    target.classList.add('active');
    state.currentPage = pageName;
    window.scrollTo(0, 0);

    // Update bottom nav tab state
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-page') === pageName);
    });

    // Update Browser History & Address Bar
    const query = new URLSearchParams(params);
    query.set('page', pageName);
    const newUrl = `${window.location.pathname}?${query.toString()}`;

    if (pushHistory) {
      window.history.pushState({ page: pageName, params }, '', newUrl);
    }

    // Initialize individual page logic
    if (pageName === 'home') {
      document.title = "Blue Cart | Wholesale Reseller Shopping";
      renderHomeProducts(state.products);
    } else if (pageName === 'product') {
      const productId = params.id || (state.selectedProduct ? state.selectedProduct.id : state.products[0].id);
      loadProductDetailPage(productId, params.sp, params.ref);
    } else if (pageName === 'cart') {
      document.title = "Blue Cart | Reseller Cart";
      renderCartPage();
    } else if (pageName === 'checkout') {
      document.title = "Blue Cart | Customer Address & Payment";
      setupCheckoutSummary();
    } else if (pageName === 'reseller-dashboard') {
      document.title = "Blue Cart | Reseller Portal";
      renderResellerDashboard();
    } else if (pageName === 'reseller-wallet') {
      document.title = "Blue Cart | Earnings & Wallet";
      renderWalletPage();
    }
  }
}

function navigateBack() {
  window.history.back();
}

// Support browser Forward and Backward buttons natively
window.onpopstate = (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page') || 'home';
  const id = urlParams.get('id');
  const sp = urlParams.get('sp');
  const ref = urlParams.get('ref');
  navigateTo(page, { id, sp, ref }, false);
};

// 4. HOME CATALOG WITH INTERSPERSED CATEGORY BREAKS
async function renderHomeProducts(productList) {
  // Sync products from Supabase if online
  if (client) {
    try {
      const { data } = await client.from('products').select('*').eq('is_active', true);
      if (data && data.length) state.products = data;
    } catch (err) {
      console.warn("Using local product catalog fallback:", err);
    }
  }

  const container = document.getElementById('home-feed-container');
  if (!container) return;

  // Visual Category Banners Configuration
  const categoryConfig = [
    {
      key: 'Women',
      title: '👗 Women Fashion & Kurtis',
      sub: 'TOP RESELLING PICKS',
      desc: 'High demand daily wear & festive ethnic collections',
      cssClass: 'banner-women'
    },
    {
      key: 'Electronics',
      title: '🎧 Smart Electronics & Audio',
      sub: 'BEST PROFIT MARGINS',
      desc: 'Bluetooth earbuds, smartwatches & trending accessories',
      cssClass: 'banner-electronics'
    },
    {
      key: 'Men',
      title: '👕 Men Casual & Formal Wear',
      sub: 'TRENDING THIS WEEK',
      desc: 'Premium cotton shirts & tailored streetwear',
      cssClass: 'banner-men'
    },
    {
      key: 'Home',
      title: '🏠 Home & Kitchen Essentials',
      sub: 'DAILY ESSENTIALS',
      desc: 'Insulated vacuum flasks, storage & kitchen utilities',
      cssClass: 'banner-home'
    }
  ];

  // Helper function to build Product Card HTML
  function createProductCardHtml(p) {
    const defaultSelling = Number(p.base_price) + Number(p.default_reseller_profit);
    return `
      <div class="card product-card">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
        <div class="product-card-body">
          <span class="profit-badge">Reseller Margin: ₹${p.default_reseller_profit}</span>
          <div class="product-title">${p.name}</div>
          <div class="price-row">
            <span class="selling-price">₹${defaultSelling}</span>
            <span class="mrp-price">₹${p.mrp}</span>
          </div>
          <button class="btn btn-primary btn-sm btn-block" style="margin-top:auto;" onclick="navigateTo('product', { id: '${p.id}' })">
            Set Price & Share
          </button>
        </div>
      </div>
    `;
  }

  let finalHtml = '';

  // 1. Initial Batch: Top Trending Products
  const topTrending = state.products.slice(0, 2);
  if (topTrending.length > 0) {
    finalHtml += `
      <div class="feed-category-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3 style="font-size:1.1rem;"><i class="fa-solid fa-fire" style="color:#ef4444;"></i> Top Trending Products</h3>
          <span style="font-size:0.75rem; color:var(--muted);">Cash On Delivery</span>
        </div>
        <div class="grid">
          ${topTrending.map(p => createProductCardHtml(p)).join('')}
        </div>
      </div>
    `;
  }

  // 2. Interspersing Category Break Banners & their Products
  categoryConfig.forEach(cat => {
    const categoryProducts = state.products.filter(p => p.category === cat.key);

    if (categoryProducts.length > 0) {
      finalHtml += `
        <div class="feed-category-section">
          <!-- INTERSPERSED CATEGORY BANNER -->
          <div class="feed-cat-banner ${cat.cssClass}">
            <div>
              <span class="banner-sub">${cat.sub}</span>
              <h3>${cat.title}</h3>
              <p>${cat.desc}</p>
            </div>
            <button onclick="filterCategory('${cat.key}')" class="btn btn-sm btn-outline-white">
              View All <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <!-- CATEGORY PRODUCTS -->
          <div class="grid">
            ${categoryProducts.map(p => createProductCardHtml(p)).join('')}
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = finalHtml;
}

// Category Pill Filter handler
function filterCategory(cat) {
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.classList.toggle('active', pill.innerText.includes(cat));
  });

  const container = document.getElementById('home-feed-container');

  if (cat === 'All') {
    renderHomeProducts(state.products);
  } else {
    const filtered = state.products.filter(p => p.category === cat);
    container.innerHTML = `
      <div class="feed-category-section">
        <h3 style="margin-bottom:12px;">Category: ${cat} (${filtered.length} products)</h3>
        <div class="grid">
          ${filtered.map(p => {
            const defaultSelling = Number(p.base_price) + Number(p.default_reseller_profit);
            return `
              <div class="card product-card">
                <img src="${p.images[0]}" alt="${p.name}" />
                <div class="product-card-body">
                  <span class="profit-badge">Reseller Margin: ₹${p.default_reseller_profit}</span>
                  <div class="product-title">${p.name}</div>
                  <div class="price-row">
                    <span class="selling-price">₹${defaultSelling}</span>
                    <span class="mrp-price">₹${p.mrp}</span>
                  </div>
                  <button class="btn btn-primary btn-sm btn-block" style="margin-top:auto;" onclick="navigateTo('product', { id: '${p.id}' })">
                    Set Price & Share
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// Global Live Search handler
function handleGlobalSearch(e) {
  const q = e.target.value.toLowerCase().trim();
  const matched = state.products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  const container = document.getElementById('home-feed-container');
  if (!container) return;

  if (!q) {
    renderHomeProducts(state.products);
    return;
  }

  container.innerHTML = `
    <div class="feed-category-section">
      <h3 style="margin-bottom:12px;">Search Results for "${q}" (${matched.length})</h3>
      <div class="grid">
        ${matched.map(p => {
          const defaultSelling = Number(p.base_price) + Number(p.default_reseller_profit);
          return `
            <div class="card product-card">
              <img src="${p.images[0]}" alt="${p.name}" />
              <div class="product-card-body">
                <span class="profit-badge">Margin: ₹${p.default_reseller_profit}</span>
                <div class="product-title">${p.name}</div>
                <div class="price-row">
                  <span class="selling-price">₹${defaultSelling}</span>
                  <span class="mrp-price">₹${p.mrp}</span>
                </div>
                <button class="btn btn-primary btn-sm btn-block" style="margin-top:auto;" onclick="navigateTo('product', { id: '${p.id}' })">
                  Set Price & Share
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 5. PRODUCT DETAIL (RESELLER VIEW VS CUSTOMER VIEW)
function loadProductDetailPage(productId, customSellingPrice, referralCode) {
  const p = state.products.find(item => item.id === productId) || state.products[0];
  state.selectedProduct = p;

  if (referralCode) {
    state.referralCode = referralCode;
    localStorage.setItem('bluecart_ref', referralCode);
  }

  document.getElementById('detail-product-img').src = p.images[0];
  document.getElementById('detail-product-cat').innerText = p.category;
  document.getElementById('detail-product-name').innerText = p.name;
  document.getElementById('detail-product-mrp').innerText = `MRP: ₹${p.mrp}`;
  document.getElementById('detail-product-desc').innerText = p.description;

  const basePrice = Number(p.base_price);

  // A. CUSTOMER MODE: If 'sp' (selling price) is present in URL
  if (customSellingPrice) {
    state.isCustomerMode = true;
    state.customerSellingPrice = Number(customSellingPrice);

    // Completely HIDE supplier base price and reseller margin box from customer
    document.getElementById('reseller-profit-calc-box').style.display = 'none';
    document.getElementById('reseller-action-btns').style.display = 'none';

    // Show Customer Instant Purchase & COD button with reseller set price
    document.getElementById('customer-buy-box').style.display = 'block';
    document.getElementById('cust-discount-tag').style.display = 'inline-block';
    document.getElementById('detail-product-selling').innerText = `₹${state.customerSellingPrice}`;
    document.getElementById('btn-cust-price').innerText = state.customerSellingPrice;
    document.getElementById('app-badge-role').innerText = "CUSTOMER STORE";

    document.title = `${p.name} - Offer Price ₹${state.customerSellingPrice}`;
  } 
  // B. RESELLER MODE: Full profit margin calculator & WhatsApp sharing tools
  else {
    state.isCustomerMode = false;
    document.getElementById('reseller-profit-calc-box').style.display = 'block';
    document.getElementById('reseller-action-btns').style.display = 'grid';
    document.getElementById('customer-buy-box').style.display = 'none';
    document.getElementById('cust-discount-tag').style.display = 'none';
    document.getElementById('app-badge-role').innerText = "RESELLER";

    const defaultSelling = basePrice + Number(p.default_reseller_profit);
    document.getElementById('calc-base-display').innerText = `₹${basePrice}`;
    
    const sellingInput = document.getElementById('calc-selling-input');
    sellingInput.value = defaultSelling;

    function updateLiveProfit() {
      const sp = Number(sellingInput.value);
      const profit = sp - basePrice;
      document.getElementById('calc-profit-display').innerText = `₹${profit}`;
      document.getElementById('detail-product-selling').innerText = `Selling: ₹${sp}`;
    }
    sellingInput.oninput = updateLiveProfit;
    updateLiveProfit();
  }
}

// 6. WHATSAPP VIRAL SHARING WITH PHOTO & LOCKED CUSTOM PRICE LINK
async function shareProductWhatsApp() {
  const p = state.selectedProduct;
  const customSellingPrice = document.getElementById('calc-selling-input').value;
  const ref = state.referralCode;

  // Use deployed host or current location
  const baseUrl = window.location.origin;
  const shareLink = `${baseUrl}${window.location.pathname}?page=product&id=${p.id}&sp=${customSellingPrice}&ref=${ref}`;
  const shareText = `🔥 Special Offer: *${p.name}*\n\n💰 Price: *₹${customSellingPrice}* (Free Home Delivery)\n⚡ Instant UPI & Cash on Delivery Available\n\n👉 Order directly here:\n${shareLink}`;

  // Native Mobile Web Share with Photo Blob
  if (navigator.canShare && navigator.share) {
    try {
      showToast('Preparing WhatsApp photo...', 'info');
      const response = await fetch(p.images[0]);
      const blob = await response.blob();
      const imageFile = new File([blob], `${p.id}.jpg`, { type: blob.type });

      if (navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          files: [imageFile],
          title: p.name,
          text: shareText
        });
        return;
      }
    } catch (err) {
      console.warn('Native share fallback triggered:', err);
    }
  }

  // Fallback: Open WhatsApp with product details and link
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + `\n\n📸 Photo: ${p.images[0]}`)}`;
  window.open(waUrl, '_blank');
}

// 7. CUSTOMER DIRECT BUY & CART LOGIC
function customerDirectBuyNow() {
  const p = state.selectedProduct;
  const sp = state.customerSellingPrice;
  const profit = sp - Number(p.base_price);

  state.cart = [{
    id: p.id,
    name: p.name,
    image: p.images[0],
    base_price: Number(p.base_price),
    selling_price: sp,
    profit: profit,
    quantity: 1
  }];
  localStorage.setItem('bluecart_cart', JSON.stringify(state.cart));
  updateCartBadges();

  navigateTo('checkout');
}

function addProductToCartFromDetail() {
  const p = state.selectedProduct;
  const sp = Number(document.getElementById('calc-selling-input').value);
  const base = Number(p.base_price);
  const profit = sp - base;

  if (profit < 10) {
    showToast('Margin must be at least ₹10', 'error');
    return;
  }

  state.cart.push({
    id: p.id,
    name: p.name,
    image: p.images[0],
    base_price: base,
    selling_price: sp,
    profit: profit,
    quantity: 1
  });

  localStorage.setItem('bluecart_cart', JSON.stringify(state.cart));
  updateCartBadges();
  showToast('Added to cart with your custom price!', 'success');
}

function renderCartPage() {
  const container = document.getElementById('cart-items-container');
  const summaryBox = document.getElementById('cart-summary-box');

  if (state.cart.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding: 40px 16px;"><p>Cart is empty.</p><button class="btn btn-primary" onclick="navigateTo('home')" style="margin-top:10px;">Browse Catalog</button></div>`;
    summaryBox.style.display = 'none';
    return;
  }

  summaryBox.style.display = 'block';
  let totalSelling = 0, totalBase = 0, totalProfit = 0;

  container.innerHTML = state.cart.map((item, idx) => {
    totalSelling += (item.selling_price * item.quantity);
    totalBase += (item.base_price * item.quantity);
    totalProfit += (item.profit * item.quantity);

    return `
      <div class="card" style="display:flex; flex-direction:row; padding:12px; gap:12px; align-items:center; margin-bottom:10px;">
        <img src="${item.image}" style="width:65px; height:65px; border-radius:8px; object-fit:cover;" />
        <div style="flex:1;">
          <div style="font-weight:700; font-size:0.85rem;">${item.name}</div>
          <div style="font-size:0.8rem; color:var(--muted);">Collect: ₹${item.selling_price}</div>
          <div style="font-size:0.8rem; color:var(--success); font-weight:700;">Margin: ₹${item.profit * item.quantity}</div>
        </div>
        <button onclick="removeCartItem(${idx})" class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join('');

  document.getElementById('cart-total-selling').innerText = `₹${totalSelling}`;
  document.getElementById('cart-total-base').innerText = `₹${totalBase}`;
  document.getElementById('cart-total-profit').innerText = `₹${totalProfit}`;
}

function removeCartItem(idx) {
  state.cart.splice(idx, 1);
  localStorage.setItem('bluecart_cart', JSON.stringify(state.cart));
  updateCartBadges();
  renderCartPage();
}

function updateCartBadges() {
  const count = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
  document.querySelectorAll('.cart-badge-count').forEach(b => b.innerText = count);
}

// 8. CHECKOUT, DYNAMIC UPI APP DEEP-LINKING & COD CONFIRMATION
function selectPaymentMethod(method) {
  state.selectedPaymentMethod = method;
  document.getElementById('pay-opt-upi').classList.toggle('active', method === 'UPI');
  document.getElementById('pay-opt-cod').classList.toggle('active', method === 'COD');
  document.getElementById('upi-payment-box').style.display = method === 'UPI' ? 'block' : 'none';

  const btn = document.getElementById('btn-submit-order');
  btn.innerHTML = method === 'UPI' 
    ? `<i class="fa-solid fa-circle-check"></i> Submit Paid UPI Order`
    : `<i class="fa-solid fa-truck-fast"></i> Confirm Cash on Delivery Order`;
}

function setupCheckoutSummary() {
  ADMIN_UPI_ID = localStorage.getItem('bluecart_admin_upi') || "bluecart@upi";
  const displayEl = document.getElementById('display-admin-upi');
  if (displayEl) displayEl.innerText = ADMIN_UPI_ID;

  const totalSelling = state.cart.reduce((s, i) => s + (i.selling_price * i.quantity), 0);
  const totalProfit = state.cart.reduce((s, i) => s + (i.profit * i.quantity), 0);

  document.getElementById('co-summary-total').innerText = `₹${totalSelling}`;
  
  if (state.isCustomerMode) {
    document.getElementById('co-profit-row').style.display = 'none';
  } else {
    document.getElementById('co-profit-row').style.display = 'flex';
    document.getElementById('co-summary-profit').innerText = `₹${totalProfit}`;
  }

  // Generate NPCI UPI Intent URI for Google Pay, PhonePe, Paytm
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=BlueCartShopping&am=${totalSelling}&cu=INR&tn=OrderPayment`;
  document.getElementById('btn-upi-app-link').href = upiIntentUri;

  // Generate Dynamic QR Code Image for Desktop / Tablets
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntentUri)}`;
  document.getElementById('upi-qr-image').src = qrUrl;

  selectPaymentMethod('UPI');
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  if (state.cart.length === 0) return;

  const totalSelling = state.cart.reduce((s, i) => s + (i.selling_price * i.quantity), 0);
  const totalProfit = state.cart.reduce((s, i) => s + (i.profit * i.quantity), 0);
  const utrRef = document.getElementById('order-upi-ref').value.trim();

  // Validate UTR if UPI Payment Selected
  if (state.selectedPaymentMethod === 'UPI' && !utrRef) {
    alert("Please enter the 12-digit UPI UTR / Reference ID after completing payment.");
    document.getElementById('order-upi-ref').focus();
    return;
  }

  const newOrder = {
    id: 'BC-' + Math.floor(100000 + Math.random() * 900000),
    customer_name: document.getElementById('order-cust-name').value,
    customer_mobile: document.getElementById('order-cust-phone').value,
    shipping_address: document.getElementById('order-cust-address').value,
    city: document.getElementById('order-cust-city').value,
    pincode: document.getElementById('order-cust-pincode').value,
    total_amount: totalSelling,
    reseller_profit: totalProfit,
    order_status: 'Pending',
    payment_method: state.selectedPaymentMethod,
    payment_status: state.selectedPaymentMethod === 'UPI' ? 'Submitted (Pending Verification)' : 'Pending',
    upi_ref_id: utrRef,
    reseller_id: state.referralCode,
    created_at: new Date().toISOString()
  };

  // Sync to Supabase orders table
  if (client) {
    try {
      await client.from('orders').insert(newOrder);
    } catch (err) {
      console.warn("Supabase insert error (saving locally):", err);
    }
  }

  state.orders.unshift(newOrder);
  localStorage.setItem('bluecart_orders', JSON.stringify(state.orders));

  // Clear cart
  state.cart = [];
  localStorage.setItem('bluecart_cart', JSON.stringify([]));
  updateCartBadges();

  if (state.isCustomerMode) {
    alert(`🎉 Thank you, ${newOrder.customer_name}! Your order for ₹${totalSelling} has been placed. Payment verification will be completed shortly.`);
    navigateTo('home');
  } else {
    showToast('Order Placed! Margin recorded in dashboard.', 'success');
    navigateTo('reseller-dashboard');
  }
}

// 9. RESELLER DASHBOARD
function renderResellerDashboard() {
  const orders = state.orders;
  const delivered = orders.filter(o => o.order_status === 'Delivered').reduce((s, o) => s + Number(o.reseller_profit), 0);
  const pending = orders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').reduce((s, o) => s + Number(o.reseller_profit), 0);

  document.getElementById('stat-total-orders').innerText = orders.length;
  document.getElementById('stat-ready-profit').innerText = `₹${delivered}`;
  document.getElementById('stat-transit-profit').innerText = `₹${pending}`;

  const container = document.getElementById('reseller-orders-list');
  if (orders.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">No shipments yet. Share your WhatsApp links!</p>`;
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="card" style="padding:14px;">
      <div style="display:flex; justify-content:space-between;">
        <strong>Order #${o.id}</strong>
        <span class="badge-tag">${o.order_status}</span>
      </div>
      <div style="font-size:0.85rem; margin:6px 0;">Customer: ${o.customer_name} (${o.city})</div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; border-top:1px solid #f1f5f9; padding-top:6px;">
        <span>Collect: ₹${o.total_amount} (${o.payment_method})</span>
        <strong style="color:var(--success);">Your Margin: ₹${o.reseller_profit}</strong>
      </div>
    </div>
  `).join('');
}

// 10. RESELLER WALLET & WITHDRAWALS
function renderWalletPage() {
  const readyProfit = state.orders.filter(o => o.order_status === 'Delivered').reduce((s, o) => s + Number(o.reseller_profit), 0);
  document.getElementById('wallet-balance-num').innerText = `₹${readyProfit}.00`;
}

function handlePayoutRequest(e) {
  e.preventDefault();
  const amt = document.getElementById('payout-amount-input').value;
  const upi = document.getElementById('payout-upi-input').value;
  showToast(`Withdrawal of ₹${amt} requested to ${upi}!`, 'success');
  document.getElementById('payout-amount-input').value = '';
  document.getElementById('payout-upi-input').value = '';
}

// 11. AUTHENTICATION (RESELLER LOGIN)
function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  state.user = { email };
  document.getElementById('header-auth-btn').innerHTML = `<button class="btn btn-sm btn-outline" onclick="navigateTo('reseller-dashboard')"><i class="fa-solid fa-user"></i> Portal</button>`;
  showToast(`Logged in successfully!`, 'success');
  navigateTo('reseller-dashboard');
}

// 12. INITIALIZATION ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();

  // Read URL query parameters for deep-linking
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page') || 'home';
  const id = urlParams.get('id');
  const sp = urlParams.get('sp');
  const ref = urlParams.get('ref');

  navigateTo(page, { id, sp, ref }, false);
});