import { db, auth, storage, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc, ref, uploadBytes, getDownloadURL, signOut, onAuthStateChanged } from '../../js/firebase-config.js';

// ===== STATE =====
let currentUser = null;
let products = [];
let categories = [];
let orders = [];
let users = [];
let pointsHistory = [];

// ===== DOM REFS =====
const $ = (id) => document.getElementById(id);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../index.html';
            return;
        }
        currentUser = user;
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists() || snap.data().role !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
        $('adminName').textContent = snap.data().name || 'Admin';
        initAdmin();
    });
});

function initAdmin() {
    setupNavigation();
    setupProductForm();
    setupCategoryForm();
    setupSettings();
    setupPoints();
    setupLogout();
    loadAllData();
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const page = document.querySelector(`#page-${link.dataset.page}`);
            if (page) page.classList.add('active');
            $('pageTitle').textContent = link.textContent.trim();
            // Close mobile sidebar
            $('sidebar').classList.remove('active');
        });
    });

    $('sidebarToggle').addEventListener('click', () => {
        $('sidebar').classList.toggle('active');
    });
}

async function loadAllData() {
    await Promise.all([
        loadProducts(),
        loadCategories(),
        loadOrders(),
        loadUsers(),
        loadPointsHistory(),
        loadDashboard()
    ]);
}

// ===== DASHBOARD =====
async function loadDashboard() {
    $('statProducts').textContent = products.length;
    $('statCategories').textContent = categories.length;
    $('statOrders').textContent = orders.length;
    $('statUsers').textContent = users.length;

    const totalPoints = users.reduce((sum, u) => sum + (u.points || 0), 0);
    $('statTotalPoints').textContent = totalPoints;

    const revenue = orders.reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);
    $('statRevenue').textContent = `${revenue.toFixed(2)} AED`;

    // Recent orders
    const recent = orders.slice(0, 5);
    const recentDiv = $('recentOrders');
    if (!recent.length) {
        recentDiv.innerHTML = '<div class="empty-state"><p>لا توجد طلبات</p></div>';
    } else {
        recentDiv.innerHTML = recent.map(o => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
                <span>${o.id?.slice(-6) || ''}</span>
                <span>${o.userName || o.userEmail || ''}</span>
                <span class="status-badge status-${o.status}">${o.status === 'pending' ? 'قيد الانتظار' : o.status === 'processing' ? 'قيد التجهيز' : o.status === 'completed' ? 'مكتمل' : o.status === 'cancelled' ? 'ملغي' : o.status}</span>
                <span>${((o.finalTotal || o.total || 0)).toFixed(2)} AED</span>
            </div>
        `).join('');
    }

    // Low stock products
    const lowStock = products.filter(p => p.stockStatus === 'out-of-stock').slice(0, 5);
    const lowDiv = $('lowStockProducts');
    if (!lowStock.length) {
        lowDiv.innerHTML = '<div class="empty-state"><p>جميع المنتجات متوفرة</p></div>';
    } else {
        lowDiv.innerHTML = `<p style="color:var(--danger);margin-bottom:8px;">${lowStock.length} منتجات غير متوفرة</p>` +
            lowStock.map(p => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
                <span>${p.name || ''}</span>
                <span style="color:var(--danger);">غير متوفر</span>
            </div>
        `).join('');
    }
}

// ===== PRODUCTS =====
async function loadProducts() {
    try {
        const snap = await getDocs(collection(db, 'products'));
        products = [];
        snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
        renderProductsTable();
    } catch (e) {
        console.error('Load products error:', e);
    }
}

