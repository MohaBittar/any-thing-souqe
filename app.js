import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getAnalytics}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged,GoogleAuthProvider,signInWithPopup}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import{getFirestore,collection,addDoc,getDocs,doc,updateDoc,deleteDoc,query,orderBy,getDoc,setDoc,increment}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyD-ipvtcpSHmCRP7pyu9WnR1Y2B8iJLe_M",authDomain:"any-thing-souqe.firebaseapp.com",projectId:"any-thing-souqe",storageBucket:"any-thing-souqe.firebasestorage.app",messagingSenderId:"475288115133",appId:"1:475288115133:web:fd53f7302437f2064924d4",measurementId:"G-801XPN09G1"};
const app=initializeApp(firebaseConfig);getAnalytics(app);
const auth=getAuth(app);const db=getFirestore(app);const googleProvider=new GoogleAuthProvider();
let currentUser=null;let cart=JSON.parse(localStorage.getItem('cart'))||[];
let allProducts=[];let allCategories=[];let allUnits=[];let allOrders=[];let allUsers=[];

function showToast(msg,type){
type=type||'info';var c=document.getElementById('toast-container');if(!c)return;
var t=document.createElement('div');t.className='toast '+type;
var icon=type==='success'?'✓':type==='error'?'✕':type==='warning'?'⚠':'ℹ';
t.innerHTML='<span>'+icon+'</span><span>'+msg+'</span>';c.appendChild(t);
setTimeout(function(){t.style.animation='slideOut .3s ease forwards';setTimeout(function(){t.remove()},300)},3000);
}
window.showToast=showToast;

function openModal(id){document.getElementById(id).classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}
window.openModal=openModal;window.closeModal=closeModal;

