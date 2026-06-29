import { db, auth, storage, googleProvider, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc, ref, uploadBytes, getDownloadURL, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

// ===== STATE =====
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = null;
let userPoints = 0;
let userData = null;

// ===== DOM REFS =====
const $ = (id) => document.getElementById(id);
const productsGrid = $('productsGrid');
const categoriesGrid = $('categoriesGrid');
const cartSidebar = $('cartSidebar');
const cartOverlay = $('cartOverlay');
const cartItems = $('cartItems');
const cartCount = $('cartCount');
const cartTotal = $('cartTotal');
const cartPointsEarn = $('cartPointsEarn');
const checkoutBtn = $('checkoutBtn');
const whatsappOrderBtn = $('whatsappOrderBtn');
const authModal = $('authModal');
const userMenu = $('userMenu');
const searchInput = $('searchInput');
const categoryFilter = $('categoryFilter');
const sortFilter = $('sortFilter');
const toast = $('toast');
const userNameDisplay = $('userNameDisplay');
const userPointsDisplay = $('userPointsDisplay');
const logoutBtn = $('logoutBtn');
const adminPanelLink = $('adminPanelLink');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
    loadSettings();
    setupListeners();
});

function setupListeners() {
    // Mobile nav toggle
    $('navToggle').addEventListener('click', () => {
        $('navLinks').classList.toggle('active');
    });

    // Cart
    $('cartBtn').addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });

    $('closeCart').addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Auth
    $('userBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            userMenu.classList.toggle('active');
        } else {
            openAuthModal();
        }
    });

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.querySelector(`#${tab.dataset.tab}Form`).classList.add('active');
        });
    });

    // Auth forms
    $('loginForm').addEventListener('submit', handleLogin);
    $('registerForm').addEventListener('submit', handleRegister);
    $('googleSignInBtn').addEventListener('click', handleGoogleSignIn);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Filters
    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
    sortFilter.addEventListener('change', filterProducts);

    // Checkout
    checkoutBtn.addEventListener('click', placeOrder);
    whatsappOrderBtn.addEventListener('click', orderViaWhatsApp);

    // User menu links
    logoutBtn.addEventListener('click', handleLogout);
    $('ordersLink').addEventListener('click', (e) => { e.preventDefault(); userMenu.classList.remove('active'); showOrders(); });
    $('pointsHistoryLink').addEventListener('click', (e) => { e.preventDefault(); userMenu.classList.remove('active'); showPointsHistory(); });
    adminPanelLink.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'admin/'; });

    // Click outside user menu
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userBtn') && !e.target.closest('.user-menu')) {
            userMenu.classList.remove('active');
        }
    });

    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            await loadUserData(user.uid);
            userNameDisplay.textContent = userData?.name || user.email;
            userPointsDisplay.textContent = `${userPoints} نقطة`;
            logoutBtn.style.display = 'block';
            $('userBtn').querySelector('i').className = 'fas fa-user-check';
            if (userData?.role === 'admin') {
                adminPanelLink.style.display = 'block';
            }
        } else {
            currentUser = null;
            userData = null;
            userPoints = 0;
            userNameDisplay.textContent = 'زائر';
            userPointsDisplay.textContent = '0 نقطة';
            logoutBtn.style.display = 'none';
            adminPanelLink.style.display = 'none';
            $('userBtn').querySelector('i').className = 'fas fa-user';
        }
        updateCart();
    });
}

// ===== SETTINGS =====
async function loadSettings() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) {
            const data = snap.data();
            if (data.whatsapp) {
                $('whatsappLink').href = `https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}`;
                $('whatsappLink').textContent = data.whatsapp;
            }
            if (data.phone) {
                $('phoneLink').href = `tel:${data.phone}`;
                $('phoneLink').textContent = data.phone;
            }
            if (data.location) $('locationDisplay').textContent = data.location;
        }
    } catch (e) {
        console.error('Settings load error:', e);
    }
}