function renderProductsTable() {
    const tbody = $('productsTableBody');
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>لا توجد منتجات</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const cat = categories.find(c => c.id === p.category || c.id === p.categoryId);
        const colors = p.colors || [];
        return `
        <tr>
            <td><img class="product-img" src="${p.image || 'https://via.placeholder.com/50'}" onerror="this.src='https://via.placeholder.com/50'"></td>
            <td>${p.name || ''}</td>
            <td>${cat ? cat.name : ''}</td>
            <td>${(p.price || 0).toFixed(2)} AED</td>
            <td>${p.unit ? {kg:'كجم',g:'جم',piece:'حبة',liter:'لتر',box:'علبة',pack:'باكيت',bottle:'قارورة',bag:'كيس'}[p.unit] || p.unit : '—'}</td>
            <td>${colors.length ? `<div class="colors-display">${colors.map(c => `<span class="color-dot-sm" style="background:${c}"></span>`).join('')}</div>` : '-'}</td>
            <td><span class="status-badge ${p.stockStatus === 'out-of-stock' ? 'status-cancelled' : 'status-completed'}">${p.stockStatus === 'out-of-stock' ? 'غير متوفر' : 'متوفر'}</span></td>
            <td>
                <div class="actions">
                    <button class="btn-sm btn-edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Expose for inline onclick
window.editProduct = async (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;

    $('productFormTitle').textContent = 'تعديل المنتج';
    $('productId').value = id;
    $('productName').value = p.name || '';
    $('productDescription').value = p.description || '';
    $('productPrice').value = p.price || '';
    $('productCategory').value = p.category || p.categoryId || '';
    $('productUnit').value = p.unit || 'kg';
    $('productStock').value = p.stockStatus || 'in-stock';
    $('productColors').value = (p.colors || []).join(', ');
    $('productImage').value = '';

    if (p.image) {
        $('currentProductImage').innerHTML = `<img src="${p.image}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">`;
    } else {
        $('currentProductImage').innerHTML = '';
    }

    $('productFormModal').classList.add('active');
};

window.deleteProduct = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
        await deleteDoc(doc(db, 'products', id));
        showToast('تم حذف المنتج');
        await loadProducts();
        await loadDashboard();
    } catch (e) {
        console.error('Delete product error:', e);
        showToast('خطأ في حذف المنتج');
    }
};

function setupProductForm() {
    $('addProductBtn').addEventListener('click', () => {
        $('productFormTitle').textContent = 'إضافة منتج جديد';
        $('productForm').reset();
        $('productId').value = '';
        $('currentProductImage').innerHTML = '';
        $('productFormModal').classList.add('active');
    });

    $('closeProductForm').addEventListener('click', () => {
        $('productFormModal').classList.remove('active');
    });

    $('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('productId').value;
        const name = $('productName').value.trim();
        const description = $('productDescription').value.trim();
        const price = parseFloat($('productPrice').value);
        const category = $('productCategory').value;
        const unit = $('productUnit').value;
        const stockStatus = $('productStock').value;
        const colorsStr = $('productColors').value.trim();
        const colors = colorsStr ? colorsStr.split(',').map(c => c.trim()).filter(c => c) : [];
        const file = $('productImage').files[0];

        const data = { name, description, price, category, categoryId: category, unit, stockStatus, colors, active: true, updatedAt: new Date().toISOString() };

        try {
            if (file) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                const snap = await uploadBytes(storageRef, file);
                data.image = await getDownloadURL(snap.ref);
            } else if (!id) {
                data.image = 'https://via.placeholder.com/300/1a73e8/ffffff?text=' + encodeURIComponent(name[0] || 'P');
            }

            if (id) {
                // Don't overwrite image if no new file
                if (!file) delete data.image;
                delete data.createdAt;
                await updateDoc(doc(db, 'products', id), data);
                showToast('تم تحديث المنتج');
            } else {
                data.createdAt = new Date().toISOString();
                await addDoc(collection(db, 'products'), data);
                showToast('تم إضافة المنتج');
            }

            $('productFormModal').classList.remove('active');
            await loadProducts();
            await loadDashboard();
        } catch (e) {
            console.error('Save product error:', e);
            showToast('خطأ في حفظ المنتج');
        }
    });

    // Load categories into select
    $('addProductBtn').addEventListener('click', async () => {
        await loadCategorySelect();
    });
}

// ===== CATEGORIES =====
async function loadCategories() {
    try {
        const snap = await getDocs(collection(db, 'categories'));
        categories = [];
        snap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
        renderCategoriesAdmin();
        loadCategorySelect();
    } catch (e) {
        console.error('Load categories error:', e);
    }
}

function loadCategorySelect() {
    const select = $('productCategory');
    select.innerHTML = '<option value="">اختر القسم</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

function renderCategoriesAdmin() {
    const grid = $('categoriesAdminGrid');
    if (!categories.length) {
        grid.innerHTML = '<div class="empty-state"><p>لا توجد أقسام</p></div>';
        return;
    }

    grid.innerHTML = categories.map(c => `
        <div class="category-admin-card">
            <img src="${c.image || 'https://via.placeholder.com/80/1a73e8/ffffff?text=' + (c.name ? c.name[0] : 'C')}" onerror="this.src='https://via.placeholder.com/80/1a73e8/ffffff?text=${c.name ? c.name[0] : 'C'}'">
            <h4>${c.name || ''}</h4>
            <div class="actions">
                <button class="btn-sm btn-edit" onclick="editCategory('${c.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-sm btn-delete" onclick="deleteCategory('${c.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editCategory = (id) => {
    const c = categories.find(x => x.id === id);
    if (!c) return;
    $('categoryFormTitle').textContent = 'تعديل القسم';
    $('categoryId').value = id;
    $('categoryName').value = c.name || '';
    $('categoryImage').value = '';
    if (c.image) {
        $('currentCategoryImage').innerHTML = `<img src="${c.image}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;">`;
    } else {
        $('currentCategoryImage').innerHTML = '';
    }
    $('categoryFormModal').classList.add('active');
};