function updateCartUI(){
var el=document.getElementById('cart-items');if(!el)return;
var totalItems=cart.reduce(function(s,i){return s+i.quantity},0);
var totalPrice=cart.reduce(function(s,i){return s+(i.price*i.quantity)},0);
var pts=Math.floor(totalPrice/10);
document.querySelectorAll('.cart-count').forEach(function(e){e.textContent=totalItems});
if(!cart.length){el.innerHTML='<div class="cart-empty"><div class="icon">🛒</div><h3>Cart is empty</h3><p>Add products!</p></div>';
}else{el.innerHTML=cart.map(function(i){
return'<div class="cart-item"><div class="cart-item-image"><img src="'+(i.image||'https://via.placeholder.com/80')+'" alt=""></div><div class="cart-item-info"><h4>'+i.name+'</h4><span class="price">'+i.price+' AED</span><div class="cart-item-qty"><button onclick="updateQuantity(\''+i.id+'\',-1)">-</button><span>'+i.quantity+'</span><button onclick="updateQuantity(\''+i.id+'\',1)">+</button></div></div><span class="cart-item-remove" onclick="removeFromCart(\''+i.id+'\')">✕</span></div>';
}).join('')}
var tEl=document.getElementById('cart-total-display');var pEl=document.getElementById('cart-points-display');
if(tEl)tEl.textContent=totalPrice.toFixed(2)+' AED';
if(pEl)pEl.innerHTML="🎁 You'll earn <strong>"+pts+"</strong> points!";
}
window.updateCartUI=updateCartUI;
window.openCart=function(){document.getElementById('cart-sidebar').classList.add('open');document.getElementById('overlay').classList.add('show')};
window.closeCart=function(){document.getElementById('cart-sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('show')};

function checkIsAdmin(){return currentUser&&currentUser.email==='MohaBittarInfo@gmail.com'}

window.showStore=function(){document.getElementById('store-view').style.display='block';document.getElementById('admin-view').style.display='none';if(currentUser&&checkIsAdmin())document.getElementById('fab-admin-btn').style.display='flex';window.scrollTo(0,0)};
window.openAdminPanel=function(){if(!currentUser){showToast('Please login','warning');openModal('auth-modal');return}if(!checkIsAdmin()){showToast('Admin only','error');return}document.getElementById('store-view').style.display='none';document.getElementById('admin-view').style.display='block';document.getElementById('fab-admin-btn').style.display='none';document.getElementById('admin-name-display').textContent=currentUser.displayName||currentUser.email;loadAdminData()};

onAuthStateChanged(auth,async function(user){
if(user){currentUser=user;document.getElementById('user-logged-in').style.display='flex';document.getElementById('user-guest').style.display='none';
document.querySelectorAll('.user-name-display').forEach(function(e){e.textContent=user.displayName||user.email.split('@')[0]});
var us=await getDoc(doc(db,'users',user.uid));
if(us.exists()){document.querySelectorAll('.points-value').forEach(function(e){e.textContent=us.data().points||0})}
else{var isA=user.email==='MohaBittarInfo@gmail.com';await setDoc(doc(db,'users',user.uid),{name:user.displayName||user.email.split('@')[0],email:user.email,points:50,role:isA?'admin':'customer',createdAt:new Date().toISOString()});showToast('Welcome! 50 bonus points!','success');document.querySelectorAll('.points-value').forEach(function(e){e.textContent=50})}
document.getElementById('fab-admin-btn').style.display=checkIsAdmin()?'flex':'none';
}else{currentUser=null;document.getElementById('user-logged-in').style.display='none';document.getElementById('user-guest').style.display='block';document.getElementById('fab-admin-btn').style.display='none';document.getElementById('user-dropdown').classList.remove('show');if(document.getElementById('admin-view').style.display==='block')showStore()}
});

window.handleLogin=async function(e){e.preventDefault();try{await signInWithEmailAndPassword(auth,document.getElementById('login-email').value,document.getElementById('login-password').value);closeModal('auth-modal');showToast('Logged in!','success')}catch(err){showToast(err.message,'error')}};
window.handleRegister=async function(e){e.preventDefault();var n=document.getElementById('register-name').value,em=document.getElementById('register-email').value,pw=document.getElementById('register-password').value;try{var cr=await createUserWithEmailAndPassword(auth,em,pw);await setDoc(doc(db,'users',cr.user.uid),{name:n,email:em,points:50,role:'customer',createdAt:new Date().toISOString()});closeModal('auth-modal');showToast('Welcome! 50 bonus points!','success')}catch(err){showToast(err.message,'error')}};
window.handleGoogleLogin=async function(){try{var r=await signInWithPopup(auth,googleProvider);var s=await getDoc(doc(db,'users',r.user.uid));if(!s.exists())await setDoc(doc(db,'users',r.user.uid),{name:r.user.displayName,email:r.user.email,points:50,role:'customer',createdAt:new Date().toISOString()});closeModal('auth-modal');showToast('Logged in!','success')}catch(err){showToast(err.message,'error')}};
window.handleLogout=async function(){try{await signOut(auth);showToast('Logged out!','success')}catch(err){showToast(err.message,'error')}};
window.switchAuthTab=function(tab,btn){document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.remove('active')});document.querySelectorAll('.auth-form').forEach(function(f){f.classList.remove('active')});btn.classList.add('active');document.getElementById(tab+'-form').classList.add('active')};

async function loadProducts(){try{var s=await getDocs(collection(db,'products'));allProducts=s.docs.map(function(d){return{id:d.id,...d.data()}});renderStoreProducts(allProducts);renderAdminProducts()}catch(e){console.error(e)}}
function renderStoreProducts(list){
var g=document.getElementById('products-grid');if(!g)return;
if(!list.length){g.innerHTML='<div class="loading-msg">No products yet</div>';return}
g.innerHTML=list.map(function(p){var b='';if(p.sale)b+='<span class="badge sale">Sale</span>';if(p.isNew)b+='<span class="badge new">New</span>';if(!p.inStock)b+='<span class="badge out-of-stock">Out of Stock</span>';
var col='';if(p.colors&&p.colors.length)col='<div class="product-colors">'+p.colors.map(function(c,i){return'<span class="color-dot" style="background:'+c+'"></span>'}).join('')+'</div>';
var op=p.originalPrice?'<span class="original">'+p.originalPrice+'</span>':'';
return'<div class="product-card">'+b+'<div class="product-image"><img src="'+(p.image||'https://via.placeholder.com/300x250?text=No+Image')+'" alt="'+p.name+'"></div><div class="product-info"><span class="category">'+(p.category||'General')+'</span><h3>'+p.name+'</h3>'+col+'<div class="product-price"><span class="current">'+p.price+'</span>'+op+'<span class="currency">AED</span></div><div class="product-actions"><button class="btn btn-primary btn-block" onclick="addToCart(\''+p.id+'\')"'+(p.inStock?'':' disabled')+'>'+(p.inStock?'Add to Cart':'Out of Stock')+'</button></div></div></div>'}).join('')}