// ===== PRODUCTS =====
async function loadProducts() {
    try {
        const q = query(collection(db, 'products'), where('active', '!=', false), orderBy('active', 'desc'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        products = [];
        snap.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        filterProducts();
    } catch (e) {
        console.error('Products load error:', e);
        // Fallback: load without composite query
        try {
            const snap = await getDocs(collection(db, 'products'));
            products = [];
            snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
            products = products.filter(p => p.active !== false);
            filterProducts();
        } catch (e2) {
            console.error('Fallback products load error:', e2);
            products = [];
            filterProducts();
        }
    }
}

async function loadCategories() {
    try {
        const snap = await getDocs(collection(db, 'categories'));
        categories = [];
        const filterEl = categoryFilter;
        snap.forEach(doc => {
            const cat = { id: doc.id, ...doc.data() };
            categories.push(cat);
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = cat.name;
            filterEl.appendChild(opt);
        });
        renderCategories();
    } catch (e) {
        console.error('Categories load error:', e);
    }
}

function renderCategories() {
    if (!categories.length) {
        categoriesGrid.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد أقسام حالياً</p></div>';
        return;
    }
    categoriesGrid.innerHTML = categories.map(cat => `
        <div class="category-card" data-cat-id="${cat.id}">
            <img src="${cat.image || 'https://via.placeholder.com/80/1a73e8/ffffff?text=' + cat.name[0]}" alt="${cat.name}" onerror="this.src='https://via.placeholder.com/80/1a73e8/ffffff?text=${cat.name[0]}'">
            <h3>${cat.name}</h3>
        </div>
    `).join('');

    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            categoryFilter.value = card.dataset.catId;
            filterProducts();
            document.querySelector('#products').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function filterProducts() {
    const search = searchInput.value.toLowerCase().trim();
    const catId = categoryFilter.value;
    const sort = sortFilter.value;

    let filtered = [...products];

    if (search) {
        filtered = filtered.filter(p =>
            p.name?.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search)
        );
    }

    if (catId !== 'all') {
        filtered = filtered.filter(p => p.category === catId || p.categoryId === catId);
    }

    switch (sort) {
        case 'price-asc': filtered.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
        case 'price-desc': filtered.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
        case 'name-asc': filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
        case 'name-desc': filtered.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
    }

    renderProducts(filtered);
}

function renderProducts(items) {
    if (!items.length) {
        productsGrid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>لا توجد منتجات</p></div>';
        return;
    }

    productsGrid.innerHTML = items.map(p => {
        const cat = categories.find(c => c.id === p.category || c.id === p.categoryId);
        const inStock = p.stockStatus !== 'out-of-stock';
        const colors = p.colors || [];
        const price = p.price || 0;

        return `
        <div class="product-card" data-id="${p.id}">
            <img class="product-image" src="${p.image || 'https://via.placeholder.com/300/1a73e8/ffffff?text=' + encodeURIComponent(p.name || 'Product')}" alt="${p.name || ''}" onerror="this.src='https://via.placeholder.com/300/1a73e8/ffffff?text=${encodeURIComponent(p.name || 'Product')}'">
            <span class="product-badge ${inStock ? 'in-stock' : 'out-of-stock'}">${inStock ? 'متوفر' : 'غير متوفر'}</span>
            ${colors.length ? `<div class="product-colors">${colors.map(c => `<span class="color-dot" style="background:${c}" title="${c}"></span>`).join('')}</div>` : ''}
            <div class="product-info">
                <div class="product-category">${cat ? cat.name : ''}</div>
                <div class="product-name">${p.name || ''}</div>
                <div class="product-price">${price.toFixed(2)} AED <small style="font-weight:400;font-size:0.75rem;color:var(--gray);">/${p.unit ? {kg:'كجم',g:'جم',piece:'حبة',liter:'لتر',box:'علبة',pack:'باكيت',bottle:'قارورة',bag:'كيس'}[p.unit] || p.unit : ''}</small></div>
                <div class="product-actions">
                    <button class="add-to-cart" data-id="${p.id}" ${!inStock ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> ${inStock ? 'أضف للسلة' : 'نفد من المخزون'}
                    </button>
                    <button class="buy-now" data-id="${p.id}" ${!inStock ? 'disabled' : ''}>
                        <i class="fas fa-bolt"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => addToCart(btn.dataset.id));
    });

    document.querySelectorAll('.buy-now').forEach(btn => {
        btn.addEventListener('click', () => buyNow(btn.dataset.id));
    });
}

// ===== CART =====
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            unit: product.unit,
            quantity: 1
        });
    }

    saveCart();
    updateCart();
    showToast('تمت إضافة المنتج إلى السلة');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCart();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        saveCart();
        updateCart();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCart() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = count;

    const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    cartTotal.textContent = `${total.toFixed(2)} AED`;

    const pointsEarned = Math.floor(total / 10);
    cartPointsEarn.textContent = `${pointsEarned} نقطة`;

    checkoutBtn.disabled = cart.length === 0 || !currentUser;

    renderCartItems();
}

function renderCartItems() {
    if (!cart.length) {
        cartItems.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>السلة فارغة</p></div>';
        return;
    }

    const unitMap = {kg:'كجم',g:'جم',piece:'حبة',liter:'لتر',box:'علبة',pack:'باكيت',bottle:'قارورة',bag:'كيس'};
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image || 'https://via.placeholder.com/70/1a73e8/ffffff?text=' + encodeURIComponent(item.name || '')}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/70'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${(item.price || 0).toFixed(2)} AED ${item.unit ? '/ ' + (unitMap[item.unit] || item.unit) : ''}</div>
                <div class="cart-item-quantity">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

// Expose cart functions globally for inline onclick
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateCart();
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function buyNow(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    cart = [{ id: product.id, name: product.name, price: product.price, image: product.image, unit: product.unit, quantity: 1 }];
    saveCart();
    openCart();
}

// ===== ORDERS =====
async function placeOrder() {
    if (!currentUser) {
        showToast('يرجى تسجيل الدخول أولاً');
        openAuthModal();
        return;
    }

    if (!cart.length) return;

    try {
        const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

        // Use points if available (100 points = 1 AED)
        let pointsUsed = 0;
        let discountAED = 0;
        if (userPoints >= 100) {
            const maxDiscount = Math.floor(userPoints / 100);
            discountAED = Math.min(maxDiscount, Math.floor(total));
            pointsUsed = discountAED * 100;
        }

        const finalTotal = Math.max(0, total - discountAED);
        const userRef = doc(db, 'users', currentUser.uid);

        await addDoc(collection(db, 'orders'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: userData?.name || '',
            userPhone: userData?.phone || '',
            items: cart,
            total: total,
            pointsUsed: pointsUsed,
            discountAED: discountAED,
            finalTotal: finalTotal,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        // Deduct used points first
        let currentPoints = userPoints;
        if (pointsUsed > 0) {
            currentPoints -= pointsUsed;
            await updateDoc(userRef, { points: currentPoints });
            await addDoc(collection(db, 'pointsHistory'), {
                userId: currentUser.uid,
                type: 'used',
                amount: pointsUsed,
                reason: `خصم ${discountAED} AED من الطلب`,
                createdAt: new Date().toISOString()
            });
        }

        // Add points for purchase (10 points per 1 AED spent on final total)
        const earnedPoints = Math.floor(finalTotal / 10);
        if (earnedPoints > 0) {
            currentPoints += earnedPoints;
            await updateDoc(userRef, { points: currentPoints });

            await addDoc(collection(db, 'pointsHistory'), {
                userId: currentUser.uid,
                type: 'earned',
                amount: earnedPoints,
                reason: `شراء بقيمة ${finalTotal.toFixed(2)} AED`,
                createdAt: new Date().toISOString()
            });
        }

        await loadUserData(currentUser.uid);
        cart = [];
        saveCart();
        updateCart();
        closeCart();
        showToast(`تم إتمام الطلب بنجاح!${discountAED > 0 ? ` خصم ${discountAED} AED باستخدام النقاط.` : ''} تم ربح ${earnedPoints} نقطة`);
    } catch (e) {
        console.error('Order error:', e);
        showToast('حدث خطأ أثناء إتمام الطلب');
    }
}

async function orderViaWhatsApp() {
    if (!cart.length) return;

    try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        let whatsapp = '966553260525';
        if (snap.exists() && snap.data().whatsapp) {
            whatsapp = snap.data().whatsapp.replace(/[^0-9]/g, '');
            if (!whatsapp.startsWith('966')) whatsapp = '966' + whatsapp.replace(/^0/, '');
        }

        const unitMapW = {kg:'كجم',g:'جم',piece:'حبة',liter:'لتر',box:'علبة',pack:'باكيت',bottle:'قارورة',bag:'كيس'};
        let message = '*طلب جديد من AnyThing Souqe*\n\n';
        cart.forEach((item, i) => {
            const u = item.unit ? unitMapW[item.unit] || item.unit : '';
            message += `${i + 1}. ${item.name}${u ? ` (${u})` : ''} × ${item.quantity} = ${((item.price || 0) * item.quantity).toFixed(2)} AED\n`;
        });
        const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
        message += `\n*المجموع: ${total.toFixed(2)} AED*`;

        if (currentUser) {
            message += `\n\nالعميل: ${userData?.name || currentUser.email}`;
            message += `\nالهاتف: ${userData?.phone || ''}`;
            message += `\nالنقاط: ${userPoints} نقطة`;
        }

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${whatsapp}?text=${encoded}`, '_blank');
    } catch (e) {
        console.error('WhatsApp error:', e);
        showToast('حدث خطأ');
    }
}

// ===== AUTH =====
function openAuthModal() {
    authModal.classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('[type="email"]').value;
    const password = form.querySelector('[type="password"]').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        form.querySelectorAll('input').forEach(i => i.value = '');
        authModal.classList.remove('active');
        showToast('تم تسجيل الدخول بنجاح');
    } catch (e) {
        showToast(e.code === 'auth/user-not-found' ? 'المستخدم غير موجود' :
                  e.code === 'auth/wrong-password' ? 'كلمة المرور خطأ' :
                  'خطأ في تسجيل الدخول');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('[type="text"]').value;
    const email = form.querySelector('[type="email"]').value;
    const phone = form.querySelector('[type="tel"]').value;
    const password = form.querySelectorAll('[type="password"]')[0].value;
    const confirm = form.querySelectorAll('[type="password"]')[1].value;

    if (password !== confirm) {
        showToast('كلمة المرور غير متطابقة');
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Create user document
        await setDoc(doc(db, 'users', cred.user.uid), {
            name,
            email,
            phone,
            points: 0,
            role: 'customer',
            createdAt: new Date().toISOString()
        });

        form.querySelectorAll('input').forEach(i => i.value = '');
        authModal.classList.remove('active');
        showToast('تم إنشاء الحساب بنجاح');
    } catch (e) {
        showToast(e.code === 'auth/email-already-in-use' ? 'البريد الإلكتروني مستخدم مسبقاً' :
                  e.code === 'auth/weak-password' ? 'كلمة المرور ضعيفة جداً' :
                  'خطأ في إنشاء الحساب');
    }
}

async function handleGoogleSignIn() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user document exists, if not create one
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName || 'مستخدم Google',
                email: user.email,
                phone: user.phoneNumber || '',
                points: 0,
                role: 'customer',
                createdAt: new Date().toISOString()
            });
        }

        authModal.classList.remove('active');
        showToast('تم تسجيل الدخول بـ Google بنجاح');
    } catch (e) {
        if (e.code !== 'auth/popup-closed-by-user') {
            showToast('خطأ في تسجيل الدخول بـ Google');
        }
    }
}