window.deleteCategory = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try {
        await deleteDoc(doc(db, 'categories', id));
        showToast('تم حذف القسم');
        await loadCategories();
        await loadDashboard();
    } catch (e) {
        showToast('خطأ في الحذف');
    }
};

function setupCategoryForm() {
    $('addCategoryBtn').addEventListener('click', () => {
        $('categoryFormTitle').textContent = 'إضافة قسم جديد';
        $('categoryForm').reset();
        $('categoryId').value = '';
        $('currentCategoryImage').innerHTML = '';
        $('categoryFormModal').classList.add('active');
    });

    $('closeCategoryForm').addEventListener('click', () => {
        $('categoryFormModal').classList.remove('active');
    });

    $('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('categoryId').value;
        const name = $('categoryName').value.trim();
        const file = $('categoryImage').files[0];

        const data = { name };

        try {
            if (file) {
                const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`);
                const snap = await uploadBytes(storageRef, file);
                data.image = await getDownloadURL(snap.ref);
            } else if (!id) {
                data.image = 'https://via.placeholder.com/80/1a73e8/ffffff?text=' + encodeURIComponent(name[0] || 'C');
            }

            if (id) {
                if (!file) delete data.image;
                await updateDoc(doc(db, 'categories', id), data);
                showToast('تم تحديث القسم');
            } else {
                await addDoc(collection(db, 'categories'), data);
                showToast('تم إضافة القسم');
            }

            $('categoryFormModal').classList.remove('active');
            await loadCategories();
            await loadProducts();
            await loadDashboard();
        } catch (e) {
            console.error('Save category error:', e);
            showToast('خطأ في حفظ القسم');
        }
    });
}

// ===== ORDERS =====
async function loadOrders() {
    try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        orders = [];
        snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        renderOrdersTable();
    } catch (e) {
        console.error('Load orders error:', e);
    }
}

function renderOrdersTable() {
    const tbody = $('ordersTableBody');
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>لا توجد طلبات</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id?.slice(-6) || ''}</td>
            <td>${o.userName || o.userEmail || '—'}<br><small style="color:var(--gray);">${o.userPhone || ''}</small></td>
            <td>${(o.items || []).map(i => `${i.name}×${i.quantity}`).join(', ')}</td>
            <td>${((o.finalTotal || o.total || 0)).toFixed(2)} AED</td>
            <td>
                <select class="order-status-select" data-order-id="${o.id}" style="padding:5px 8px;border-radius:6px;border:1px solid var(--border);">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                    <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>قيد التجهيز</option>
                    <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                </select>
            </td>
            <td style="font-size:0.85rem;color:var(--gray);">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-SA') : ''}</td>
            <td>
                <button class="btn-sm btn-delete" onclick="deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    // Order status change listeners
    document.querySelectorAll('.order-status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const orderId = sel.dataset.orderId;
            const newStatus = sel.value;
            try {
                await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
                showToast('تم تحديث حالة الطلب');
                await loadOrders();
                await loadDashboard();
            } catch (e) {
                showToast('خطأ في التحديث');
            }
        });
    });
}

window.deleteOrder = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
        await deleteDoc(doc(db, 'orders', id));
        showToast('تم حذف الطلب');
        await loadOrders();
        await loadDashboard();
    } catch (e) {
        showToast('خطأ في الحذف');
    }
};

// ===== USERS =====
async function loadUsers() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        users = [];
        snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        renderUsersTable();
        loadUsersSelect();
    } catch (e) {
        console.error('Load users error:', e);
    }
}

function loadUsersSelect() {
    const select = $('pointsUserSelect');
    select.innerHTML = '<option value="">اختر المستخدم</option>';
    users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.name || ''} (${u.email || ''}) - ${u.points || 0} نقطة`;
        select.appendChild(opt);
    });
}

function renderUsersTable() {
    const tbody = $('usersTableBody');
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>لا توجد مستخدمين</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.name || '—'}</strong></td>
            <td>${u.email || '—'}</td>
            <td>${u.phone || '—'}</td>
            <td><strong>${u.points || 0}</strong></td>
            <td><span class="status-badge ${u.role === 'admin' ? 'status-processing' : 'status-completed'}">${u.role === 'admin' ? 'مدير' : 'عميل'}</span></td>
            <td style="font-size:0.85rem;color:var(--gray);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : ''}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="toggleAdminRole('${u.id}')">
                    <i class="fas fa-user-shield"></i>
                </button>
                <button class="btn-sm btn-delete" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.toggleAdminRole = async (id) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    const newRole = u.role === 'admin' ? 'customer' : 'admin';
    if (!confirm(`تحويل دور ${u.name || u.email} إلى ${newRole === 'admin' ? 'مدير' : 'عميل'}؟`)) return;
    try {
        await updateDoc(doc(db, 'users', id), { role: newRole });
        showToast('تم تحديث الدور');
        await loadUsers();
    } catch (e) {
        showToast('خطأ في التحديث');
    }
};