window.handleSearch=function(v){var t=v.toLowerCase();renderStoreProducts(allProducts.filter(function(p){return p.name.toLowerCase().includes(t)||(p.category&&p.category.toLowerCase().includes(t))}))};
window.filterByCategory=function(cat){renderStoreProducts(allProducts.filter(function(p){return p.category===cat}));document.getElementById('products-section').scrollIntoView({behavior:'smooth'})};

window.addToCart=function(id){var p=allProducts.find(function(x){return x.id===id});if(!p||!p.inStock)return;var ex=cart.find(function(x){return x.id===id});if(ex){ex.quantity++}else{cart.push({id:p.id,name:p.name,price:p.price,image:p.image,quantity:1})}localStorage.setItem('cart',JSON.stringify(cart));updateCartUI();showToast('Added!','success');openCart()};
window.removeFromCart=function(id){cart=cart.filter(function(x){return x.id!==id});localStorage.setItem('cart',JSON.stringify(cart));updateCartUI()};
window.updateQuantity=function(id,ch){var it=cart.find(function(x){return x.id===id});if(it){it.quantity+=ch;if(it.quantity<=0)cart=cart.filter(function(x){return x.id!==id});localStorage.setItem('cart',JSON.stringify(cart));updateCartUI()}};

window.checkout=async function(){if(!cart.length){showToast('Cart empty!','warning');return}if(!currentUser){showToast('Login first','warning');openModal('auth-modal');return}
var total=cart.reduce(function(s,i){return s+(i.price*i.quantity)},0),pts=Math.floor(total/10);
try{await addDoc(collection(db,'orders'),{userId:currentUser.uid,userEmail:currentUser.email,items:cart,total:total,pointsEarned:pts,status:'pending',createdAt:new Date().toISOString()});
await updateDoc(doc(db,'users',currentUser.uid),{points:increment(pts)});
cart=[];localStorage.setItem('cart',JSON.stringify(cart));updateCartUI();closeCart();showToast('Order placed! +'+pts+' pts','success');
var us=await getDoc(doc(db,'users',currentUser.uid));if(us.exists())document.querySelectorAll('.points-value').forEach(function(e){e.textContent=us.data().points||0})}catch(e){showToast('Error: '+e.message,'error')}};

async function loadCategories(){try{var s=await getDocs(collection(db,'categories'));allCategories=s.docs.map(function(d){return{id:d.id,...d.data()}});renderStoreCategories();renderAdminCategories()}catch(e){console.error(e)}}
function renderStoreCategories(){var g=document.getElementById('categories-grid');if(!g||!allCategories.length)return;
g.innerHTML=allCategories.map(function(c){return'<div class="category-card" onclick="filterByCategory(\''+c.name+'\')"><div class="icon">'+(c.icon||'📦')+'</div><h3>'+c.name+'</h3></div>'}).join('')}
function renderAdminCategories(){var tb=document.getElementById('admin-categories-table');if(!allCategories.length){tb.innerHTML='<tr><td colspan="4" class="no-data">No categories yet</td></tr>';return}
tb.innerHTML=allCategories.map(function(c){return'<tr><td style="font-size:24px">'+(c.icon||'📦')+'</td><td><strong>'+c.name+'</strong></td><td>'+(c.description||'-')+'</td><td><div class="action-btns"><button class="btn btn-primary btn-sm" onclick="editCategory(\''+c.id+'\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteCategory(\''+c.id+'\')">Delete</button></div></td></tr>'}).join('')}
window.openCategoryModal=function(c){document.getElementById('category-modal-title').textContent=c?'Edit':'Add Category';document.getElementById('category-id').value=c?c.id:'';document.getElementById('category-name').value=c?c.name:'';document.getElementById('category-icon').value=c?(c.icon||''):'';document.getElementById('category-description').value=c?(c.description||''):'';openModal('category-modal')};
window.editCategory=function(id){var c=allCategories.find(function(x){return x.id===id});if(c)openCategoryModal(c)};
window.saveCategory=async function(){var id=document.getElementById('category-id').value;var d={name:document.getElementById('category-name').value,icon:document.getElementById('category-icon').value||'📦',description:document.getElementById('category-description').value};try{if(id){await updateDoc(doc(db,'categories',id),d);showToast('Updated!','success')}else{await addDoc(collection(db,'categories'),d);showToast('Added!','success')}closeModal('category-modal');await loadCategories()}catch(e){showToast('Error: '+e.message,'error')}};
window.deleteCategory=async function(id){if(!confirm('Delete?'))return;try{await deleteDoc(doc(db,'categories',id));showToast('Deleted!','success');await loadCategories()}catch(e){showToast('Error: '+e.message,'error')}};