async function handleLogout(e) {
    e.preventDefault();
    await signOut(auth);
    userMenu.classList.remove('active');
    showToast('تم تسجيل الخروج');
}

async function loadUserData(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
            userData = snap.data();
            userPoints = userData.points || 0;
        }
    } catch (e) {
        console.error('User data load error:', e);
    }
}

// ===== ORDERS MODAL =====
async function showOrders() {
    if (!currentUser) return;
    const modal = $('ordersModal');
    const list = $('ordersList');

    modal.classList.add('active');
    list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';

    try {
        const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const orders = [];
        snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));

        if (!orders.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-box"></i><p>لا توجد طلبات</p></div>';
            return;
        }

        list.innerHTML = orders.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <span>طلب رقم: ${o.id.slice(-6)}</span>
                    <span class="order-status ${o.status}">${o.status === 'pending' ? 'قيد الانتظار' : o.status === 'processing' ? 'قيد التجهيز' : o.status === 'completed' ? 'مكتمل' : o.status === 'cancelled' ? 'ملغي' : o.status}</span>
                </div>
                <div class="order-items">
                    ${o.items.map(item => `${item.name} × ${item.quantity}`).join('، ')}
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:600;">
                    <span>${o.finalTotal ? o.finalTotal.toFixed(2) : o.total.toFixed(2)} AED</span>
                    <span style="color:var(--gray);font-size:0.85rem;">${new Date(o.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Orders load error:', e);
        list.innerHTML = '<div class="empty-state"><p>خطأ في تحميل الطلبات</p></div>';
    }
}