window.deleteUser = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
        await deleteDoc(doc(db, 'users', id));
        showToast('تم حذف المستخدم');
        await loadUsers();
        await loadDashboard();
    } catch (e) {
        showToast('خطأ في الحذف');
    }
};

// ===== POINTS =====
function setupPoints() {
    $('addPointsBtn').addEventListener('click', () => managePoints('add'));
    $('deductPointsBtn').addEventListener('click', () => managePoints('deduct'));
}

async function managePoints(type) {
    const userId = $('pointsUserSelect').value;
    const amount = parseInt($('pointsAmount').value);
    const reason = $('pointsReason').value.trim();

    if (!userId || !amount || amount < 1) {
        showToast('يرجى اختيار المستخدم وإدخال عدد النقاط');
        return;
    }

    if (type === 'deduct') {
        const user = users.find(u => u.id === userId);
        if (!user || (user.points || 0) < amount) {
            showToast('نقاط المستخدم غير كافية للخصم');
            return;
        }
    }

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const currentPoints = userSnap.data()?.points || 0;
        const newPoints = type === 'add' ? currentPoints + amount : currentPoints - amount;

        await updateDoc(userRef, { points: newPoints });
        await addDoc(collection(db, 'pointsHistory'), {
            userId,
            type: type === 'add' ? 'earned' : 'used',
            amount: amount,
            reason: reason || (type === 'add' ? 'إضافة يدوية' : 'خصم يدوي'),
            createdAt: new Date().toISOString()
        });

        showToast(`تم ${type === 'add' ? 'إضافة' : 'خصم'} ${amount} نقطة`);
        $('pointsAmount').value = '';
        $('pointsReason').value = '';
        await loadUsers();
        await loadPointsHistory();
        await loadDashboard();
    } catch (e) {
        console.error('Points management error:', e);
        showToast('خطأ في إدارة النقاط');
    }
}

async function loadPointsHistory() {
    try {
        const q = query(collection(db, 'pointsHistory'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        pointsHistory = [];
        snap.forEach(doc => pointsHistory.push({ id: doc.id, ...doc.data() }));
        renderPointsTable();
    } catch (e) {
        console.error('Load points history error:', e);
    }
}

function renderPointsTable() {
    const tbody = $('pointsTableBody');
    if (!pointsHistory.length) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>لا يوجد سجل نقاط</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = pointsHistory.map(p => {
        const user = users.find(u => u.id === p.userId);
        return `
        <tr>
            <td>${user ? user.name || user.email || '—' : p.userId?.slice(-6) || '—'}</td>
            <td><span class="status-badge ${p.type === 'earned' ? 'status-completed' : 'status-cancelled'}">${p.type === 'earned' ? 'إضافة' : 'خصم'}</span></td>
            <td style="color:${p.type === 'earned' ? 'var(--secondary)' : 'var(--danger)'};font-weight:600;">${p.type === 'earned' ? '+' : '-'}${p.amount}</td>
            <td>${p.reason || '—'}</td>
            <td style="font-size:0.85rem;color:var(--gray);">${p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-SA') : ''}</td>
        </tr>`;
    }).join('');
}

// ===== SETTINGS =====
function setupSettings() {
    loadSettingsForm();
    $('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            whatsapp: $('settingsWhatsapp').value.trim(),
            phone: $('settingsPhone').value.trim(),
            location: $('settingsLocation').value.trim(),
            logo: $('settingsLogo').value.trim(),
            storeName: $('settingsStoreName').value.trim(),
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'settings', 'general'), data, { merge: true });
            showToast('تم حفظ الإعدادات');
        } catch (e) {
            console.error('Save settings error:', e);
            showToast('خطأ في حفظ الإعدادات');
        }
    });
}

async function loadSettingsForm() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) {
            const d = snap.data();
            $('settingsWhatsapp').value = d.whatsapp || '';
            $('settingsPhone').value = d.phone || '';
            $('settingsLocation').value = d.location || '';
            $('settingsLogo').value = d.logo || '';
            $('settingsStoreName').value = d.storeName || 'AnyThing Souqe';
        }
    } catch (e) {
        console.error('Load settings error:', e);
    }
}

// ===== LOGOUT =====
function setupLogout() {
    $('adminLogout').addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = '../index.html';
    });
}

// ===== TOAST =====
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