async function loadUnits(){try{var s=await getDocs(collection(db,'units'));allUnits=s.docs.map(function(d){return{id:d.id,...d.data()}});renderAdminUnits()}catch(e){console.error(e)}}
function renderAdminUnits(){var tb=document.getElementById('admin-units-table');if(!allUnits.length){tb.innerHTML='<tr><td colspan="3" class="no-data">No units yet</td></tr>';return}
tb.innerHTML=allUnits.map(function(u){return'<tr><td><strong>'+u.name+'</strong></td><td>'+(u.abbreviation||'-')+'</td><td><div class="action-btns"><button class="btn btn-primary btn-sm" onclick="editUnit(\''+u.id+'\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteUnit(\''+u.id+'\')">Delete</button></div></td></tr>'}).join('')}
window.openUnitModal=function(u){document.getElementById('unit-modal-title').textContent=u?'Edit':'Add Unit';document.getElementById('unit-id').value=u?u.id:'';document.getElementById('unit-name').value=u?u.name:'';document.getElementById('unit-abbreviation').value=u?(u.abbreviation||''):'';openModal('unit-modal')};
window.editUnit=function(id){var u=allUnits.find(function(x){return x.id===id});if(u)openUnitModal(u)};
window.saveUnit=async function(){var id=document.getElementById('unit-id').value;var d={name:document.getElementById('unit-name').value,abbreviation:document.getElementById('unit-abbreviation').value};try{if(id){await updateDoc(doc(db,'units',id),d);showToast('Updated!','success')}else{await addDoc(collection(db,'units'),d);showToast('Added!','success')}closeModal('unit-modal');await loadUnits()}catch(e){showToast('Error: '+e.message,'error')}};
window.deleteUnit=async function(id){if(!confirm('Delete?'))return;try{await deleteDoc(doc(db,'units',id));showToast('Deleted!','success');await loadUnits()}catch(e){showToast('Error: '+e.message,'error')}};

