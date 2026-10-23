(() => {
  "use strict";
  const STORE_KEY = "dokanHisab_v1";
  const defaultProducts = [
    {id:"p1",name:"দুধ চা",price:15,category:"চা ও নাস্তা",unit:"১ কাপ"},
    {id:"p2",name:"রং চা",price:10,category:"চা ও নাস্তা",unit:"১ কাপ"},
    {id:"p3",name:"সিঙ্গারা",price:10,category:"চা ও নাস্তা",unit:"১ পিস"},
    {id:"p4",name:"বিস্কুট",price:5,category:"বিস্কুট",unit:"১ পিস"},
    {id:"p5",name:"চিপস",price:15,category:"চিপস",unit:"১ প্যাকেট"},
    {id:"p6",name:"কলা",price:10,category:"কলা ও ফল",unit:"১ পিস"},
    {id:"p7",name:"দুধ",price:30,category:"দুধ",unit:"১ প্যাকেট"},
    {id:"p8",name:"সিগারেট ব্র্যান্ড A — ১ শলাকা",price:10,category:"সিগারেট",unit:"১ শলাকা"},
    {id:"p9",name:"সিগারেট ব্র্যান্ড A — ১ প্যাকেট",price:200,category:"সিগারেট",unit:"১ প্যাকেট"},
    {id:"p10",name:"সিগারেট ব্র্যান্ড B — ১ শলাকা",price:12,category:"সিগারেট",unit:"১ শলাকা"}
  ];
  const $ = id => document.getElementById(id);
  const money = n => "৳" + Number(n || 0).toLocaleString("bn-BD",{maximumFractionDigits:2});
  const now = () => new Date().toISOString();
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const makeId = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  let state = loadState();
  let activeCustomerId = null;
  let activeCategory = "সব";
  let toastTimer;

  function loadState(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if(raw){ const data=JSON.parse(raw); if(Array.isArray(data.products)&&Array.isArray(data.customers)&&Array.isArray(data.history)) return data; }
    } catch(e) { console.warn("Could not read saved data",e); }
    return {products:defaultProducts,customers:[],history:[],nextToken:1};
  }
  function save(){ try { localStorage.setItem(STORE_KEY,JSON.stringify(state)); renderAll(); } catch(e) { alert("ডেটা সেভ করা যায়নি। ব্রাউজারের স্টোরেজ পরীক্ষা করুন এবং ব্যাকআপ নিন।"); } }
  function notify(msg){ const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2400); }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function currentCustomer(){return state.customers.find(c=>c.id===activeCustomerId);}
  function total(c){return c.items.reduce((sum,i)=>{const p=state.products.find(p=>p.id===i.productId);return sum+(p?p.price*i.qty:i.price*i.qty);},0);}
  function itemCount(c){return c.items.reduce((s,i)=>s+i.qty,0);}
  function formatDate(iso){return new Date(iso).toLocaleString("bn-BD",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}
  function renderAll(){renderStats();renderCustomers();renderProducts();renderBill();renderProductTable();renderHistory();}
  function renderStats(){
    const sales=state.history.filter(h=>h.dateKey===todayKey()).reduce((s,h)=>s+h.total,0);
    $("todaySales").textContent=money(sales);
    $("openCount").textContent=state.customers.length.toLocaleString("bn-BD");
    $("paidCount").textContent=state.history.filter(h=>h.dateKey===todayKey()).length.toLocaleString("bn-BD");
  }
  function renderCustomers(){
    const root=$("customerList");
    if(!state.customers.length){root.innerHTML='<div class="empty">এখনও কোনো খোলা বিল নেই।<br>“নতুন কাস্টমার” চাপুন।</div>';return;}
    root.innerHTML=state.customers.map(c=>`<button class="customer-card ${c.id===activeCustomerId?"selected":""}" data-customer="${c.id}"><span><strong>টোকেন ${escapeHtml(c.token)}</strong><small>${escapeHtml(c.name||"সাধারণ কাস্টমার")} · ${itemCount(c).toLocaleString("bn-BD")} আইটেম</small></span><span class="amount">${money(total(c))}</span></button>`).join("");
    root.querySelectorAll("[data-customer]").forEach(b=>b.addEventListener("click",()=>{activeCustomerId=b.dataset.customer;renderAll();}));
  }
  function renderProducts(){
    const search=$("productSearch").value.trim().toLowerCase();
    const cats=["সব",...new Set(state.products.map(p=>p.category))];
    $("categoryFilters").innerHTML=cats.map(c=>`<button class="filter ${activeCategory===c?"active":""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
    $("categoryFilters").querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.cat;renderProducts();}));
    const products=state.products.filter(p=>(activeCategory==="সব"||p.category===activeCategory)&&p.name.toLowerCase().includes(search));
    $("productGrid").innerHTML=products.length?products.map(p=>`<button class="product-tile" data-add="${p.id}"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.unit||"")}</small><span>${money(p.price)} <small>＋ যোগ</small></span></button>`).join(""):'<div class="empty">পণ্য পাওয়া যায়নি। পণ্য ও দাম থেকে যোগ করুন।</div>';
    $("productGrid").querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addProduct(b.dataset.add)));
  }
  function renderBill(){
    const c=currentCustomer();
    $("billCustomerTitle").textContent=c?`টোকেন ${c.token} · ${c.name||"সাধারণ কাস্টমার"}`:"কাস্টমার নির্বাচন করুন";
    $("billSubtitle").textContent=c?`বিল শুরু: ${formatDate(c.createdAt)}`:"পণ্য যোগ করলে এখানে দেখা যাবে";
    $("payBtn").disabled=!c||!c.items.length;
    $("billTotal").textContent=money(c?total(c):0);
    if(!c){$("billItems").innerHTML='<div class="empty">প্রথমে একটি কাস্টমার তৈরি বা নির্বাচন করুন।</div>';return;}
    if(!c.items.length){$("billItems").innerHTML='<div class="empty">এখনও কোনো পণ্য যোগ করা হয়নি।</div>';return;}
    $("billItems").innerHTML=c.items.map(i=>{const p=state.products.find(p=>p.id===i.productId);const name=p?p.name:i.name;const price=p?p.price:i.price;return `<div class="bill-row"><div class="bill-row-top"><strong>${escapeHtml(name)}</strong><strong>${money(price*i.qty)}</strong></div><small>${money(price)} × ${i.qty.toLocaleString("bn-BD")}</small><div class="qty-controls"><button data-minus="${i.productId}" aria-label="একটি কমান">−</button><b>${i.qty.toLocaleString("bn-BD")}</b><button data-plus="${i.productId}" aria-label="একটি বাড়ান">＋</button><button class="remove" data-remove="${i.productId}">বাদ দিন</button></div></div>`}).join("");
    $("billItems").querySelectorAll("[data-minus]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.minus,-1)));
    $("billItems").querySelectorAll("[data-plus]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.plus,1)));
    $("billItems").querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>removeItem(b.dataset.remove)));
  }
  function renderProductTable(){
    const q=$("manageSearch").value.trim().toLowerCase();
    const list=state.products.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
    $("productTable").innerHTML=list.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(p.unit||"—")}</td><td>${money(p.price)}</td><td><button class="table-action" data-edit="${p.id}">এডিট</button><button class="table-action delete" data-delete="${p.id}">মুছুন</button></td></tr>`).join("")||'<tr><td colspan="5">কোনো পণ্য নেই।</td></tr>';
    $("productTable").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
    $("productTable").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
  }
  function renderHistory(){
    const rows=[...state.history].reverse();
    $("historyEmpty").classList.toggle("hidden",rows.length>0);
    $("historyTable").innerHTML=rows.map(h=>`<tr><td>${escapeHtml(h.billNo)}</td><td>${escapeHtml(h.name||"সাধারণ কাস্টমার")} (টোকেন ${escapeHtml(h.token)})</td><td>${formatDate(h.paidAt)}</td><td>${h.items.reduce((s,i)=>s+i.qty,0).toLocaleString("bn-BD")}</td><td><strong>${money(h.total)}</strong></td></tr>`).join("");
  }
  function addCustomer(){
    const raw=prompt("কাস্টমারের নাম বা পরিচয় লিখুন (না জানলে ফাঁকা রাখুন):","");if(raw===null)return;
    const c={id:makeId("c"),token:state.nextToken||1,name:raw.trim(),createdAt:now(),items:[]};
    state.nextToken=c.token+1;state.customers.push(c);activeCustomerId=c.id;save();notify(`টোকেন ${c.token} তৈরি হয়েছে`);
  }
  function addProduct(id){
    const c=currentCustomer();if(!c){notify("আগে নতুন কাস্টমার তৈরি বা নির্বাচন করুন");return;}
    const p=state.products.find(p=>p.id===id);if(!p)return;
    const item=c.items.find(i=>i.productId===id);
    if(item)item.qty++;else c.items.push({productId:p.id,qty:1,name:p.name,price:p.price});
    save();
  }
  function changeQty(id,delta){const c=currentCustomer();if(!c)return;const i=c.items.find(i=>i.productId===id);if(!i)return;i.qty+=delta;if(i.qty<=0)c.items=c.items.filter(x=>x.productId!==id);save();}
  function removeItem(id){const c=currentCustomer();if(!c)return;c.items=c.items.filter(i=>i.productId!==id);save();}
  function clearBill(){const c=currentCustomer();if(!c)return;if(!confirm("এই কাস্টমারের সব আইটেম মুছে দেবেন?"))return;c.items=[];save();notify("বিল খালি করা হয়েছে");}
  function payBill(){
    const c=currentCustomer();if(!c||!c.items.length)return;
    const amount=total(c);if(!confirm(`টোকেন ${c.token} — মোট ${money(amount)}। টাকা পেয়েছেন? OK চাপলে বিল সম্পন্ন হবে।`))return;
    const items=c.items.map(i=>{const p=state.products.find(p=>p.id===i.productId);return {name:p?p.name:i.name,price:p?p.price:i.price,qty:i.qty};});
    state.history.push({billNo:"B-"+Date.now().toString().slice(-8),token:c.token,name:c.name,paidAt:now(),dateKey:todayKey(),items,total:amount});
    state.customers=state.customers.filter(x=>x.id!==c.id);activeCustomerId=state.customers.length?state.customers[state.customers.length-1].id:null;save();notify("বিল সম্পন্ন হয়েছে");
  }
  function resetProductForm(){ $("productForm").reset();$("productId").value="";$("formTitle").textContent="নতুন পণ্য যোগ করুন";$("saveProductBtn").textContent="পণ্য সেভ করুন"; }
  function editProduct(id){const p=state.products.find(p=>p.id===id);if(!p)return;$("productId").value=p.id;$("productName").value=p.name;$("productPrice").value=p.price;$("productCategory").value=p.category;$("productUnit").value=p.unit||"";$("formTitle").textContent="পণ্য এডিট করুন";$("saveProductBtn").textContent="পরিবর্তন সেভ করুন";window.scrollTo({top:0,behavior:"smooth"});}
  function deleteProduct(id){const p=state.products.find(p=>p.id===id);if(!p||!confirm(`“${p.name}” মুছে দেবেন? পুরোনো বিলে এর সংরক্ষিত দাম থাকবে।`))return;state.products=state.products.filter(x=>x.id!==id);state.customers.forEach(c=>c.items=c.items.filter(i=>i.productId!==id));save();notify("পণ্য মুছে ফেলা হয়েছে");}
  function exportBackup(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`dokan-hisab-backup-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);notify("ব্যাকআপ ফাইল ডাউনলোড শুরু হয়েছে");
  }
  function importBackup(file){
    if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.products)||!Array.isArray(d.customers)||!Array.isArray(d.history))throw new Error("invalid");if(!confirm("বর্তমান হিসাবের জায়গায় ব্যাকআপের হিসাব বসবে। আগে বর্তমান ডেটার ব্যাকআপ নিয়েছেন?"))return;state={products:d.products,customers:d.customers,history:d.history,nextToken:d.nextToken||1};activeCustomerId=null;save();notify("ব্যাকআপ ফিরিয়ে আনা হয়েছে");}catch(e){alert("এই ব্যাকআপ ফাইলটি সঠিক নয়।");}};reader.readAsText(file);}
  function exportCSV(){
    const rows=[["বিল নম্বর","কাস্টমার","টোকেন","তারিখ","পণ্য","পরিমাণ","একক দাম","লাইন মোট","বিল মোট"]];
    state.history.forEach(h=>h.items.forEach(i=>rows.push([h.billNo,h.name,h.token,new Date(h.paidAt).toLocaleString("bn-BD"),i.name,i.qty,i.price,i.qty*i.price,h.total])));
    const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`dokan-hisab-history-${todayKey()}.csv`;a.click();URL.revokeObjectURL(url);
  }
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));["sales","products","history"].forEach(t=>$(t+"Tab").classList.toggle("hidden",t!==b.dataset.tab));}));
  $("newCustomerBtn").addEventListener("click",addCustomer);$("payBtn").addEventListener("click",payBill);$("clearBillBtn").addEventListener("click",clearBill);
  $("productSearch").addEventListener("input",renderProducts);$("manageSearch").addEventListener("input",renderProductTable);
  $("productForm").addEventListener("submit",e=>{e.preventDefault();const id=$("productId").value;const name=$("productName").value.trim();const price=Number($("productPrice").value);if(!name||!Number.isFinite(price)||price<=0){alert("পণ্যের নাম ও সঠিক দাম দিন।");return;}const p={id:id||makeId("p"),name,price,category:$("productCategory").value,unit:$("productUnit").value.trim()};if(id){state.products=state.products.map(x=>x.id===id?p:x);}else state.products.push(p);resetProductForm();save();notify(id?"পণ্যের তথ্য আপডেট হয়েছে":"নতুন পণ্য যোগ হয়েছে");});
  $("cancelEditBtn").addEventListener("click",resetProductForm);$("exportBtn").addEventListener("click",exportBackup);$("historyExportBtn").addEventListener("click",exportCSV);$("importFile").addEventListener("change",e=>{importBackup(e.target.files[0]);e.target.value="";});
  renderAll();
})();