// ===== POINTS HISTORY =====
async function showPointsHistory() {
    if (!currentUser) return;
    const modal = $('pointsModal');
    const list = $('pointsList');

    modal.classList.add('active');
    list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';

    try {
        const q = query(collection(db, 'pointsHistory'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const entries = [];
        snap.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));

        if (!entries.length) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>لا توجد نقاط حتى الآن. قم بالشراء لتربح نقاطاً!</p></div>';
            return;
        }

        list.innerHTML = `<div style="text-align:center;padding:12px;background:var(--secondary);color:white;border-radius:10px;margin-bottom:15px;">
            <strong>${userPoints} نقطة</strong> متاحة (${(userPoints / 100).toFixed(0)} AED)
        </div>`;

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'points-entry';
            div.innerHTML = `
                <div>
                    <div>${entry.reason || ''}</div>
                    <small style="color:var(--gray);">${new Date(entry.createdAt).toLocaleDateString('ar-SA')}</small>
                </div>
                <span class="${entry.type === 'earned' ? 'points-earned' : 'points-used'}">
                    ${entry.type === 'earned' ? '+' : '-'}${entry.amount} نقطة
                </span>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Points load error:', e);
        list.innerHTML = '<div class="empty-state"><p>خطأ في تحميل النقاط</p></div>';
    }
}

// ===== TOAST =====
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