function renderAdminProducts(){var tb=document.getElementById('admin-products-table');if(!allProducts.length){tb.innerHTML='<tr><td colspan="8" class="no-data">No products yet</td></tr>';return}
tb.innerHTML=allProducts.map(function(p){var sc=p.inStock?'in-stock':'out-of-stock',st=p.inStock?'In':'Out';var op=p.originalPrice?'<del style="color:#999">'+p.originalPrice+'</del>':'';var cd=(p.colors||[]).map(function(c){return'<span class="color-dot-sm" style="background:'+c+'"></span>'}).join('');
return'<tr><td><img src="'+(p.image||'https://via.placeholder.com/50')+'" class="product-thumb"></td><td><strong>'+p.name+'</strong></td><td>'+(p.category||'-')+'</td><td>'+(p.unit||'-')+'</td><td>'+p.price+' AED '+op+'</td><td><span class="stock-badge '+sc+'">'+st+'</span></td><td><div class="color-dots">'+cd+'</div></td><td><div class="action-btns"><button class="btn btn-primary btn-sm" onclick="editProduct(\''+p.id+'\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct(\''+p.id+'\')">Del</button></div></td></tr>'}).join('')}
window.openProductModal=function(p){document.getElementById('product-modal-title').textContent=p?'Edit':'Add Product';document.getElementById('product-id').value=p?p.id:'';document.getElementById('product-name').value=p?p.name:'';document.getElementById('product-price').value=p?p.price:'';document.getElementById('product-original-price').value=p?(p.originalPrice||''):'';document.getElementById('product-description').value=p?(p.description||''):'';document.getElementById('product-image').value=p?(p.image||''):'';document.getElementById('product-stock').value=p?String(p.inStock):'true';document.getElementById('product-quantity').value=p?(p.quantity||0):0;document.getElementById('product-colors').value=p?(p.colors||[]).join(', '):'';document.getElementById('product-sale').checked=p?!!p.sale:false;document.getElementById('product-new').checked=p?!!p.isNew:false;
document.getElementById('product-category').innerHTML='<option value="">Select</option>'+allCategories.map(function(c){return'<option value="'+c.name+'" '+(p&&p.category===c.name?'selected':'')+'>'+c.name+'</option>'}).join('');
document.getElementById('product-unit').innerHTML='<option value="">Select</option>'+allUnits.map(function(u){return'<option value="'+u.name+'" '+(p&&p.unit===u.name?'selected':'')+'>'+u.name+' ('+u.abbreviation+')</option>'}).join('');
openModal('product-modal')};
window.editProduct=function(id){var p=allProducts.find(function(x){return x.id===id});if(p)openProductModal(p)};
window.saveProduct=async function(){var id=document.getElementById('product-id').value;var d={name:document.getElementById('product-name').value,category:document.getElementById('product-category').value,unit:document.getElementById('product-unit').value,price:parseFloat(document.getElementById('product-price').value),originalPrice:parseFloat(document.getElementById('product-original-price').value)||null,description:document.getElementById('product-description').value,image:document.getElementById('product-image').value,inStock:document.getElementById('product-stock').value==='true',quantity:parseInt(document.getElementById('product-quantity').value)||0,colors:document.getElementById('product-colors').value.split(',').map(function(c){return c.trim()}).filter(function(c){return c}),sale:document.getElementById('product-sale').checked,isNew:document.getElementById('product-new').checked,updatedAt:new Date().toISOString()};
try{if(id){await updateDoc(doc(db,'products',id),d);showToast('Updated!','success')}else{d.createdAt=new Date().toISOString();await addDoc(collection(db,'products'),d);showToast('Added!','success')}closeModal('product-modal');await loadProducts();updateDashboard()}catch(e){showToast('Error: '+e.message,'error')}};
window.deleteProduct=async function(id){if(!confirm('Delete?'))return;try{await deleteDoc(doc(db,'products',id));showToast('Deleted!','success');await loadProducts();updateDashboard()}catch(e){showToast('Error: '+e.message,'error')}};

async function loadOrders(){try{var q=query(collection(db,'orders'),orderBy('createdAt','desc'));var s=await getDocs(q);allOrders=s.docs.map(function(d){return{id:d.id,...d.data()}});renderAdminOrders()}catch(e){console.error(e)}}
function renderAdminOrders(){var tb=document.getElementById('admin-orders-table');if(!allOrders.length){tb.innerHTML='<tr><td colspan="8" class="no-data">No orders yet</td></tr>';return}
tb.innerHTML=allOrders.map(function(o){var ic=o.items?o.items.length:0,dt=o.createdAt?new Date(o.createdAt).toLocaleDateString():'-';
return'<tr><td><strong>#'+o.id.slice(-6)+'</strong></td><td>'+(o.userEmail||'Guest')+'</td><td>'+ic+'</td><td><strong>'+o.total+' AED</strong></td><td>⭐'+(o.pointsEarned||0)+'</td><td><span class="status-badge '+o.status+'">'+o.status+'</span></td><td>'+dt+'</td><td><div class="action-btns"><button class="btn btn-success btn-sm" onclick="updateOrderStatus(\''+o.id+'\',\'completed\')">✓</button><button class="btn btn-danger btn-sm" onclick="updateOrderStatus(\''+o.id+'\',\'cancelled\')">✕</button></div></td></tr>'}).join('')}
window.updateOrderStatus=async function(id,st){try{await updateDoc(doc(db,'orders',id),{status:st});showToast('Updated!','success');await loadOrders();updateDashboard()}catch(e){showToast('Error: '+e.message,'error')}};

