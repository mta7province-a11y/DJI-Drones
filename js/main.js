/**
 * AirL - Main Interactive Controller
 * Handles Bilingual switching, Anatomy Hotspots, Shop bundles, Cart, and Mobile Drawer
 */

document.addEventListener('DOMContentLoaded', () => {
  // Current State
  let currentLang = localStorage.getItem('airl_lang') || 'ua';
  let currency = localStorage.getItem('airl_currency') || 'USD';
  let isMonthly = false;

  // Cart State
  let cart = JSON.parse(localStorage.getItem('airl_cart') || '[]');

  /* ==========================================================================
     BILINGUAL (i18n) ENGINE
     ========================================================================== */
  function applyLanguage(lang) {
    if (!window.translations || !window.translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('airl_lang', lang);
    document.documentElement.lang = lang;

    const dict = window.translations[lang];

    // Update document title if marked with data-i18n
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const tKey = titleEl.getAttribute('data-i18n');
      if (dict[tKey]) {
        document.title = dict[tKey];
      }
    }

    // Update text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.tagName.toLowerCase() === 'title') return;
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        // If element contains a child arrow span (like mobile nav drawer)
        const arrowSpan = el.querySelector('span');
        if (arrowSpan && (arrowSpan.textContent.includes('→') || arrowSpan.innerHTML.includes('&rarr;'))) {
          const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
          if (textNode) {
            textNode.nodeValue = dict[key] + ' ';
          } else {
            el.innerHTML = dict[key] + ' ' + arrowSpan.outerHTML;
          }
        } else if (dict[key].includes('<')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // Sync button active classes
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Update dynamic bundle prices for monthly/outright
    updateBundlePrices();
    renderCart();
  }

  // Language switch event listeners
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = btn.getAttribute('data-lang');
      applyLanguage(lang);
    });
  });

  // Cross-tab synchronization via storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'airl_lang' && e.newValue && e.newValue !== currentLang) {
      applyLanguage(e.newValue);
    }
  });

  /* ==========================================================================
     MOBILE NAVIGATION DRAWER
     ========================================================================== */
  const navToggleBtn = document.querySelector('.nav-toggle-btn');
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  const mobileCloseBtn = document.querySelector('.mobile-close-btn');

  if (navToggleBtn && mobileDrawer) {
    navToggleBtn.addEventListener('click', () => {
      mobileDrawer.classList.add('open');
    });
  }

  if (mobileCloseBtn && mobileDrawer) {
    mobileCloseBtn.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
    });
  }

  // Close mobile drawer on link click
  document.querySelectorAll('.mobile-nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileDrawer) mobileDrawer.classList.remove('open');
    });
  });

  /* ==========================================================================
     ANATOMY SECTION INTERACTIVE HOTSPOTS
     ========================================================================== */
  const hotspotPins = document.querySelectorAll('.hotspot-pin');
  const calloutCards = document.querySelectorAll('.anatomy-callout');

  hotspotPins.forEach(pin => {
    pin.addEventListener('click', () => {
      const targetId = pin.getAttribute('data-target');

      // Toggle active states
      hotspotPins.forEach(p => p.classList.remove('active'));
      calloutCards.forEach(c => c.classList.remove('active'));

      pin.classList.add('active');
      const targetCard = document.getElementById(targetId);
      if (targetCard) {
        targetCard.classList.add('active');
      }
    });
  });

  // Callout cards click also activates corresponding pin
  calloutCards.forEach(card => {
    card.addEventListener('click', () => {
      const cardId = card.id;
      hotspotPins.forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-target') === cardId);
      });
      calloutCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  /* ==========================================================================
     SHOP: BUNDLES, FINISH PICKER & PAYMENT TOGGLE
     ========================================================================== */
  const tabOutright = document.getElementById('tabOutright');
  const tabMonthly = document.getElementById('tabMonthly');

  function updateBundlePrices() {
    const isEn = currentLang === 'en';
    const monthSuffix = isEn ? '/mo for 12 mo' : '/міс на 12 міс';

    const p1 = document.getElementById('price-standard');
    const p2 = document.getElementById('price-flymore');
    const p3 = document.getElementById('price-cinepro');

    if (isMonthly) {
      if (p1) p1.textContent = `$92 ${monthSuffix}`;
      if (p2) p2.textContent = `$137 ${monthSuffix}`;
      if (p3) p3.textContent = `$183 ${monthSuffix}`;
    } else {
      if (p1) p1.textContent = `$1,099`;
      if (p2) p2.textContent = `$1,649`;
      if (p3) p3.textContent = `$2,199`;
    }
  }

  if (tabOutright && tabMonthly) {
    tabOutright.addEventListener('click', () => {
      isMonthly = false;
      tabOutright.classList.add('active');
      tabMonthly.classList.remove('active');
      updateBundlePrices();
    });

    tabMonthly.addEventListener('click', () => {
      isMonthly = true;
      tabMonthly.classList.add('active');
      tabOutright.classList.remove('active');
      updateBundlePrices();
    });
  }

  // Finish Color Selector
  document.querySelectorAll('.bundle-card').forEach(card => {
    const dots = card.querySelectorAll('.finish-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });
  });

  /* ==========================================================================
     CART DRAWER & LOCAL STORAGE
     ========================================================================== */
  const cartBtn = document.querySelector('.cart-btn');
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartCloseBtn = document.querySelector('.cart-close-btn');
  const cartCountEl = document.querySelector('.cart-count');
  const cartItemsList = document.querySelector('.cart-items-list');
  const cartTotalEl = document.querySelector('.cart-total-num');
  const btnCheckout = document.querySelector('.btn-checkout');

  function saveCart() {
    localStorage.setItem('airl_cart', JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    if (cartCountEl) {
      cartCountEl.textContent = count;
      cartCountEl.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  function renderCart() {
    if (!cartItemsList) return;
    updateCartBadge();

    if (cart.length === 0) {
      const emptyText = currentLang === 'ua' 
        ? 'Кошик порожній. Додайте дрон або спорядження для подорожі.' 
        : 'Your cart is empty. Add an expedition kit or travel gear.';
      cartItemsList.innerHTML = `<p style="text-align:center; padding: 40px 10px; color: var(--c-glacial-ice);">${emptyText}</p>`;
      if (cartTotalEl) cartTotalEl.textContent = '$0';
      return;
    }

    let total = 0;
    cartItemsList.innerHTML = '';

    cart.forEach((item, index) => {
      total += item.price * item.qty;
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${item.img}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toLocaleString()} x ${item.qty}</div>
        </div>
        <button class="cart-remove-btn" data-index="${index}" title="Remove">&times;</button>
      `;
      cartItemsList.appendChild(itemEl);
    });

    if (cartTotalEl) {
      cartTotalEl.textContent = `$${total.toLocaleString()}`;
    }

    // Attach remove listeners
    document.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        cart.splice(idx, 1);
        saveCart();
        renderCart();
      });
    });
  }

  window.addToCart = function(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    saveCart();
    renderCart();
    if (cartDrawer) cartDrawer.classList.add('open');
    showToast(currentLang === 'ua' ? 'Товар додано до кошика!' : 'Item added to cart!');
  };

  if (cartBtn && cartDrawer) {
    cartBtn.addEventListener('click', () => {
      renderCart();
      cartDrawer.classList.add('open');
    });
  }

  if (cartCloseBtn && cartDrawer) {
    cartCloseBtn.addEventListener('click', () => {
      cartDrawer.classList.remove('open');
    });
  }

  // Backend API Communication Helper
  const API_URL = (window.location.protocol === 'http:' || window.location.protocol === 'https:') 
    ? '' 
    : 'http://localhost:3000';

  async function callBackendApi(endpoint, data) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.warn('[AirL Backend] API Request failed:', e.message);
      return null;
    }
  }

  // Database Live Connection Check & Indicator
  async function checkBackendConnection() {
    try {
      const res = await fetch(`${API_URL}/api/status`, { mode: 'cors' });
      if (res.ok) {
        updateDbIndicator(true);
      } else {
        updateDbIndicator(false);
      }
    } catch (e) {
      updateDbIndicator(false);
    }
  }

  function updateDbIndicator(isOnline) {
    const cartFooter = document.querySelector('.cart-footer');
    if (!cartFooter) return;
    let badge = document.getElementById('cartDbBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'cartDbBadge';
      badge.style.margin = '0 0 14px';
      badge.style.textAlign = 'center';
      cartFooter.insertBefore(badge, cartFooter.firstChild);
    }
    if (isOnline) {
      badge.innerHTML = `<a href="admin.html" class="db-indicator online" title="Переглянути базу даних"><span class="dot"></span> <span>БАЗА ДАНИХ: ОНЛАЙН (data/orders.json)</span></a>`;
    } else {
      badge.innerHTML = `<span class="db-indicator" title="Запустіть start-server.bat для синхронізації"><span class="dot"></span> <span>БД: ОФЛАЙН (Запустіть start-server.bat)</span></span>`;
    }
  }

  checkBackendConnection();
  setInterval(checkBackendConnection, 6000);

  if (btnCheckout) {
    btnCheckout.addEventListener('click', async () => {
      if (cart.length === 0) {
        showToast(currentLang === 'ua' ? 'Додайте товари до кошика!' : 'Add items first!');
        return;
      }

      const totalSum = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
      btnCheckout.disabled = true;
      btnCheckout.textContent = currentLang === 'ua' ? 'Збереження в БД...' : 'Saving to Database...';

      const orderPayload = {
        items: cart,
        total: totalSum,
        currency: 'USD',
        customer: {
          name: 'Travel Creator',
          email: 'traveler@airl.world',
          country: currentLang === 'ua' ? 'Україна' : 'Global'
        }
      };

      const apiResult = await callBackendApi('/api/checkout', orderPayload);

      btnCheckout.disabled = false;
      const checkoutTextKey = window.translations && window.translations[currentLang] ? window.translations[currentLang].cart_checkout_btn : 'Оформити замовлення';
      btnCheckout.textContent = checkoutTextKey;

      if (apiResult && apiResult.success) {
        const orderId = apiResult.orderId;
        const msg = currentLang === 'ua'
          ? `Успішно! Замовлення ${orderId} на суму $${totalSum.toLocaleString()} збережено в базі даних (data/orders.json)!\n\nВи можете відкрити admin.html і перевірити його.`
          : `Success! Order ${orderId} ($${totalSum.toLocaleString()}) has been saved to database (data/orders.json)!\n\nYou can view it in admin.html`;
        alert(msg);
        cart = [];
        saveCart();
        renderCart();
        if (cartDrawer) cartDrawer.classList.remove('open');
      } else {
        const fallbackId = `AIRL-ORD-${Date.now().toString(36).toUpperCase()}`;
        const msg = currentLang === 'ua'
          ? `Увага: Бекенд-сервер зараз вимкнено на вашому комп'ютері, тому замовлення не потрапило у файл data/orders.json.\n\nБудь ласка, запустіть файл start-server.bat у вашій папці, щоб база даних працювала!\n\n(Тимчасовий номер: ${fallbackId})`
          : `Notice: The backend server is currently offline, so the order could not be written to data/orders.json.\n\nPlease launch start-server.bat in your project folder to activate the database!\n\n(Local ID: ${fallbackId})`;
        alert(msg);
      }
    });
  }

  // Newsletter Subscribe Backend Integration
  document.querySelectorAll('.newsletter-box').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input || !input.value) return;
      const email = input.value.trim();

      const apiRes = await callBackendApi('/api/subscribe', { email, source: 'footer_newsletter' });
      input.value = '';
      const msg = currentLang === 'ua' 
        ? 'Дякуємо за підписку на AirL Expedition Club!' 
        : 'Welcome to the AirL Expedition Club!';
      showToast(msg);
    });
  });

  /* ==========================================================================
     CURSOR DIFFUSED LIGHT (Brand Neon Lime Glow)
     ========================================================================== */
  let cursorGlow = document.getElementById('cursorGlow');
  if (!cursorGlow) {
    cursorGlow = document.createElement('div');
    cursorGlow.id = 'cursorGlow';
    cursorGlow.className = 'cursor-glow';
    document.body.appendChild(cursorGlow);
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let glowX = mouseX;
  let glowY = mouseY;
  let isMouseMoving = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMouseMoving) {
      isMouseMoving = true;
      cursorGlow.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', () => {
    cursorGlow.style.opacity = '0';
    isMouseMoving = false;
  });

  function renderGlow() {
    glowX += (mouseX - glowX) * 0.12;
    glowY += (mouseY - glowY) * 0.12;
    cursorGlow.style.transform = `translate3d(${glowX - 275}px, ${glowY - 275}px, 0)`;
    requestAnimationFrame(renderGlow);
  }
  renderGlow();

  /* ==========================================================================
     ORDER / ADD TO CART BUTTON HANDLERS
     ========================================================================== */
  document.querySelectorAll('[data-buy-kit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kitType = btn.getAttribute('data-buy-kit');
      if (kitType === 'standard') {
        addToCart({ id: 'airl-7-standard', name: 'AirL—7 Standard Kit', price: 1099, img: 'assets/images/hero-drone.jpg' });
      } else if (kitType === 'flymore') {
        addToCart({ id: 'airl-7-flymore', name: 'AirL—7 Fly More Bundle', price: 1649, img: 'assets/images/flymore-kit.jpg' });
      } else if (kitType === 'cinepro') {
        addToCart({ id: 'airl-7-cinepro', name: 'AirL—7 Cine Pro Cinema Kit', price: 2199, img: 'assets/images/smart-controller.jpg' });
      }
    });
  });

  // Magnetic button on Hero
  const heroOrderBtn = document.querySelector('.hero-magnetic-btn');
  if (heroOrderBtn) {
    heroOrderBtn.addEventListener('click', () => {
      addToCart({ id: 'airl-7-flymore', name: 'AirL—7 Fly More Bundle', price: 1649, img: 'assets/images/flymore-kit.jpg' });
    });
  }

  // Pre-order buttons
  document.querySelectorAll('.btn-preorder-nav, [data-open-preorder]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      addToCart({ id: 'airl-7-flymore', name: 'AirL—7 Fly More Bundle', price: 1649, img: 'assets/images/flymore-kit.jpg' });
    });
  });

  /* ==========================================================================
     TOAST NOTIFICATION HELPER
     ========================================================================== */
  let toastTimer;
  function showToast(message) {
    let toast = document.querySelector('.toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
  window.showToast = showToast;

  /* ==========================================================================
     REELS / VIDEO MODAL
     ========================================================================== */
  const reelsModal = document.getElementById('reelsModal');
  const reelsCloseBtn = document.getElementById('reelsCloseBtn');

  document.querySelectorAll('.reel-item-card, [data-open-reel]').forEach(card => {
    card.addEventListener('click', () => {
      if (reelsModal) reelsModal.classList.add('active');
    });
  });

  if (reelsCloseBtn && reelsModal) {
    reelsCloseBtn.addEventListener('click', () => {
      reelsModal.classList.remove('active');
    });
  }

  if (reelsModal) {
    reelsModal.addEventListener('click', (e) => {
      if (e.target === reelsModal) reelsModal.classList.remove('active');
    });
  }

  // Initial render
  applyLanguage(currentLang);
  updateCartBadge();
});