async function loadUsers(){try{var s=await getDocs(collection(db,'users'));allUsers=s.docs.map(function(d){return{id:d.id,...d.data()}});renderAdminUsers()}catch(e){console.error(e)}}
function renderAdminUsers(){var tb=document.getElementById('admin-users-table');if(!allUsers.length){tb.innerHTML='<tr><td colspan="6" class="no-data">No users yet</td></tr>';return}
tb.innerHTML=allUsers.map(function(u){var rc=u.role==='admin'?'in-stock':'out-of-stock',dt=u.createdAt?new Date(u.createdAt).toLocaleDateString():'-';var rb=u.role==='admin'?'Deadmin':'Admin';
return'<tr><td><strong>'+(u.name||'?')+'</strong></td><td>'+u.email+'</td><td>⭐'+(u.points||0)+'</td><td><span class="stock-badge '+rc+'">'+(u.role||'customer')+'</span></td><td>'+dt+'</td><td><div class="action-btns"><button class="btn btn-primary btn-sm" onclick="editUserPoints(\''+u.id+'\','+(u.points||0)+')">Points</button><button class="btn btn-secondary btn-sm" onclick="toggleUserRole(\''+u.id+'\',\''+(u.role||'customer')+'\')">'+rb+'</button></div></td></tr>'}).join('')}
window.editUserPoints=async function(uid,cur){var v=prompt('Points:',cur);if(v===null)return;try{await updateDoc(doc(db,'users',uid),{points:parseInt(v)});showToast('Updated!','success');await loadUsers()}catch(e){showToast('Error: '+e.message,'error')}};
window.toggleUserRole=async function(uid,cr){var nr=cr==='admin'?'customer':'admin';if(!confirm('Set role: '+nr+'?'))return;try{await updateDoc(doc(db,'users',uid),{role:nr});showToast('Updated!','success');await loadUsers()}catch(e){showToast('Error: '+e.message,'error')}};

async function loadSettings(){try{var s=await getDoc(doc(db,'settings','store'));if(s.exists()){var d=s.data();var f={'set-store-name':'storeName','set-store-name-ar':'storeNameAr','set-whatsapp':'whatsapp','set-phone':'phone','set-email':'email','set-address':'address','set-points-per':'pointsPer100','set-signup-bonus':'signupBonus','set-free-delivery':'freeDeliveryMin','set-currency':'currency','set-team-leader':'teamLeader','set-team-member2':'teamMember2','set-team-member3':'teamMember3','set-team-member4':'teamMember4','set-hero-title':'heroTitle','set-hero-subtitle':'heroSubtitle','set-hero-btn':'heroBtn','set-copyright':'copyright','set-footer-desc':'footerDesc'};
for(var k in f){if(d[f[k]]!==undefined&&d[f[k]]!==null){var el=document.getElementById(k);if(el)el.value=d[f[k]]}}applySettings(d)}}catch(e){console.error(e)}}
function applySettings(d){if(d.storeName)document.querySelectorAll('.store-name').forEach(function(e){e.textContent=d.storeName});if(d.storeNameAr)document.querySelectorAll('.store-name-ar').forEach(function(e){e.textContent=d.storeNameAr});if(d.whatsapp){document.querySelectorAll('.whatsapp-link').forEach(function(e){e.href='https://wa.me/'+d.whatsapp});document.querySelectorAll('.whatsapp-number-display').forEach(function(e){e.textContent=d.whatsapp.replace('971','0')})}if(d.phone)document.querySelectorAll('.phone-display').forEach(function(e){e.textContent='📞 '+d.phone});if(d.teamLeader||d.teamMember2||d.teamMember3){var h='';if(d.teamLeader)h+='<span class="team-member">'+d.teamLeader+' (Leader)</span>';if(d.teamMember2)h+='<span class="team-member">'+d.teamMember2+'</span>';if(d.teamMember3)h+='<span class="team-member">'+d.teamMember3+'</span>';if(d.teamMember4)h+='<span class="team-member">'+d.teamMember4+'</span>';document.querySelectorAll('.team-members').forEach(function(e){e.innerHTML=h});document.querySelectorAll('.team-display').forEach(function(e){var t='Team: ';if(d.teamLeader)t+=d.teamLeader+' (Leader)';if(d.teamMember2)t+=', '+d.teamMember2;if(d.teamMember3)t+=', '+d.teamMember3;if(d.teamMember4)t+=', '+d.teamMember4;e.textContent=t})}if(d.heroTitle)document.querySelectorAll('.hero-title').forEach(function(e){e.textContent=d.heroTitle});if(d.heroSubtitle)document.querySelectorAll('.hero-subtitle').forEach(function(e){e.textContent=d.heroSubtitle});if(d.heroBtn)document.querySelectorAll('.hero-btn').forEach(function(e){e.textContent=d.heroBtn});if(d.copyright)document.querySelectorAll('.copyright-text').forEach(function(e){e.textContent='© '+d.copyright});if(d.footerDesc)document.querySelectorAll('.footer-desc').forEach(function(e){e.textContent=d.footerDesc})}
window.saveSettings=async function(){var d={storeName:document.getElementById('set-store-name').value,storeNameAr:document.getElementById('set-store-name-ar').value,whatsapp:document.getElementById('set-whatsapp').value,phone:document.getElementById('set-phone').value,email:document.getElementById('set-email').value,address:document.getElementById('set-address').value,pointsPer100:parseInt(document.getElementById('set-points-per').value)||10,signupBonus:parseInt(document.getElementById('set-signup-bonus').value)||50,freeDeliveryMin:parseInt(document.getElementById('set-free-delivery').value)||100,currency:document.getElementById('set-currency').value||'AED',teamLeader:document.getElementById('set-team-leader').value,teamMember2:document.getElementById('set-team-member2').value,teamMember3:document.getElementById('set-team-member3').value,teamMember4:document.getElementById('set-team-member4').value,heroTitle:document.getElementById('set-hero-title').value,heroSubtitle:document.getElementById('set-hero-subtitle').value,heroBtn:document.getElementById('set-hero-btn').value,copyright:document.getElementById('set-copyright').value,footerDesc:document.getElementById('set-footer-desc').value,updatedAt:new Date().toISOString()};
try{await setDoc(doc(db,'settings','store'),d);applySettings(d);showToast('Saved!','success')}catch(e){showToast('Error: '+e.message,'error')}};

function updateDashboard(){var sp=document.getElementById('stat-products'),so=document.getElementById('stat-orders'),su=document.getElementById('stat-users'),sr=document.getElementById('stat-revenue');if(sp)sp.textContent=allProducts.length;if(so)so.textContent=allOrders.length;if(su)su.textContent=allUsers.length;var rev=allOrders.filter(function(o){return o.status==='completed'}).reduce(function(s,o){return s+(o.total||0)},0);if(sr)sr.textContent=rev+' AED';
var r=document.getElementById('recent-orders');if(!r)return;if(!allOrders.length){r.innerHTML='<p class="no-data">No orders yet</p>';return}
r.innerHTML=allOrders.slice(0,5).map(function(o){return'<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0;gap:10px"><span><strong>#'+o.id.slice(-6)+'</strong> '+(o.userEmail||'')+'</span><span><strong>'+o.total+' AED</strong></span><span class="status-badge '+o.status+'">'+o.status+'</span></div>'}).join('')}

async function loadAdminData(){await Promise.all([loadProducts(),loadCategories(),loadUnits(),loadOrders(),loadUsers(),loadSettings()]);updateDashboard()}
window.adminTab=function(tab,btn){document.querySelectorAll('.admin-tab').forEach(function(t){t.classList.remove('active')});document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active')});var te=document.getElementById('atab-'+tab);if(te)te.classList.add('active');if(btn)btn.classList.add('active');var ti={dashboard:'Dashboard',products:'Products',categories:'Categories',units:'Units',orders:'Orders',users:'Users',settings:'Settings'};document.getElementById('admin-page-title').textContent=ti[tab]||tab};
window.toggleUserDropdown=function(){document.getElementById('user-dropdown').classList.toggle('show')};
document.addEventListener('click',function(e){if(!e.target.closest('.user-menu')){var dd=document.getElementById('user-dropdown');if(dd)dd.classList.remove('show')}});
document.addEventListener('DOMContentLoaded',function(){loadProducts();loadCategories();updateCartUI()});
