// ============================================================
// ✅ STEP 1: PASTE YOUR SUPABASE CREDENTIALS HERE
// ============================================================
const SUPABASE_URL = "https://gktipiisfpwijfbnswre.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdGlwaWlzZnB3aWpmYm5zd3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjMyMDAsImV4cCI6MjA5MjY5OTIwMH0.F4hs86rodUHlBLilCNua97jjofo5tB2F7QCMxy0YFTQ";
const sb = (window.supabase || supabase).createClient(SUPABASE_URL, SUPABASE_KEY);

// EmailJS Config
const EMAILJS_SERVICE  = "service_d560phs";
const EMAILJS_TEMPLATE = "template_fccdw5p";
const EMAILJS_KEY      = "Pqgh4T8YP82GyrGkY";
const REPORT_EMAILS    = ["umapk02@gmail.com","sreekanthmm@gmail.com"];

function sendEmailReport(csvSummary, csvRaw, month, year, grandTotal) {
  if (typeof emailjs === "undefined") return Promise.reject(new Error("Email service not loaded"));
  emailjs.init(EMAILJS_KEY);
  const message = "Total spent: Rs " + grandTotal.toLocaleString("en-IN") +
    "\n\n=== SUMMARY ===\n" + csvSummary +
    "\n\n=== RAW DATA ===\n" + csvRaw;
  return Promise.all(REPORT_EMAILS.map(function(email){
    return emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email: email, month: month, year: year, name: "SmartExpense", message: message
    });
  }));
}

// ============================================================
// CONSTANTS — unchanged from original
// ============================================================
const USERS = [
  { id:"1", name:"Uma",     pin:"1111", role:"admin"  },
  { id:"2", name:"Sreekanth", pin:"2222", role:"member" },
];
const CATEGORIES = [
  "Groceries & Vegetables","Kids Activities & School","Utilities (Electricity/Water/Gas)",
  "Household Help (Maid/Cook/Driver)","Restaurants",
  "Medical & Pharmacy","Transport & Fuel","Taxi / Auto","Gym","Shopping & Clothing",
  "Subscriptions (OTT/Internet)","Toiletries & Cleaning Supplies","Gardening","Gifts",
  "Wallet / FASTag Recharge","Vouchers & Wallet Loads","Entertainment","Laundry",
  "Personal Care & Grooming","Travel & Holidays","Jewellery & Valuables",
  "Legal & Documentation","Household & Misc","One-Time / Extra Expenses","Miscellaneous"
];
const SOURCES = [
  { label:"HDFC CC",      color:"#2E75C2", light:"#D9E1F2" },
  { label:"Axis CC",      color:"#4E9668", light:"#E2EFDA" },
  { label:"RuPay CC",     color:"#B8860B", light:"#FFF2CC" },
  { label:"HDFC Bank",    color:"#1A5276", light:"#D6EAF8" },
  { label:"Axis Bank",    color:"#1E8449", light:"#D5F5E3" },
  { label:"Cash / UPI",   color:"#C65911", light:"#FCE4D6" },
  { label:"BBDaily",      color:"#6C3483", light:"#E8DAEF" },
  { label:"Akshayakalpa", color:"#117A65", light:"#D1F2EB" },
  { label:"Voucher Balance", color:"#B03A2E", light:"#F9E0DD" }
];
// Accounts that are prepaid store wallets (money already loaded earlier)
const WALLET_ACCOUNTS = ["BBDaily","Akshayakalpa","Voucher Balance"];
const SPEND_SOURCES = SOURCES.filter(x=>!WALLET_ACCOUNTS.includes(x.label));   // accounts that count toward monthly spend
const ACCOUNT_VENDOR = { "BBDaily":"BigBasket", "Akshayakalpa":"Akshayakalpa" };
const ICONS = {
  "Groceries & Vegetables":"🥦","Kids Activities & School":"🎒","Utilities (Electricity/Water/Gas)":"💡",
  "Household Help (Maid/Cook/Driver)":"🏠","Restaurants":"🍜",
  "Medical & Pharmacy":"💊","Transport & Fuel":"⛽","Taxi / Auto":"🚕","Gym":"🏋️",
  "Shopping & Clothing":"👗","Subscriptions (OTT/Internet)":"📱","Toiletries & Cleaning Supplies":"🧴",
  "Gardening":"🌿","Gifts":"🎁","Wallet / FASTag Recharge":"💳","Entertainment":"🎬","Laundry":"👕",
  "Personal Care & Grooming":"💅","Travel & Holidays":"✈️","Jewellery & Valuables":"💎",
  "Legal & Documentation":"📄","Household & Misc":"📦","One-Time / Extra Expenses":"⚡","Miscellaneous":"❔","Vouchers & Wallet Loads":"🎟️","Money Received":"💰"
};
// Buying a voucher / loading a wallet IS monthly spending (it is what hits the card bill).
// Orders PAID FROM a voucher balance (account = a wallet account) are tracked for category/vendor
// analysis but are NOT counted in the monthly total, so nothing is counted twice.
const LOAD_CAT = "Vouchers & Wallet Loads";
const INCOME_CAT = "Money Received";          // money Sreekanth transfers in — not an expense
const TRACKING_START = "2026-11-01";           // "Money in hand" counts from this date onwards
const ALL_CATEGORIES = [...CATEGORIES, INCOME_CAT];
const isIncome = r => r.category === INCOME_CAT;
function rowType(r){ if(isIncome(r)) return "Money received"; return !WALLET_ACCOUNTS.includes(r.source) ? (r.category===LOAD_CAT ? "Voucher purchase / load" : "Direct spend") : "Paid from voucher"; }
const isVoucherRow = r => WALLET_ACCOUNTS.includes(r.source) && !isIncome(r);   // paid from a voucher balance (not counted)
const isSpend = r => !WALLET_ACCOUNTS.includes(r.source) && !isIncome(r);       // true = counts toward monthly spending
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DIM = {January:31,February:28,March:31,April:30,May:31,June:30,July:31,August:31,September:30,October:31,November:30,December:31};

// ============================================================
// AUTO CATEGORY — keyword matching on description
// ============================================================
const KEYWORD_MAP = [
  { keywords:["swiggy","zomato","eatsure","dunzo","cake","pastry","restaurant","hotel","cafe","coffee","sweets","bakery","pizza","burger","biryani","dining","snack","snacks","juice","ice cream","dessert","mithai","breakfast","lunch","dinner","donut","popcorn","food coupon","chips","biscuit","biscuits","namkeen","kurkure","cold drink","soft drink","coke","pepsi","energy drink"], category:"Restaurants" },
  { keywords:["recharge","mobile recharge","prepaid","talktime","data pack","sim","vodafone","idea","bsnl","fastag","wallet","paytm","gpay","phonepe","load","fasttag","bbdaily wallet","akshayakalpa recharge"], category:"Wallet / FASTag Recharge" },
  { keywords:["doctor","hospital","pharmacy","medicine","apollo","clinic","lab","test","dental","tablets","injection","medical belt","paracetamol","crocin","vicks","ointment","bandage","band aid","cough"], category:"Medical & Pharmacy" },
  { keywords:["school fee","annual fee","term fee","vehicle repair","car repair","bike repair","car service","vehicle service","garage","mechanic","holiday","trip payment","vacation","tour package","flight ticket","flight tickets","air ticket","emergency","unplanned","one time","one-time"], category:"One-Time / Extra Expenses" },
  { keywords:["milk","akshaya","bbdaily","vegetables","vegetable","sabzi","groceries","grocery","bigbasket","zepto","blinkit","dmart","fruits","fruit","veggies","kirana","paneer","curd","bread","cheese","pappadam","yogurt","masala","rice","sauce","dosa batter","potato","jaggery","coconut","buttermilk","onion","tomato","tea","chocolate","grapes","apple","banana","mango","orange","watermelon","papaya","pomegranate","guava","carrot","cabbage","cauliflower","beans","brinjal","capsicum","cucumber","spinach","ginger","garlic","chilli","lemon","eggs","bread","butter","ghee","sugar","salt","flour","atta","pulses","dal","lentils","cereal","oats","cooking oil","edible oil","sunflower oil","coconut oil"], category:"Groceries & Vegetables" },
  { keywords:["fees","tuition fee","class fee","exam fee","course fee","class","tuition","course","coaching","exam","becker","college","books","book","stationery","stationary","school shoes","school uniform","school bag","dance class","music class","football","kannada","french class","math class","phonics","theatre class","kathakali","swimming","print out","printout","photocopy","photocopying","school water bottle","school lunch box","lunch box","school supplies","pencil","pencils","notebook","notebooks","crayon","crayons","eraser","sketch pen","geometry box"], category:"Kids Activities & School" },
  { keywords:["netflix","hotstar","spotify","prime","jio","airtel","internet","wifi","ott subscription","subscription","disney","newspaper","phone bill","act broadband","act internet","broadband"], category:"Subscriptions (OTT/Internet)" },
  { keywords:["uber","ola cab","auto","taxi","rapido","cab","metro","bus","rickshaw"], category:"Taxi / Auto" },
  { keywords:["petrol","diesel","fuel","cng","hp","bharat","shell","car wash"], category:"Transport & Fuel" },
  { keywords:["electricity","water bill","gas cylinder","gas","cylinder","bescom","power","ebill","maintenance bill","society"], category:"Utilities (Electricity/Water/Gas)" },
  { keywords:["maid","cook","driver","helper","bai","servant","househelp"], category:"Household Help (Maid/Cook/Driver)" },
  { keywords:["gym","fitness","cult","yoga","workout","zumba"], category:"Gym" },
  { keywords:["cloth","shirt","dress","shoes","trouser","saree","kurti","jeans","kurta","top wear","footwear","dress slip","frock","t-shirt","tshirt","skirt","jacket","sweater","blouse","salwar","churidar","clothing","apparel","myntra"], category:"Shopping & Clothing" },
  { keywords:["soap","shampoo","toothpaste","toothbrush","cleaning","detergent","harpic","tissue","tissue paper","sanitizer","sanitary","pads","pad","napkin","whisper","stayfree","kotex","tampons","feminine","dettol","lizol","body wash","deo","protein powder","hair band","bathroom cleaning","dishwash","dish wash","dishwashing","vim","surf","ariel","phenyl","mop","scrub","brush","conditioner","face wash","hand wash","cotton","floor cleaner","toilet cleaner"], category:"Toiletries & Cleaning Supplies" },
  { keywords:["laundry","dry clean","ironing","press","dhobi","clothes wash","curtain wash","curtain"], category:"Laundry" },
  { keywords:["garden","plant","nursery","seeds","pot","flower","fertilizer"], category:"Gardening" },
  { keywords:["gift","birthday","wedding","anniversary","present","compensation","advance towards"], category:"Gifts" },
  { keywords:["movie","cinema","pvr","inox","bookmyshow","theatre","concert","show","multiplex","amusement","zoo","park","movie ticket","event ticket","entertainment"], category:"Entertainment" },
  { keywords:["parlor","parlour","salon","haircut","waxing","beauty","makeup","moisturizer","perfume","slippers","spa treatment","spa visit"], category:"Personal Care & Grooming" },
  { keywords:["tour","sightseeing"], category:"Travel & Holidays" },
  { keywords:["jewellery","jewelry","gold","silver","diamond","ornament"], category:"Jewellery & Valuables" },
  { keywords:["affidavit","khata","notary","stamp paper","registration","legal fee"], category:"Legal & Documentation" },
  { keywords:["household item","household organiser","home appliance","switch cover","temple donation","ganesha","craft item","play area","mulla maala"], category:"Household & Misc" },
];

function autoCategory(description) {
  if (!description) return "Miscellaneous";
  const d = description.toLowerCase();
  for (const rule of KEYWORD_MAP) {
    if (rule.keywords.some(k => d.includes(k))) return rule.category;
  }
  return "Miscellaneous";
}

// ============================================================
// VENDOR / PLATFORM TRACKING
// ============================================================
const VENDORS = ["Amazon","Flipkart","Myntra","BigBasket","Zepto","Blinkit","Instamart","Firstclub","Akshayakalpa","Swiggy/Zomato","DMart","Direct/Shop","Cash/Other"];
// Vendors that work like a wallet: a voucher/wallet load is a transfer, orders are logged separately
const WALLET_VENDORS = ["BigBasket","Zepto","Blinkit","Instamart","Firstclub","Akshayakalpa"];
// Vendors whose orders default to Groceries when the item itself isn't recognised
const GROCERY_VENDORS = ["BigBasket","Zepto","Blinkit","Instamart","Firstclub","DMart"];
const VENDOR_KEYWORDS = [
  { keywords:["instamart"], vendor:"Instamart" },
  { keywords:["amazon"], vendor:"Amazon" }, { keywords:["flipkart"], vendor:"Flipkart" },
  { keywords:["myntra"], vendor:"Myntra" }, { keywords:["bigbasket","big basket","bbnow","bbdaily","bb daily"], vendor:"BigBasket" },
  { keywords:["zepto"], vendor:"Zepto" }, { keywords:["blinkit"], vendor:"Blinkit" },
  { keywords:["firstclub","first club"], vendor:"Firstclub" },
  { keywords:["akshayakalpa","akshaya kalpa"], vendor:"Akshayakalpa" },
  { keywords:["swiggy","zomato"], vendor:"Swiggy/Zomato" }, { keywords:["dmart","d mart"], vendor:"DMart" },
];
function autoVendor(description) {
  if (!description) return "";
  const d = description.toLowerCase();
  for (const rule of VENDOR_KEYWORDS) { if (rule.keywords.some(k => d.includes(k))) return rule.vendor; }
  return "";
}
const LOAD_WORDS = ["voucher","wallet","recharge","rexharge","top up","top-up","topup","gift card","load"];
function isLoadEntry(description, vendor, source) {
  if (!description) return false;
  const d = description.toLowerCase();
  if (!LOAD_WORDS.some(w => d.includes(w))) return false;
  if (!WALLET_VENDORS.includes(vendor)) return false;
  if (WALLET_ACCOUNTS.includes(source)) return false;   // paid FROM a wallet = a real order, not a load
  return true;
}
// Platform names are stripped so the ITEM decides the category ("zepto pencils" -> school, not groceries)
const PLATFORM_WORDS = ["swiggy instamart","instamart","zepto","blinkit","bigbasket","big basket","bbnow","firstclub","first club","dmart","d mart","amazon","flipkart"];
function categorize(description, vendor, source) {
  if (isLoadEntry(description, vendor, source)) return LOAD_CAT;
  let d = (description || "").toLowerCase();
  if (vendor && vendor !== "Swiggy/Zomato" && vendor !== "Myntra") PLATFORM_WORDS.forEach(w => { d = d.split(w).join(" "); });
  else if (vendor === "Swiggy/Zomato") { /* keep: food apps are Restaurants */ }
  const cat = autoCategory(d.trim() ? d : description);
  if (cat === "Miscellaneous" && GROCERY_VENDORS.includes(vendor)) return "Groceries & Vegetables";
  return cat;
}

// ============================================================
// SUPABASE DATA LAYER — replaces Google Sheets
// ============================================================
async function dbInsert(row) {
  const payload = {
    amount:    row.amount,
    description: row.description,
    category:  row.category,
    account:   row.source,
    date:      row.date || new Date().toISOString(),
    entered_by: row.enteredBy,
    month:     row.month,
    year:      row.year,
    day:       row.day,
    note:      row.note || row.description,
    vendor:    row.vendor || null,
  };
  try {
    const { data, error } = await sb.from("expenses").insert([payload]).select();
    if (error) throw error;
    return data && data[0] ? String(data[0].id) : null;
  } catch (firstErr) {
    // The insert may have actually succeeded even though this request errored
    // (e.g. a network hiccup on the response). Check for a matching row before
    // treating this as a real failure, so we don't show a false "save failed".
    try {
      const { data: check } = await sb.from("expenses").select("id")
        .eq("amount", payload.amount)
        .eq("description", payload.description)
        .eq("date", payload.date)
        .eq("entered_by", payload.entered_by)
        .order("id", { ascending: false })
        .limit(1);
      if (check && check[0]) return String(check[0].id);
    } catch (checkErr) { /* fall through to original error */ }
    throw firstErr;
  }
}

async function dbFetch(month, year) {
  const { data, error } = await sb
    .from("expenses")
    .select("*")
    .eq("month", month)
    .eq("year", String(year))
    .order("date", { ascending: true });
  if (error) throw error;
  // Normalize to same shape as before so existing logic still works
  return (data || []).map(r => ({
    id:          String(r.id),
    month:       r.month,
    year:        r.year,
    day:         r.day || new Date(r.date).getDate(),
    note:        r.note || r.description || "",
    description: r.description || "",
    category:    r.category || "Miscellaneous",
    source:      r.account || "",
    amount:      parseFloat(r.amount) || 0,
    enteredBy:   r.entered_by || "",
    timestamp:   new Date(r.date).getTime(),
    date:        r.date,
    vendor:      r.vendor || "",
  }));
}

async function dbDelete(id) {
  const numId = Number(id);
  if (!id || isNaN(numId)) {
    // Entry was never successfully saved to Supabase (still has a temporary local id) - nothing to delete server-side
    return;
  }
  const { error } = await sb.from("expenses").delete().eq("id", numId);
  if (error) throw error;
}

async function dbUpdate(id, changes) {
  const numId = Number(id);
  if (!id || isNaN(numId)) {
    throw new Error("This entry is still saving — please wait a moment and try editing again.");
  }
  const { error } = await sb.from("expenses").update({
    amount:      changes.amount,
    description: changes.description,
    category:    changes.category,
    account:     changes.source,
    note:        changes.note || changes.description,
    vendor:      changes.vendor || null,
  }).eq("id", numId);
  if (error) throw error;
}

async function dbFetchRange(from, to) {
  const { data, error } = await sb
    .from("expenses")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: String(r.id), amount: parseFloat(r.amount)||0,
    description: r.description||"", category: r.category||"Miscellaneous",
    source: r.account||"", date: r.date, enteredBy: r.entered_by||"", vendor: r.vendor||"",
  }));
}

// Supabase returns at most 1000 rows per request, so read in pages
async function dbFetchAllPages(build) {
  const out=[]; const size=1000;
  for (let from=0; from<50000; from+=size) {
    const { data, error } = await build().order("id",{ascending:true}).range(from, from+size-1);
    if (error) throw error;
    out.push(...(data||[]));
    if (!data || data.length<size) break;
  }
  return out;
}
// All-time rows that have a vendor — used for voucher balances
async function dbFetchVendorRows() {
  const data = await dbFetchAllPages(()=>sb.from("expenses").select("id,amount,category,account,vendor").not("vendor","is",null));
  return data.map(r=>({ amount: parseFloat(r.amount)||0, category: r.category||"", source: r.account||"", vendor: r.vendor||"" }));
}
// Everything from TRACKING_START onwards — used for "Money in hand"
async function dbFetchSince(fromDate) {
  const data = await dbFetchAllPages(()=>sb.from("expenses").select("id,amount,category,account").gte("date", fromDate+"T00:00:00"));
  return data.map(r=>({ amount: parseFloat(r.amount)||0, category: r.category||"", source: r.account||"" }));
}

// Reports: rows by the DAY you picked (year/month/day), not by the time the entry was typed
async function dbFetchByDayRange(fromISO, toISO) {
  const y1 = +fromISO.slice(0,4), y2 = +toISO.slice(0,4);
  const years = []; for (let y=y1; y<=y2; y++) years.push(String(y));
  const data = await dbFetchAllPages(()=>sb.from("expenses").select("*").in("year", years));
  const out = [];
  for (const r of data) {
    const mi = MONTHS.indexOf(r.month); if (mi<0) continue;
    const day = r.day || new Date(r.date).getDate();
    const key = r.year+"-"+String(mi+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
    if (key < fromISO || key > toISO) continue;
    out.push({ id:String(r.id), dateKey:key, monthIdx:mi, year:+r.year, day, amount:parseFloat(r.amount)||0,
      description:r.description||"", category:r.category||"Miscellaneous", source:r.account||"", vendor:r.vendor||"", enteredBy:r.entered_by||"" });
  }
  return out.sort((a,b)=>a.dateKey<b.dateKey?-1:a.dateKey>b.dateKey?1:Number(a.id)-Number(b.id));
}
function toISODate(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function csvCell(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }

async function dbFetchBudgets() {
  const { data } = await sb.from("budgets").select("*");
  const out = {};
  (data||[]).forEach(r => { out[r.category] = r.amount; });
  return out;
}

async function dbSaveBudgets(budgets) {
  for (const [category, amount] of Object.entries(budgets)) {
    if (!amount) continue;
    await sb.from("budgets").upsert({ category, amount: parseFloat(amount)||0 }, { onConflict:"category" });
  }
}

// ============================================================
// HELPERS
// ============================================================
function fmt(n){ if(!n||n===0)return"—"; return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0}); }
function fmtN(n){ return Number(n).toLocaleString("en-IN",{maximumFractionDigits:0}); }

const {useState,useEffect,useMemo,useRef} = React;
const e = React.createElement;

// ============================================================
// LOGIN SCREEN — unchanged
// ============================================================
function LoginScreen({onLogin}) {
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function doLogin() {
    const u = USERS.find(u=>u.pin===pin);
    if (!u) { setError("Wrong PIN."); setPin(""); return; }
    setLoading(true);
    try {
      // Test Supabase connection
      await sb.from("expenses").select("id").limit(1);
      onLogin(u);
    } catch(err) {
      setError("Cannot connect to Supabase. Check credentials.");
      setLoading(false);
    }
  }

  return e("div",{style:{minHeight:"100vh",background:"linear-gradient(135deg,#1F4E79,#2E75C2)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}},
    e("div",{style:{background:"#fff",borderRadius:20,padding:32,width:"100%",maxWidth:340,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}},
      e("div",{style:{textAlign:"center",marginBottom:28}},
        e("div",{style:{fontSize:44,marginBottom:8}},"🏡"),
        e("div",{style:{fontSize:22,fontWeight:800,color:"#1F4E79"}},"SmartExpense"),
        e("div",{style:{fontSize:12,color:"#6b7280",marginTop:4}},"Home Finance Manager")
      ),
      e("div",{style:{fontSize:13,fontWeight:600,color:"#374151",marginBottom:8}},"Enter your PIN"),
      e("input",{type:"password",inputMode:"numeric",maxLength:6,value:pin,
        onChange:ev=>{setPin(ev.target.value);setError("");},
        onKeyDown:ev=>ev.key==="Enter"&&doLogin(),placeholder:"••••",
        style:{width:"100%",padding:"12px 16px",fontSize:22,textAlign:"center",letterSpacing:8,border:"2px solid #e5e7eb",borderRadius:10,outline:"none",marginBottom:8,boxSizing:"border-box"}}),
      error&&e("div",{style:{fontSize:11,color:"#dc2626",textAlign:"center",marginBottom:8}},error),
      e("button",{onClick:doLogin,disabled:loading,
        style:{width:"100%",padding:12,background:"#1F4E79",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:20}},
        loading?"Connecting…":"Login →"),
      e("div",{style:{padding:12,background:"#f0f9ff",borderRadius:8,fontSize:12,color:"#1e40af",textAlign:"center",lineHeight:2}},
        e("strong",null,"Uma"),": 1111  |  ",e("strong",null,"Sreekanth"),": 2222"
      )
    )
  );
}

// ============================================================
// EDIT ROW MODAL
// ============================================================
function EditModal({row, onSave, onCancel}) {
  const [amt,setAmt]   = useState(String(row.amount));
  const [desc,setDesc] = useState(row.description || row.note || "");
  const [cat,setCat]   = useState(row.category);
  const [src,setSrc]   = useState(row.source);
  const [ven,setVen]   = useState(row.vendor || "");
  const [saving,setSaving] = useState(false);
  const isInc = row.category === INCOME_CAT;

  async function handleSave() {
    if (!amt || parseFloat(amt)<=0) return;
    setSaving(true);
    await onSave(row.id, { amount:parseFloat(amt), description:desc, category:cat, source:src, vendor:ven, note:desc });
  }

  const overlay = {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
  const box = {background:"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"};
  const inp = {width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",marginTop:4};

  return e("div",{style:overlay},
    e("div",{style:box},
      e("div",{style:{fontSize:14,fontWeight:800,color:"#1F4E79",marginBottom:16}},"✏️ Edit Entry"),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151"}},"₹ Amount"),
      e("input",{type:"number",value:amt,onChange:ev=>setAmt(ev.target.value),style:inp}),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginTop:10}},"📝 Description"),
      e("input",{type:"text",value:desc,onChange:ev=>{const v=ev.target.value;setDesc(v);const av=autoVendor(v)||ven;if(autoVendor(v))setVen(av);if(!isInc)setCat(categorize(v,av,src));},style:inp}),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginTop:10}},"🏷️ Category (auto-detected, editable)"),
      e("select",{value:cat,onChange:ev=>setCat(ev.target.value),style:{...inp}},ALL_CATEGORIES.map(c=>e("option",{key:c,value:c},ICONS[c]+" "+c))),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginTop:10}},"🛍️ Vendor / App (optional)"),
      e("select",{value:ven,onChange:ev=>{setVen(ev.target.value);if(!isInc)setCat(categorize(desc,ev.target.value,src));},style:{...inp}},[e("option",{key:"none",value:""},"— none —"),...VENDORS.map(v=>e("option",{key:v,value:v},v))]),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginTop:10}},"💳 Account"),
      e("select",{value:src,onChange:ev=>{setSrc(ev.target.value);if(!isInc)setCat(categorize(desc,ven,ev.target.value));},style:{...inp}},SOURCES.map(s=>e("option",{key:s.label,value:s.label},s.label))),
      e("div",{style:{display:"flex",gap:10,marginTop:16}},
        e("button",{onClick:onCancel,style:{flex:1,padding:10,background:"#f3f4f6",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer"}},"Cancel"),
        e("button",{onClick:handleSave,disabled:saving,style:{flex:2,padding:10,background:"#1F4E79",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}},saving?"Saving…":"Save Changes")
      )
    )
  );
}

// ============================================================
// MAIN APP
// ============================================================
function MainApp({user,onLogout}) {
  const now = new Date();
  const [tab,setTab]           = useState("entry");
  const [month,setMonth]       = useState(MONTHS[now.getMonth()]);
  const [year,setYear]         = useState(now.getFullYear());
  const [activeDay,setActiveDay] = useState(now.getDate());
  useEffect(()=>{
    const n=new Date();
    if(month===MONTHS[n.getMonth()]&&year===n.getFullYear()) setActiveDay(n.getDate());
    else setActiveDay(1);
  },[month,year]);
  const [rows,setRows]         = useState([]);
  const [budgets,setBudgets]   = useState({});
  const [status,setStatus]     = useState("loading");
  const [syncStatus,setSyncStatus] = useState("saved");
  const [err,setErr]           = useState("");
  const [editRow,setEditRow]   = useState(null);

  // ── Quick entry form (only 3 fields)
  const [newAmt,setNewAmt]     = useState("");
  const [newDesc,setNewDesc]   = useState("");
  const [newSrc,setNewSrc]     = useState(() => localStorage.getItem("lastAccount") || SOURCES[0].label);
  const [detectedCat,setDetectedCat] = useState("Miscellaneous");
  const [newVendor,setNewVendor] = useState("");
  const [vendorTouched,setVendorTouched] = useState(false);
  const [entryMode,setEntryMode] = useState("expense");   // "expense" | "income"
  const [balRows,setBalRows] = useState([]);   // rows since TRACKING_START, for Money in hand
  // ── Reports tab
  const [repFrom,setRepFrom] = useState(()=>{const d=new Date();return toISODate(new Date(d.getFullYear(),d.getMonth(),1));});
  const [repTo,setRepTo]     = useState(()=>toISODate(new Date()));
  const [repCat,setRepCat]   = useState("");
  const [repAcc,setRepAcc]   = useState("");
  const [repVen,setRepVen]   = useState("");
  const [repType,setRepType] = useState("spend");     // spend | voucher | income
  const [repView,setRepView] = useState("summary");   // summary | raw
  const [repGroup,setRepGroup] = useState("category");// category | account | vendor | month
  const [repRowDim,setRepRowDim] = useState("category");  // two-way table: down the side
  const [repColDim,setRepColDim] = useState("account");   // two-way table: across the top
  const [repData,setRepData] = useState([]);
  const [repLoading,setRepLoading] = useState(false);
  const [vendorRows,setVendorRows] = useState([]);   // all-time rows with a vendor (for wallet balances)

  // ── Export/filter
  const [exportFrom,setExportFrom] = useState("");
  const [exportTo,setExportTo]     = useState("");
  const [exportRows,setExportRows] = useState([]);
  const [exporting,setExporting]   = useState(false);
  const [emailSending,setEmailSending] = useState(false);
  const [emailMsg,setEmailMsg] = useState("");

  // ── AI
  const [aiInsights,setAiInsights] = useState([]);
  const [aiLoading,setAiLoading]   = useState(false);

  const days = DIM[month]||30;
  const [rf,setRf] = useState(1);
  const [rt,setRt] = useState(days);
  useEffect(()=>{setRf(1);setRt(DIM[month]||30);},[month,year]);

  // Load data
  useEffect(()=>{
    setStatus("loading"); setRows([]); setErr("");
    Promise.all([dbFetch(month,year), dbFetchBudgets()])
      .then(([r,b])=>{ setRows(r); setBudgets(b); setStatus("ready"); })
      .catch(ex=>{ setErr("Failed to load: "+ex.message); setStatus("error"); });
  },[month,year]);

  // Update detected category when description changes
  useEffect(()=>{
    if(!vendorTouched){
      const v = autoVendor(newDesc) || ACCOUNT_VENDOR[newSrc] || "";
      setNewVendor(v);
    }
  },[newDesc,newSrc,vendorTouched]);
  useEffect(()=>{ setDetectedCat(categorize(newDesc,newVendor,newSrc)); },[newDesc,newVendor,newSrc]);

  // Wallet balances need all-time vendor rows; reload after every change
  const [walletTick,setWalletTick] = useState(0);
  useEffect(()=>{ dbFetchVendorRows().then(setVendorRows).catch(()=>{}); dbFetchSince(TRACKING_START).then(setBalRows).catch(()=>{}); },[walletTick]);

  function dayTotal(d){ return rows.filter(r=>r.day===d&&isSpend(r)).reduce((s,r)=>s+(r.amount||0),0); }
  const dayRows = useMemo(()=>rows.filter(r=>r.day===activeDay).sort((a,b)=>a.timestamp-b.timestamp),[rows,activeDay]);

  // ── ADD ENTRY (3 fields only, category auto-detected)
  async function handleAdd() {
    const amt = parseFloat(newAmt);
    if (!amt||amt<=0||!newDesc.trim()) return;
    const isInc = entryMode==="income";
    const category = isInc ? INCOME_CAT : categorize(newDesc,newVendor,newSrc);
    const tempId = "temp_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const row = {
      id: tempId,
      month, year:String(year), day:activeDay,
      note: newDesc.trim(), description: newDesc.trim(),
      category, source: newSrc, vendor: isInc ? "" : newVendor,
      amount: amt, enteredBy: user.name,
      timestamp: Date.now(), date: new Date().toISOString(),
    };
    // Optimistic update with temporary id
    setRows(p=>[...p, row]);
    setNewAmt(""); setNewDesc(""); setNewVendor(""); setVendorTouched(false);
    localStorage.setItem("lastAccount", newSrc);
    setSyncStatus("saving");
    try {
      const realId = await dbInsert(row);
      if (realId) {
        // Replace the temporary id with the real Supabase id so delete/edit work correctly
        setRows(p=>p.map(r=>r.id===tempId ? {...r, id: realId} : r));
      }
      setSyncStatus("saved"); setWalletTick(t=>t+1);
    }
    catch(ex) { setErr("Save failed: "+ex.message); setSyncStatus("error"); setRows(p=>p.filter(r=>r.id!==tempId)); }
  }

  // ── DELETE
  async function handleDelete(row) {
    setRows(p=>p.filter(r=>r.id!==row.id));
    setSyncStatus("saving");
    try { await dbDelete(row.id); setSyncStatus("saved"); setWalletTick(t=>t+1); }
    catch(ex) { setErr("Delete failed: "+ex.message); setSyncStatus("error"); }
  }

  // ── EDIT SAVE
  async function handleEditSave(id, changes) {
    setRows(p=>p.map(r=>r.id===id?{...r,...changes,source:changes.source}:r));
    setEditRow(null); setSyncStatus("saving");
    try { await dbUpdate(id, changes); setSyncStatus("saved"); setWalletTick(t=>t+1); }
    catch(ex) { setErr("Update failed: "+ex.message); setSyncStatus("error"); }
  }

  // ── BUDGET
  async function handleBudgetBlur() {
    try { await dbSaveBudgets(budgets); } catch(ex) { setErr("Budget save failed."); }
  }

  // ── EXPORT CSV (date range from Supabase)
  async function handleSendEmail() {
    if (!exportFrom||!exportTo) { setEmailMsg("Please select From and To dates first."); return; }
    setEmailSending(true); setEmailMsg("");
    try {
      const data = await dbFetchRange(exportFrom+"T00:00:00", exportTo+"T23:59:59");
      if (data.length===0) { setEmailMsg("No data in this range."); setEmailSending(false); return; }
      const summaryRows = CATEGORIES.map(cat=>{
        const catAll = data.filter(r=>r.category===cat);
        if(catAll.length===0) return null;
        const catRows = catAll.filter(isSpend);
        const total = catRows.reduce((s,r)=>s+(r.amount||0),0);
        const viaVoucher = catAll.filter(isVoucherRow).reduce((s,r)=>s+(r.amount||0),0);
        const bySrc = {};
        SPEND_SOURCES.forEach(s=>{ bySrc[s.label]=catRows.filter(r=>r.source===s.label).reduce((a,r)=>a+(r.amount||0),0); });
        const budget = parseFloat(budgets[cat])||0;
        return [cat,...SPEND_SOURCES.map(s=>bySrc[s.label]||0),total,budget,budget>0?total-budget:"",viaVoucher].join(",");
      }).filter(Boolean);
      const summaryHeader = ["Category",...SPEND_SOURCES.map(s=>s.label),"Total","Budget","Variance","Paid from Voucher (not counted)"].join(",");
      const csvSummary = [summaryHeader,...summaryRows].join("\n");

      const rawRows = data.sort((a,b)=>new Date(a.date)-new Date(b.date))
        .map(r=>[r.date?.slice(0,10)||"",r.description||"",r.category,r.vendor||"",r.source,isSpend(r)?(r.amount||0):0,isVoucherRow(r)?(r.amount||0):0,isIncome(r)?(r.amount||0):0,rowType(r),r.enteredBy||""].join(","));
      const rawHeader = ["Date","Description","Category","Vendor","Account","Amount (counted)","Paid from Voucher (not counted)","Money Received","Type","Entered By"].join(",");
      const csvRaw = [rawHeader,...rawRows].join("\n");

      const grandTotal = data.filter(isSpend).reduce((s,r)=>s+(r.amount||0),0);
      await sendEmailReport(csvSummary, csvRaw, month, year, grandTotal);
      setEmailMsg("✅ Sent to "+REPORT_EMAILS.join(" & "));
    } catch(ex) {
      setEmailMsg("❌ Failed: "+(ex.text||ex.message||"Unknown error"));
    }
    setEmailSending(false);
  }

  async function handleExport(type) {
    if (!exportFrom||!exportTo) { alert("Please select From and To dates."); return; }
    setExporting(true);
    try {
      const data = await dbFetchRange(exportFrom+"T00:00:00", exportTo+"T23:59:59");
      setExportRows(data);
      if (data.length===0) { alert("No data in this range."); setExporting(false); return; }
      let csv, filename;
      if (type==="summary") {
        const summaryRows = CATEGORIES.map(cat=>{
          const catAll = data.filter(r=>r.category===cat);
          if(catAll.length===0) return null;
          const catRows = catAll.filter(isSpend);
          const total = catRows.reduce((s,r)=>s+(r.amount||0),0);
          const viaVoucher = catAll.filter(isVoucherRow).reduce((s,r)=>s+(r.amount||0),0);
          const bySrc = {};
          SPEND_SOURCES.forEach(s=>{ bySrc[s.label]=catRows.filter(r=>r.source===s.label).reduce((a,r)=>a+(r.amount||0),0); });
          const budget = parseFloat(budgets[cat])||0;
          return [cat,...SPEND_SOURCES.map(s=>bySrc[s.label]||0),total,budget,budget>0?total-budget:"",viaVoucher];
        }).filter(Boolean);
        const header = ["Category",...SPEND_SOURCES.map(s=>s.label),"Total","Budget","Variance","Paid from Voucher (not counted)"];
        csv = [header,...summaryRows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
        filename = `SmartExpense_Summary_${exportFrom}_to_${exportTo}.csv`;
      } else {
        const header = ["Date","Day","Description","Category","Vendor","Account","Amount (counted)","Paid from Voucher (not counted)","Money Received","Type","Entered By"];
        const drows = data.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(r=>[r.date?.slice(0,10)||"",new Date(r.date).getDate(),r.description||"",r.category,r.vendor||"",r.source,isSpend(r)?(r.amount||0):0,isVoucherRow(r)?(r.amount||0):0,isIncome(r)?(r.amount||0):0,rowType(r),r.enteredBy||""]);
        csv = [header,...drows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
        filename = `SmartExpense_Raw_${exportFrom}_to_${exportTo}.csv`;
      }
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);
      a.download = filename;
      a.click();
    } catch(ex) { setErr("Export failed: "+ex.message); }
    setExporting(false);
  }

  // ── CALCULATIONS (all existing logic preserved)
  const catT = useMemo(()=>{
    const fil = rows.filter(r=>r.day>=rf&&r.day<=rt&&isSpend(r));
    const out={};
    for(const cat of CATEGORIES){
      out[cat]={total:0,bySrc:{}};
      for(const{label}of SPEND_SOURCES){
        const s=fil.filter(r=>r.category===cat&&r.source===label).reduce((a,r)=>a+(r.amount||0),0);
        out[cat].bySrc[label]=s; out[cat].total+=s;
      }
    }
    return out;
  },[rows,rf,rt]);

  const srcT = useMemo(()=>{
    const out={};
    for(const{label}of SPEND_SOURCES) out[label]=CATEGORIES.reduce((s,c)=>s+(catT[c]?.bySrc[label]||0),0);
    return out;
  },[catT]);

  const grand      = useMemo(()=>Object.values(srcT).reduce((a,b)=>a+b,0),[srcT]);
  const totalBud   = useMemo(()=>Object.values(budgets).reduce((a,b)=>a+(parseFloat(b)||0),0),[budgets]);
  const rem        = totalBud>0?totalBud-grand:null;

  const fullT = useMemo(()=>{
    const out={};
    for(const cat of CATEGORIES){
      out[cat]={total:0,bySrc:{}};
      for(const{label}of SPEND_SOURCES){
        const s=rows.filter(r=>r.category===cat&&r.source===label).reduce((a,r)=>a+(r.amount||0),0);
        out[cat].bySrc[label]=s; out[cat].total+=s;
      }
    }
    return out;
  },[rows]);
  const fullGrand = useMemo(()=>CATEGORIES.reduce((s,c)=>s+(fullT[c]?.total||0),0),[fullT]);

  const vendorTotals = useMemo(()=>{
    const m={};
    rows.filter(r=>r.vendor).forEach(r=>{
      const v=m[r.vendor]=m[r.vendor]||{vendor:r.vendor,total:0,count:0,loaded:0,ordered:0};
      if(isSpend(r)){ v.total+=r.amount||0; v.count++; if(r.category===LOAD_CAT) v.loaded+=r.amount||0; }
      else v.ordered+=r.amount||0;
    });
    return Object.values(m).filter(v=>v.total>0||v.ordered>0).sort((a,b)=>b.total-a.total||b.ordered-a.ordered);
  },[rows]);

  // Reports load automatically whenever the dates change
  useEffect(()=>{
    if(tab!=="reports"||!repFrom||!repTo||repFrom>repTo) return;
    let alive=true; setRepLoading(true);
    dbFetchByDayRange(repFrom,repTo).then(d=>{ if(alive){ setRepData(d); setRepLoading(false); } })
      .catch(ex=>{ if(alive){ setErr("Report failed: "+ex.message); setRepLoading(false); } });
    return ()=>{ alive=false; };
  },[tab,repFrom,repTo,walletTick]);

  function repPreset(k){
    const t=new Date(), y=t.getFullYear(), m=t.getMonth();
    let f,to=new Date(t);
    if(k==="month"){ f=new Date(y,m,1); }
    else if(k==="last"){ f=new Date(y,m-1,1); to=new Date(y,m,0); }
    else if(k==="3m"){ f=new Date(y,m-2,1); }
    else if(k==="fy"){ f=new Date(m>=3?y:y-1,3,1); }
    else { f=new Date(y,0,1); }
    setRepFrom(toISODate(f)); setRepTo(toISODate(to));
  }

  const repRows = useMemo(()=>repData.filter(r=>{
    if(repType==="spend"&&!isSpend(r)) return false;
    if(repType==="voucher"&&!isVoucherRow(r)) return false;
    if(repType==="income"&&!isIncome(r)) return false;
    if(repCat&&r.category!==repCat) return false;
    if(repAcc&&r.source!==repAcc) return false;
    if(repVen==="__none"){ if(r.vendor) return false; } else if(repVen&&r.vendor!==repVen) return false;
    return true;
  }),[repData,repType,repCat,repAcc,repVen]);
  const repTotal = useMemo(()=>repRows.reduce((a,r)=>a+r.amount,0),[repRows]);
  const repGroups = useMemo(()=>{
    const m={};
    repRows.forEach(r=>{
      const k = repGroup==="category"?r.category : repGroup==="account"?(r.source||"—") : repGroup==="vendor"?(r.vendor||"(no vendor)") : MONTHS[r.monthIdx].slice(0,3)+" "+r.year;
      const sortKey = repGroup==="month" ? r.year*100+r.monthIdx : 0;
      const g=m[k]=m[k]||{key:k,total:0,count:0,sortKey}; g.total+=r.amount; g.count++;
    });
    const arr=Object.values(m);
    return repGroup==="month" ? arr.sort((a,b)=>a.sortKey-b.sortKey) : arr.sort((a,b)=>b.total-a.total);
  },[repRows,repGroup]);
  const DIM_LABEL = {category:"Category",account:"Bank/Card",vendor:"Vendor",month:"Month"};
  function dimKey(r,dim){ return dim==="category"?r.category : dim==="account"?(r.source||"—") : dim==="vendor"?(r.vendor||"(no vendor)") : MONTHS[r.monthIdx].slice(0,3)+" "+r.year; }
  const repPivot = useMemo(()=>{
    const cells={}, rowT={}, colT={}, rowSort={}, colSort={};
    repRows.forEach(r=>{
      const rk=dimKey(r,repRowDim), ck=dimKey(r,repColDim);
      cells[rk]=cells[rk]||{}; cells[rk][ck]=(cells[rk][ck]||0)+r.amount;
      rowT[rk]=(rowT[rk]||0)+r.amount; colT[ck]=(colT[ck]||0)+r.amount;
      rowSort[rk]=r.year*100+r.monthIdx; colSort[ck]=r.year*100+r.monthIdx;
    });
    const order=(totals,sort,dim)=>Object.keys(totals).sort((a,b)=>dim==="month"?sort[a]-sort[b]:totals[b]-totals[a]);
    const rowKeys=order(rowT,rowSort,repRowDim), colKeys=order(colT,colSort,repColDim);
    let max=0; rowKeys.forEach(rk=>colKeys.forEach(ck=>{ max=Math.max(max,cells[rk]?.[ck]||0); }));
    return {cells,rowT,colT,rowKeys,colKeys,max};
  },[repRows,repRowDim,repColDim]);
  function repLabel(){ return repFrom.split("-").reverse().join("-")+" to "+repTo.split("-").reverse().join("-"); }
  function repCsv(){
    const typeName = {spend:"Counted spend",voucher:"Paid from voucher (not counted)",income:"Money received"}[repType];
    if(repView==="raw"){
      const header=["Date","Description","Category","Vendor","Account","Amount","Type","Entered By"];
      const body=repRows.map(r=>[r.dateKey,r.description,r.category,r.vendor,r.source,r.amount,rowType(r),r.enteredBy]);
      return [header,...body,["","","","","","TOTAL "+repTotal,"",""]];
    }
    if(repView==="table"){
      const P=repPivot;
      return [[DIM_LABEL[repRowDim]+" \\ "+DIM_LABEL[repColDim],...P.colKeys,"Total"],
        ...P.rowKeys.map(rk=>[rk,...P.colKeys.map(ck=>P.cells[rk]?.[ck]||0),P.rowT[rk]]),
        ["TOTAL",...P.colKeys.map(ck=>P.colT[ck]),repTotal]];
    }
    const gl={category:"Category",account:"Account",vendor:"Vendor",month:"Month"}[repGroup];
    return [[gl,"Entries","Total","% of total"],...repGroups.map(g=>[g.key,g.count,g.total,repTotal>0?(g.total/repTotal*100).toFixed(1)+"%":""]),["TOTAL ("+typeName+")",repRows.length,repTotal,""]];
  }
  function repDownload(){
    const csv=repCsv().map(r=>r.map(csvCell).join(",")).join("\r\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);
    a.download="SmartExpense_Report_"+repFrom+"_to_"+repTo+".csv";
    a.click();
  }
  // Money in hand = money received − spending, from TRACKING_START onwards
  const moneyInHand = useMemo(()=>{
    const received = balRows.filter(isIncome).reduce((a,r)=>a+r.amount,0);
    const spent = balRows.filter(isSpend).reduce((a,r)=>a+r.amount,0);
    return { received, spent, balance: received-spent };
  },[balRows]);
  const receivedThisMonth = useMemo(()=>rows.filter(isIncome).reduce((a,r)=>a+(r.amount||0),0),[rows]);

  // Orders paid from voucher balances this month (info only)
  const voucherRows = useMemo(()=>rows.filter(isVoucherRow),[rows]);
  const voucherByCat = useMemo(()=>{
    const m={}; voucherRows.forEach(r=>{ m[r.category]=(m[r.category]||0)+(r.amount||0); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[voucherRows]);
  const voucherByVendor = useMemo(()=>{
    const m={}; voucherRows.forEach(r=>{ const k=r.vendor||ACCOUNT_VENDOR[r.source]||"Unspecified"; m[k]=(m[k]||0)+(r.amount||0); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[voucherRows]);
  const loadsThisMonth = useMemo(()=>rows.filter(r=>r.category===LOAD_CAT&&isSpend(r)).reduce((a,r)=>a+(r.amount||0),0),[rows]);
  const voucherSpentThisMonth = useMemo(()=>voucherRows.reduce((a,r)=>a+(r.amount||0),0),[voucherRows]);

  const walletBalances = useMemo(()=>{
    const m={};
    vendorRows.forEach(r=>{
      if(!WALLET_VENDORS.includes(r.vendor)) return;
      m[r.vendor]=m[r.vendor]||{vendor:r.vendor,loaded:0,used:0};
      if(r.category===LOAD_CAT && !WALLET_ACCOUNTS.includes(r.source)) m[r.vendor].loaded+=r.amount;
      else if(WALLET_ACCOUNTS.includes(r.source)) m[r.vendor].used+=r.amount;
    });
    return Object.values(m).filter(w=>w.loaded>0||w.used>0).map(w=>({...w,balance:w.loaded-w.used})).sort((a,b)=>b.loaded-a.loaded);
  },[vendorRows]);

  // ── INSIGHTS (existing logic preserved)
  const insights = useMemo(()=>{
    const ins=[];
    const top3=[...CATEGORIES].sort((a,b)=>(fullT[b]?.total||0)-(fullT[a]?.total||0)).filter(c=>fullT[c]?.total>0).slice(0,3);
    if(top3.length>0) ins.push({icon:"🔥",title:"Top 3",tag:"FOCUS",color:"#ef4444",body:top3.map((c,i)=>`${i+1}. ${c.split(" ")[0]} ${fmt(fullT[c]?.total)}`).join(" · ")});
    const over=CATEGORIES.filter(c=>{const b=parseFloat(budgets[c])||0;return b>0&&(fullT[c]?.total||0)>b;});
    if(over.length>0){const w=over[0];const ex=(fullT[w]?.total||0)-(parseFloat(budgets[w])||0);
      ins.push({icon:"⚠️",title:"Overspend Alert",tag:"PROBLEM",color:"#dc2626",body:`${ICONS[w]} ${w} over by ${fmt(ex)}.`});}
    if(totalBud>0){const pU=(fullGrand/totalBud*100).toFixed(0);const eP=(activeDay/days*100).toFixed(0);
      const st=pU>parseFloat(eP)+15?"OVER PACE":pU<parseFloat(eP)-15?"UNDER PACE":"ON TRACK";
      ins.push({icon:"📊",title:"Budget Pace",tag:st,color:st==="OVER PACE"?"#dc2626":st==="UNDER PACE"?"#16a34a":"#2563eb",body:`Used ${pU}% of budget with ${eP}% of month gone.`});}
    if(rem!==null&&rem<0&&over.length>0)
      ins.push({icon:"💡",title:"Action Needed",tag:"ACTION",color:"#7c3aed",body:`Cut ${over[0].split(" ")[0]} by ${fmt(Math.abs(rem))} to stay within budget.`});
    return ins;
  },[fullT,budgets,fullGrand,totalBud,rem,activeDay,days]);

  // ── AI INSIGHTS (existing)
  async function fetchAI() {
    if(fullGrand===0) return; setAiLoading(true);
    try {
      const summary=CATEGORIES.map(c=>({category:c,total:fullT[c]?.total||0,budget:parseFloat(budgets[c])||0})).filter(x=>x.total>0);
      const prompt=`Finance advisor for Indian home. ${month} ${year}: ${JSON.stringify(summary)}. Total ₹${fmtN(fullGrand)}, Budget ${totalBud>0?"₹"+fmtN(totalBud):"Not set"}, Day ${activeDay}/${days}. Give 3 insights. JSON ONLY: {"insights":[{"icon":"emoji","title":"title","tag":"SAVE|ALERT|TIP","color":"#hex","body":"2 sentences with ₹"}]}`;
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const text=data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      setAiInsights(parsed.insights||[]);
    } catch { setAiInsights([{icon:"⚠️",title:"Unavailable",tag:"INFO",color:"#9ca3af",body:"AI insights unavailable."}]); }
    setAiLoading(false);
  }

  const syncCol = syncStatus==="saved"?"#4ade80":syncStatus==="saving"?"#fbbf24":"#f87171";
  const syncLbl = syncStatus==="saved"?"Synced ✓":syncStatus==="saving"?"Saving…":"Error";

  if(status==="loading") return e("div",{style:{minHeight:"100vh",background:"linear-gradient(135deg,#1F4E79,#2E75C2)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:"#fff"}},e("div",{style:{fontSize:36}},"🏡"),e("div",null,"Loading from Supabase…"));
  if(status==="error")   return e("div",{style:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}},e("div",{style:{background:"#fff",borderRadius:14,padding:24,maxWidth:360,textAlign:"center"}},e("div",{style:{fontSize:36,marginBottom:12}},"⚠️"),e("div",{style:{color:"#dc2626",fontWeight:700,marginBottom:8}},"Connection Error"),e("div",{style:{fontSize:12,color:"#6b7280",marginBottom:16}},err),e("button",{onClick:()=>window.location.reload(),style:{padding:"10px 20px",background:"#1F4E79",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}},"Retry")));

  return e("div",{style:{minHeight:"100vh",background:"#f0f4f8",fontFamily:"system-ui,sans-serif",fontSize:13}},

    editRow && e(EditModal,{row:editRow, onSave:handleEditSave, onCancel:()=>setEditRow(null)}),

    // NAV
    e("div",{style:{background:"linear-gradient(135deg,#1F4E79,#2E75C2)",boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}},
      e("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px 4px",flexWrap:"wrap",gap:4}},
        e("div",{style:{display:"flex",alignItems:"center",gap:9}},
          e("span",{style:{fontSize:20}},"🏡"),
          e("div",null,
            e("div",{style:{fontSize:14,fontWeight:800,color:"#fff"}},"SmartExpense"),
            e("div",{style:{fontSize:9,color:"rgba(255,255,255,0.6)"}},"Hi "+user.name+" "+(user.role==="admin"?"👑":"👤")+" · Supabase ✓")
          )
        ),
        e("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
          e("div",{style:{display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.12)",borderRadius:20,padding:"3px 9px"}},
            e("div",{style:{width:6,height:6,borderRadius:"50%",background:syncCol}}),
            e("span",{style:{fontSize:9,color:"#fff"}},syncLbl)
          ),
          e("select",{value:month,onChange:ev=>setMonth(ev.target.value),style:{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:7,padding:"3px 5px",fontSize:11}},MONTHS.map(m=>e("option",{key:m,value:m},m))),
          e("select",{value:year,onChange:ev=>setYear(+ev.target.value),style:{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:7,padding:"3px 5px",fontSize:11}},[2024,2025,2026,2027].map(y=>e("option",{key:y,value:y},y))),
          e("button",{onClick:onLogout,style:{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer"}},"Logout")
        )
      ),
      e("div",{style:{display:"flex",gap:1,padding:"0 8px",overflowX:"auto",WebkitOverflowScrolling:"touch"}},
        ["entry","dashboard","vouchers","summary","reports","export","budget"].map(t=>e("button",{key:t,onClick:()=>setTab(t),style:{padding:"7px 11px",borderRadius:"7px 7px 0 0",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",background:tab===t?"#f0f4f8":"transparent",color:tab===t?"#1F4E79":"rgba(255,255,255,0.7)"}},{"entry":"📝 Entry","dashboard":"🎯 Dashboard","vouchers":"🎟️ Vouchers","summary":"📊 Summary","reports":"📈 Reports","export":"📥 Export","budget":"🎯 Budget"}[t]))
      )
    ),

    err&&e("div",{style:{background:"#fee2e2",padding:"8px 14px",fontSize:11,color:"#dc2626",textAlign:"center",display:"flex",justifyContent:"space-between"}},e("span",null,err),e("button",{onClick:()=>setErr(""),style:{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontWeight:700}},"✕")),

    e("div",{style:{maxWidth:"100%",width:"100%",padding:"10px 10px",overflowX:"hidden"}},

      // ── ENTRY TAB ──
      tab==="entry"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},

        // Money in hand (shows once money received has been logged)
        moneyInHand.received>0&&e("div",{style:{background:moneyInHand.balance>=0?"#f0fdf4":"#fef2f2",border:"1px solid "+(moneyInHand.balance>=0?"#bbf7d0":"#fecaca"),borderRadius:12,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
          e("div",null,e("div",{style:{fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.4px"}},"💰 Money in hand"),e("div",{style:{fontSize:10,color:"#6b7280"}},"Received "+fmt(moneyInHand.received)+" · Spent "+fmt(moneyInHand.spent))),
          e("div",{style:{fontSize:20,fontWeight:900,color:moneyInHand.balance>=0?"#16a34a":"#dc2626"}},(moneyInHand.balance<0?"-":"")+"₹"+fmtN(Math.abs(moneyInHand.balance)))
        ),

        // Day picker
        e("div",{style:{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:11,fontWeight:700,color:"#1F4E79",marginBottom:8}},"Select Day — "+month+" "+year),
          e("div",{style:{display:"flex",flexWrap:"wrap",gap:3,width:"100%"}},
            Array.from({length:days},(_,i)=>i+1).map(d=>{
              const dt=dayTotal(d),isA=d===activeDay;
              const todayDate=new Date();
              const isFuture=new Date(year,MONTHS.indexOf(month),d)>new Date(todayDate.getFullYear(),todayDate.getMonth(),todayDate.getDate());
              return e("button",{key:d,onClick:()=>!isFuture&&setActiveDay(d),style:{width:28,height:28,borderRadius:6,border:isA?"2px solid #1F4E79":"1px solid #dde3ed",background:isA?"#1F4E79":dt>0?"#dbeafe":isFuture?"#f3f4f6":"#fff",color:isA?"#fff":dt>0?"#1F4E79":isFuture?"#d1d5db":"#666",fontSize:11,fontWeight:isA||dt>0?700:400,cursor:isFuture?"not-allowed":"pointer",position:"relative"}},
                d,dt>0&&!isA&&e("div",{style:{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:"#2E75C2"}})
              );
            })
          ),
          e("div",{style:{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}},
            e("span",{style:{color:"#6b7280"}},"Day "+activeDay+" · "+user.name),
            e("span",{style:{fontWeight:700,color:"#1F4E79"}},fmt(dayTotal(activeDay)))
          )
        ),

        // ── 3-FIELD QUICK ENTRY FORM
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{display:"flex",gap:6,marginBottom:12}},
            [["expense","💸 Expense"],["income","💰 Money Received"]].map(([k,l])=>e("button",{key:k,onClick:()=>setEntryMode(k),style:{flex:1,padding:"8px 6px",borderRadius:8,border:entryMode===k?"2px solid "+(k==="income"?"#16a34a":"#1F4E79"):"1px solid #e5e7eb",background:entryMode===k?(k==="income"?"#f0fdf4":"#eff6ff"):"#fff",color:entryMode===k?(k==="income"?"#166534":"#1F4E79"):"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer"}},l))
          ),
          e("div",{style:{fontSize:12,fontWeight:700,color:"#1F4E79",marginBottom:14}},(entryMode==="income"?"+ Money received — Day ":"+ Add — Day ")+activeDay),

          // Amount — first and biggest
          e("div",{style:{marginBottom:12}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"₹ Amount"),
            e("input",{type:"number",min:"0",value:newAmt,onChange:ev=>setNewAmt(ev.target.value),
              onKeyDown:ev=>ev.key==="Enter"&&document.getElementById("desc-input").focus(),
              placeholder:"0",autoFocus:true,
              style:{width:"100%",padding:"11px 14px",border:"2px solid #e5e7eb",borderRadius:8,fontSize:16,outline:"none",textAlign:"right",fontWeight:700,color:"#1F4E79",boxSizing:"border-box"}})
          ),

          // Description
          e("div",{style:{marginBottom:12}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"📝 Description"),
            e("input",{id:"desc-input",type:"text",value:newDesc,
              onChange:ev=>setNewDesc(ev.target.value),
              onKeyDown:ev=>ev.key==="Enter"&&handleAdd(),
              placeholder:entryMode==="income"?"e.g. Monthly transfer from Sreekanth":"e.g. swiggy, school fees, milk, petrol…",
              style:{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,outline:"none",background:"#faf5ff",boxSizing:"border-box"}})
          ),

          // Auto-detected category badge
          entryMode==="expense"&&newDesc&&e("div",{style:{marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            e("span",{style:{fontSize:10,color:"#6b7280"}},"Auto category:"),
            e("span",{style:{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"#eff6ff",color:"#1F4E79"}},ICONS[detectedCat]+" "+detectedCat)
          ),

          // Vendor / app (auto-detected, can be changed)
          entryMode==="expense"&&e("div",{style:{marginBottom:12}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"🛍️ Vendor / App"+(newVendor&&!vendorTouched?" (auto)":"")),
            e("select",{value:newVendor,onChange:ev=>{setNewVendor(ev.target.value);setVendorTouched(true);},
              style:{width:"100%",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}},
              [e("option",{key:"none",value:""},"— none —"),...VENDORS.map(v=>e("option",{key:v,value:v},v))])
          ),
          entryMode==="expense"&&detectedCat===LOAD_CAT&&!WALLET_ACCOUNTS.includes(newSrc)&&e("div",{style:{marginBottom:12,fontSize:11,color:"#92400e",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"8px 10px",lineHeight:1.5}},
            "🎟️ Voucher / wallet purchase — counts in this month's spending. Log the orders you place from it later with account “Voucher Balance”."),
          entryMode==="expense"&&WALLET_ACCOUNTS.includes(newSrc)&&e("div",{style:{marginBottom:12,fontSize:11,color:"#065f46",background:"#ecfdf5",border:"1px solid #a7f3d0",borderRadius:8,padding:"8px 10px",lineHeight:1.5}},
            "✅ Paid from voucher balance — tracked by category and vendor, but NOT added to the monthly total (the voucher purchase already counted)."),

          // Account (default = last used)
          e("div",{style:{marginBottom:14}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},(entryMode==="income"?"🏦 Received into account":"💳 Account")),
            e("select",{value:newSrc,onChange:ev=>{setNewSrc(ev.target.value);localStorage.setItem("lastAccount",ev.target.value);},
              style:{width:"100%",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}},
              SOURCES.map(s=>e("option",{key:s.label,value:s.label},s.label)))
          ),

          e("button",{onClick:handleAdd,disabled:!newAmt||parseFloat(newAmt)<=0||!newDesc.trim(),
            style:{width:"100%",padding:12,background:newAmt&&parseFloat(newAmt)>0&&newDesc.trim()?"#1F4E79":"#d1d5db",color:"#fff",border:"none",borderRadius:9,fontSize:14,fontWeight:700,cursor:newAmt&&parseFloat(newAmt)>0&&newDesc.trim()?"pointer":"not-allowed"}},
            entryMode==="income"?"+ Add Money Received":"+ Add Entry")
        ),

        // Entries list for selected day
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:12,fontWeight:700,color:"#1F4E79",marginBottom:dayRows.length>0?10:0}},
            "Day "+activeDay+" Entries",
            dayRows.length>0&&e("span",{style:{marginLeft:8,fontSize:11,color:"#6b7280",fontWeight:400}},dayRows.length+" · "+fmt(dayTotal(activeDay))+(dayRows.some(isVoucherRow)?" (voucher spend excluded)":""))
          ),
          dayRows.length===0
            ?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic",textAlign:"center",padding:"16px 0"}},"No entries yet. Add above.")
            :dayRows.map(row=>{
              const src=SOURCES.find(s=>s.label===row.source);
              return e("div",{key:row.id,onClick:()=>setEditRow(row),style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f3f4f6",cursor:"pointer"}},
                e("div",{style:{flex:1,minWidth:0}},
                  e("div",{style:{fontSize:12,fontWeight:600,color:"#111",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},row.description||row.note||"—"),
                  e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
                    e("span",{style:{fontSize:10,padding:"1px 7px",borderRadius:20,background:isIncome(row)?"#fefce8":isVoucherRow(row)?"#ecfdf5":"#f0fdf4",color:isIncome(row)?"#854d0e":isVoucherRow(row)?"#065f46":"#166534",border:"1px solid "+(isIncome(row)?"#fde68a":isVoucherRow(row)?"#a7f3d0":"#bbf7d0")}},ICONS[row.category]+" "+row.category),
                    row.vendor&&e("span",{style:{fontSize:10,padding:"1px 7px",borderRadius:20,background:"#f5f3ff",color:"#5b21b6",border:"1px solid #ddd6fe"}},"🛍️ "+row.vendor),
                    e("span",{style:{fontSize:10,padding:"1px 7px",borderRadius:20,background:src?.light||"#f3f4f6",color:src?.color||"#666",fontWeight:600}},row.source),
                    e("span",{style:{fontSize:9,color:"#9ca3af"}},"tap to edit")
                  )
                ),
                e("div",{style:{fontSize:14,fontWeight:800,color:isIncome(row)?"#16a34a":isVoucherRow(row)?"#9ca3af":(src?.color||"#111"),minWidth:65,textAlign:"right"}},(isIncome(row)?"+":"")+"₹"+fmtN(row.amount)),
                e("button",{onClick:ev=>{ev.stopPropagation();handleDelete(row);},style:{background:"#fee2e2",border:"none",color:"#dc2626",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontWeight:700}},"✕")
              );
            })
        ),

      ),

      // ── DASHBOARD TAB ──
      tab==="dashboard"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{background:"linear-gradient(135deg,#1F4E79,#2E75C2)",borderRadius:14,padding:20,marginBottom:4,textAlign:"center"}},
          e("div",{style:{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}},"Total Spent — "+month+" "+year),
          e("div",{style:{fontSize:28,fontWeight:900,color:"#fff",marginBottom:4}},"₹"+fmtN(fullGrand)),
          e("div",{style:{fontSize:12,color:"rgba(255,255,255,0.65)"}},activeDay+" of "+days+" days tracked")
        ),
        moneyInHand.received>0&&e("div",{style:{background:"#fff",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 6px rgba(0,0,0,0.07)",borderLeft:"4px solid "+(moneyInHand.balance>=0?"#16a34a":"#dc2626")}},
          e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79"}},"💰 Money in hand"),
            e("div",{style:{fontSize:22,fontWeight:900,color:moneyInHand.balance>=0?"#16a34a":"#dc2626"}},(moneyInHand.balance<0?"-":"")+"₹"+fmtN(Math.abs(moneyInHand.balance)))),
          e("div",{style:{fontSize:11,color:"#6b7280",marginTop:6,lineHeight:1.6}},
            "Received since "+TRACKING_START.split("-").reverse().join("-")+": "+fmt(moneyInHand.received)+" · Spent: "+fmt(moneyInHand.spent)),
          receivedThisMonth>0&&e("div",{style:{fontSize:11,color:"#6b7280"}},"Received in "+month+": "+fmt(receivedThisMonth))
        ),
        e("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:4}},
          [{label:"Budget",val:totalBud>0?fmt(totalBud):"Not set",color:"#16a34a",icon:"🎯"},
           {label:rem!==null&&rem<0?"Over Budget":"Remaining",val:rem!==null?fmt(Math.abs(rem)):"—",color:rem===null?"#9ca3af":rem>=0?"#16a34a":"#dc2626",icon:rem!==null&&rem<0?"🚨":"✅"},
           {label:"Daily Avg",val:fmt(fullGrand/Math.max(1,activeDay)),color:"#7c3aed",icon:"📅"},
          ].map((k,i)=>e("div",{key:i,style:{background:"#fff",borderRadius:10,padding:"10px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",textAlign:"center"}},
            e("div",{style:{fontSize:16,marginBottom:3}},k.icon),
            e("div",{style:{fontSize:13,fontWeight:800,color:k.color}},k.val),
            e("div",{style:{fontSize:9,color:"#9ca3af",marginTop:2,textTransform:"uppercase",letterSpacing:"0.3px"}},k.label)
          ))
        ),

        e("div",null,
          e("div",{style:{fontSize:13,fontWeight:800,color:"#1F4E79",marginBottom:8}},"🔍 Smart Insights"),
          e("div",{style:{display:"flex",flexWrap:"wrap",gap:10}},
            insights.length>0?insights.map((ins,i)=>e("div",{key:i,style:{background:"#fff",borderRadius:12,padding:"12px 14px",border:"1.5px solid "+ins.color+"33",flex:"1 1 200px",minWidth:200}},
              e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},e("span",{style:{fontSize:11,fontWeight:700,color:"#374151"}},ins.icon+" "+ins.title),ins.tag&&e("span",{style:{fontSize:9,fontWeight:700,background:ins.color,color:"#fff",padding:"2px 7px",borderRadius:20}},ins.tag)),
              e("div",{style:{fontSize:12,color:"#1f2937",lineHeight:1.55}},ins.body)
            )):e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic",padding:12}},"Enter expenses to see insights.")
          )
        ),



        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:12}},"🏆 Top Categories"),
          fullGrand===0?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"No expenses yet."):
          [...CATEGORIES].sort((a,b)=>(fullT[b]?.total||0)-(fullT[a]?.total||0)).slice(0,6).map((cat,i)=>{
            const val=fullT[cat]?.total||0; if(!val)return null;
            const bud=parseFloat(budgets[cat])||0,over=bud>0&&val>bud;
            const mx=[...CATEGORIES].reduce((m,c)=>Math.max(m,fullT[c]?.total||0),1);
            return e("div",{key:cat,style:{marginBottom:10}},
              e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}},e("span",{style:{fontSize:11,fontWeight:i<3?700:500,color:i<3?"#1F4E79":"#374151"}},["🥇","🥈","🥉","4.","5.","6."][i]+" "+ICONS[cat]+" "+cat),e("span",{style:{fontSize:12,fontWeight:700,color:over?"#dc2626":"#111"}},fmt(val))),
              e("div",{style:{height:7,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}},e("div",{style:{width:(val/mx*100)+"%",height:"100%",background:over?"#ef4444":i===0?"#1F4E79":i===1?"#2E75C2":"#60a5fa",borderRadius:4,transition:"width 0.5s"}}))
            );
          })
        ),

        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:12}},"💳 Spend by Account"),
          e("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
            SPEND_SOURCES.map(s=>{const amt=rows.reduce((a,r)=>a+(r.source===s.label&&isSpend(r)?r.amount||0:0),0);if(!amt)return null;const pct=fullGrand>0?(amt/fullGrand*100).toFixed(0):0;
              return e("div",{key:s.label,style:{flex:"1 1 100px",padding:"10px 12px",borderRadius:10,background:s.light,border:"1px solid "+s.color+"33",textAlign:"center"}},
                e("div",{style:{fontSize:10,fontWeight:700,color:s.color}},s.label),
                e("div",{style:{fontSize:15,fontWeight:800,color:s.color,margin:"3px 0"}},fmt(amt)),
                e("div",{style:{fontSize:9,color:"#6b7280"}},pct+"%")
              );
            }),
            fullGrand===0&&e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"No expenses yet.")
          )
        ),

        // Spend by vendor (this month)
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:4}},"🛍️ Spend by Vendor / App"),
          e("div",{style:{fontSize:10,color:"#9ca3af",marginBottom:12}},"This month · money paid (voucher purchases included). Orders placed from vouchers are shown underneath, not added."),
          vendorTotals.length===0?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"No vendor entries yet."):
          vendorTotals.map((v,i)=>e("div",{key:v.vendor,style:{marginBottom:10}},
            e("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
              e("span",{style:{fontSize:11,fontWeight:i<3?700:500,color:i<3?"#5b21b6":"#374151"}},v.vendor),
              e("span",{style:{fontSize:12,fontWeight:700}},fmt(v.total)+(fullGrand>0&&v.total>0?" ("+(v.total/fullGrand*100).toFixed(0)+"%)":""))),
            e("div",{style:{height:7,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}},e("div",{style:{width:(vendorTotals[0].total>0?v.total/vendorTotals[0].total*100:0)+"%",height:"100%",background:i===0?"#7c3aed":"#a78bfa",borderRadius:4}})),
            (v.loaded>0||v.ordered>0)&&e("div",{style:{fontSize:10,color:"#6b7280",marginTop:3}},(v.loaded>0?"Voucher purchased "+fmt(v.loaded):"")+(v.loaded>0&&v.ordered>0?" · ":"")+(v.ordered>0?"Ordered from voucher "+fmt(v.ordered):""))
          ))
        )
      ),

      // ── VOUCHERS TAB ──
      tab==="vouchers"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          [{label:"Vouchers bought (counted)",val:fmt(loadsThisMonth),color:"#92400e"},{label:"Spent from vouchers (not counted)",val:fmt(voucherSpentThisMonth),color:"#065f46"}]
          .map((k,i)=>e("div",{key:i,style:{background:"#fff",borderRadius:10,padding:"12px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",textAlign:"center"}},
            e("div",{style:{fontSize:16,fontWeight:800,color:k.color}},k.val),
            e("div",{style:{fontSize:9,color:"#9ca3af",marginTop:3,textTransform:"uppercase"}},k.label)))
        ),
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:4}},"🧾 Where voucher money went — by category"),
          e("div",{style:{fontSize:10,color:"#9ca3af",marginBottom:12}},month+" · information only, already counted when the voucher was bought"),
          voucherByCat.length===0?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"No orders from vouchers yet. Log an order with account “Voucher Balance”."):
          voucherByCat.map(([cat,amt],i)=>e("div",{key:cat,style:{marginBottom:10}},
            e("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},e("span",{style:{fontSize:11,fontWeight:i<3?700:500}},(ICONS[cat]||"")+" "+cat),e("span",{style:{fontSize:12,fontWeight:700}},fmt(amt))),
            e("div",{style:{height:7,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}},e("div",{style:{width:(amt/voucherByCat[0][1]*100)+"%",height:"100%",background:"#10b981",borderRadius:4}}))
          ))
        ),
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:12}},"🛍️ Voucher spend by vendor"),
          voucherByVendor.length===0?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"Nothing yet."):
          voucherByVendor.map(([v,amt])=>e("div",{key:v,style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6",fontSize:12}},e("span",null,v),e("span",{style:{fontWeight:700}},fmt(amt))))
        ),
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:4}},"💰 Voucher / Wallet Balances"),
          e("div",{style:{fontSize:10,color:"#9ca3af",marginBottom:12}},"Bought minus used, since you started logging vendors. A balance that keeps growing usually means orders are not being logged."),
          walletBalances.length===0?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"No voucher purchases logged yet."):
          walletBalances.map(w=>e("div",{key:w.vendor,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}},
            e("div",null,e("div",{style:{fontSize:12,fontWeight:700}},w.vendor),e("div",{style:{fontSize:10,color:"#6b7280"}},"Bought "+fmt(w.loaded)+" · Used "+fmt(w.used))),
            e("div",{style:{fontSize:14,fontWeight:800,color:w.balance<0?"#dc2626":"#16a34a"}},(w.balance<0?"-":"")+"₹"+fmtN(Math.abs(w.balance)))
          ))
        )
      ),

      // ── SUMMARY TAB ──
      tab==="summary"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:12,fontWeight:700,color:"#1F4E79",marginBottom:10}},"📅 Day Range"),
          e("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
            e("div",{style:{display:"flex",alignItems:"center",gap:6}},e("span",{style:{fontSize:11,color:"#6b7280"}},"From"),e("select",{value:rf,onChange:ev=>setRf(+ev.target.value),style:{border:"1px solid #d1d5db",borderRadius:7,padding:"6px 10px",fontSize:12,outline:"none"}},Array.from({length:days},(_,i)=>i+1).map(d=>e("option",{key:d,value:d},"Day "+d)))),
            e("span",{style:{color:"#9ca3af"}},"→"),
            e("div",{style:{display:"flex",alignItems:"center",gap:6}},e("span",{style:{fontSize:11,color:"#6b7280"}},"To"),e("select",{value:rt,onChange:ev=>setRt(+ev.target.value),style:{border:"1px solid #d1d5db",borderRadius:7,padding:"6px 10px",fontSize:12,outline:"none"}},Array.from({length:days},(_,i)=>i+1).filter(d=>d>=rf).map(d=>e("option",{key:d,value:d},"Day "+d)))),
            e("div",{style:{fontSize:12,fontWeight:700,color:"#2E75C2",background:"#eff6ff",padding:"5px 12px",borderRadius:20}},"₹"+fmtN(grand)),
            e("button",{onClick:()=>{setRf(1);setRt(days);},style:{fontSize:11,color:"#6b7280",background:"#f3f4f6",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer"}},"Reset")
          )
        ),
        e("div",{style:{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{overflowX:"auto"}},
            e("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:11}},
              e("thead",null,e("tr",null,
                e("th",{style:{padding:"9px 14px",textAlign:"left",background:"#1F4E79",color:"#fff",position:"sticky",left:0,minWidth:180,fontWeight:700}},"Category"),
                SPEND_SOURCES.map(s=>e("th",{key:s.label,style:{padding:"9px 5px",textAlign:"center",background:s.color,color:"#fff",fontWeight:700,minWidth:75,fontSize:10}},s.label)),
                e("th",{style:{padding:"9px 7px",textAlign:"center",background:"#0d2847",color:"#fff",fontWeight:700,minWidth:75}},"Total"),
                e("th",{style:{padding:"9px 7px",textAlign:"center",background:"#374151",color:"#fff",fontWeight:700,minWidth:75}},"Budget"),
                e("th",{style:{padding:"9px 7px",textAlign:"center",background:"#7B2C2C",color:"#fff",fontWeight:700,minWidth:75}},"Variance")
              )),
              e("tbody",null,
                CATEGORIES.map((cat,ci)=>{
                  const row=catT[cat],bud=parseFloat(budgets[cat])||0,variance=bud>0?row.total-bud:null,over=variance!==null&&variance>0,alt=ci%2===0?"#f8faff":"#fff";
                  return e("tr",{key:cat,style:{background:alt}},
                    e("td",{style:{padding:"7px 14px",fontWeight:500,color:"#1F4E79",position:"sticky",left:0,background:ci%2===0?"#eef3fb":"#fff",borderRight:"2px solid #dde8f4",borderBottom:"1px solid #eaeff7"}},ICONS[cat]+" "+cat),
                    SPEND_SOURCES.map(({label,color})=>e("td",{key:label,style:{padding:"7px 5px",textAlign:"right",borderBottom:"1px solid #eaeff7",color:row.bySrc[label]>0?color:"#ddd",fontWeight:row.bySrc[label]>0?600:400}},fmt(row.bySrc[label]))),
                    e("td",{style:{padding:"7px 7px",textAlign:"right",fontWeight:700,color:row.total>0?"#1F4E79":"#bbb",borderBottom:"1px solid #eaeff7"}},fmt(row.total)),
                    e("td",{style:{padding:"7px 7px",textAlign:"right",color:bud>0?"#92400e":"#bbb",borderBottom:"1px solid #eaeff7"}},bud>0?fmt(bud):"—"),
                    e("td",{style:{padding:"7px 7px",textAlign:"right",fontWeight:variance!==null?700:400,borderBottom:"1px solid #eaeff7",color:variance===null?"#bbb":over?"#dc2626":"#16a34a"}},variance===null?"—":(over?"+":"")+fmt(Math.abs(variance))+(over?" ⚠️":" ✓"))
                  );
                }),
                e("tr",{style:{background:"#1F4E79"}},
                  e("td",{style:{padding:"10px 14px",fontWeight:700,color:"#fff",position:"sticky",left:0,background:"#1F4E79"}},"GRAND TOTAL"),
                  SPEND_SOURCES.map(({label})=>e("td",{key:label,style:{padding:"10px 5px",textAlign:"right",fontWeight:700,color:"#fff",fontSize:11}},fmt(srcT[label]))),
                  e("td",{style:{padding:"10px 7px",textAlign:"right",fontWeight:800,color:"#fff",fontSize:13}},fmt(grand)),
                  e("td",{style:{padding:"10px 7px",textAlign:"right",fontWeight:700,color:"#fff"}},fmt(totalBud)),
                  e("td",{style:{padding:"10px 7px",textAlign:"right",fontWeight:700,color:rem!==null?(rem>=0?"#86efac":"#fca5a5"):"#fff"}},rem!==null?(rem>=0?"✓ "+fmt(rem):"⚠️ +"+fmt(Math.abs(rem))):"—")
                )
              )
            )
          )
        )
      ),

      // ── REPORTS TAB ──
      tab==="reports"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:10}},"📈 Report filters"),
          e("div",{style:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}},
            [["month","This month"],["last","Last month"],["3m","Last 3 months"],["fy","This financial year"],["year","This year"]].map(([k,l])=>
              e("button",{key:k,onClick:()=>repPreset(k),style:{padding:"6px 10px",borderRadius:20,border:"1px solid #c7d7ea",background:"#eff6ff",color:"#1F4E79",fontSize:11,fontWeight:600,cursor:"pointer"}},l))
          ),
          e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
            [["From",repFrom,setRepFrom],["To",repTo,setRepTo]].map(([l,v,set])=>e("div",{key:l},
              e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}},l),
              e("input",{type:"date",value:v,onChange:ev=>set(ev.target.value),style:{width:"100%",padding:"8px 10px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,boxSizing:"border-box"}})))
          ),
          repFrom>repTo&&e("div",{style:{fontSize:11,color:"#dc2626",marginBottom:8}},"“From” date is after “To” date."),
          e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
            [["Category",repCat,setRepCat,[["","All categories"],...ALL_CATEGORIES.map(c=>[c,ICONS[c]+" "+c])]],
             ["Bank / Card",repAcc,setRepAcc,[["","All accounts"],...SOURCES.map(x=>[x.label,x.label])]],
             ["Vendor / App",repVen,setRepVen,[["","All vendors"],...VENDORS.map(v=>[v,v]),["__none","(no vendor)"]]],
             ["Show",repType,setRepType,[["spend","Counted spending"],["voucher","Paid from vouchers (not counted)"],["income","Money received"]]]
            ].map(([l,v,set,opts])=>e("div",{key:l},
              e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}},l),
              e("select",{value:v,onChange:ev=>set(ev.target.value),style:{width:"100%",padding:"8px 8px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,boxSizing:"border-box"}},opts.map(([val,lab])=>e("option",{key:val,value:val},lab)))))
          ),
          e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
            [["summary","📊 Summary"],["table","🔢 Two-way table"],["raw","📋 Raw entries"]].map(([k,l])=>e("button",{key:k,onClick:()=>setRepView(k),style:{padding:"7px 12px",borderRadius:8,border:repView===k?"2px solid #1F4E79":"1px solid #e5e7eb",background:repView===k?"#eff6ff":"#fff",color:repView===k?"#1F4E79":"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer"}},l)),
            repView==="summary"&&e("span",{style:{fontSize:11,color:"#6b7280",marginLeft:6}},"Group by"),
            repView==="summary"&&[["category","Category"],["account","Bank/Card"],["vendor","Vendor"],["month","Month"]].map(([k,l])=>e("button",{key:k,onClick:()=>setRepGroup(k),style:{padding:"6px 10px",borderRadius:20,border:"1px solid "+(repGroup===k?"#1F4E79":"#e5e7eb"),background:repGroup===k?"#1F4E79":"#fff",color:repGroup===k?"#fff":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}},l))
          ),
          repView==="table"&&e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}},
            [["Down the side (rows)",repRowDim,v=>{setRepRowDim(v); if(v===repColDim) setRepColDim(["category","account","vendor","month"].find(x=>x!==v));}],
             ["Across the top (columns)",repColDim,v=>{setRepColDim(v); if(v===repRowDim) setRepRowDim(["category","account","vendor","month"].find(x=>x!==v));}]
            ].map(([l,v,set])=>e("div",{key:l},
              e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}},l),
              e("select",{value:v,onChange:ev=>set(ev.target.value),style:{width:"100%",padding:"8px 8px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,boxSizing:"border-box"}},
                [["category","Category"],["account","Bank / Card"],["vendor","Vendor / App"],["month","Month"]].map(([val,lab])=>e("option",{key:val,value:val},lab)))))
          )
        ),
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}},
            e("div",null,
              e("div",{style:{fontSize:11,color:"#6b7280"}},repLabel()+" · "+repRows.length+" entr"+(repRows.length===1?"y":"ies")),
              e("div",{style:{fontSize:22,fontWeight:900,color:repType==="income"?"#16a34a":repType==="voucher"?"#065f46":"#1F4E79"}},"₹"+fmtN(repTotal))),
            e("div",{style:{display:"flex",gap:6}},
              e("button",{onClick:repDownload,disabled:repRows.length===0,style:{padding:"8px 12px",background:"#4E9668",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}},"⬇ Download")
            )
          ),
          repLoading?e("div",{style:{fontSize:12,color:"#6b7280",padding:"14px 0",textAlign:"center"}},"Loading…"):
          repRows.length===0?e("div",{style:{fontSize:12,color:"#9ca3af",fontStyle:"italic",padding:"14px 0",textAlign:"center"}},"No entries match these filters."):
          repView==="summary"
            ?repGroups.map((g,i)=>e("div",{key:g.key,style:{marginBottom:10}},
                e("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                  e("span",{style:{fontSize:12,fontWeight:i<3&&repGroup!=="month"?700:500,color:"#374151"}},(repGroup==="category"?(ICONS[g.key]||"")+" ":"")+g.key+" · "+g.count),
                  e("span",{style:{fontSize:12,fontWeight:700}},"₹"+fmtN(g.total)+(repTotal>0?" ("+(g.total/repTotal*100).toFixed(0)+"%)":""))),
                e("div",{style:{height:7,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}},e("div",{style:{width:(repGroups.reduce((m,x)=>Math.max(m,x.total),1)>0?g.total/repGroups.reduce((m,x)=>Math.max(m,x.total),1)*100:0)+"%",height:"100%",background:"#2E75C2",borderRadius:4}}))))
            :repView==="table"
            ?e("div",{style:{overflowX:"auto"}},
              e("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:11}},
                e("thead",null,e("tr",null,
                  e("th",{style:{padding:"7px 8px",textAlign:"left",background:"#1F4E79",color:"#fff",position:"sticky",left:0,minWidth:120}},DIM_LABEL[repRowDim]+" ↓ / "+DIM_LABEL[repColDim]+" →"),
                  repPivot.colKeys.map(ck=>e("th",{key:ck,style:{padding:"7px 6px",textAlign:"right",background:"#2E75C2",color:"#fff",fontWeight:700,minWidth:70}},ck)),
                  e("th",{style:{padding:"7px 8px",textAlign:"right",background:"#0d2847",color:"#fff",fontWeight:800,minWidth:75}},"Total"))),
                e("tbody",null,
                  repPivot.rowKeys.map((rk,i)=>e("tr",{key:rk,style:{background:i%2===0?"#f8faff":"#fff"}},
                    e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7",fontWeight:600,color:"#1F4E79",position:"sticky",left:0,background:i%2===0?"#eef3fb":"#fff",borderRight:"2px solid #dde8f4"}},(repRowDim==="category"?(ICONS[rk]||"")+" ":"")+rk),
                    repPivot.colKeys.map(ck=>{const v=repPivot.cells[rk]?.[ck]||0;
                      return e("td",{key:ck,style:{padding:"6px 6px",textAlign:"right",borderBottom:"1px solid #eaeff7",background:v>0?"rgba(46,117,194,"+(0.08+0.32*v/Math.max(1,repPivot.max))+")":"transparent",color:v>0?"#111":"#ccc",fontWeight:v>0?600:400}},v>0?fmt(v):"—");}),
                    e("td",{style:{padding:"6px 8px",textAlign:"right",borderBottom:"1px solid #eaeff7",fontWeight:800,color:"#1F4E79"}},fmt(repPivot.rowT[rk]))
                  )),
                  e("tr",{style:{background:"#1F4E79"}},
                    e("td",{style:{padding:"8px 8px",color:"#fff",fontWeight:800,position:"sticky",left:0,background:"#1F4E79"}},"TOTAL"),
                    repPivot.colKeys.map(ck=>e("td",{key:ck,style:{padding:"8px 6px",textAlign:"right",color:"#fff",fontWeight:700}},fmt(repPivot.colT[ck]))),
                    e("td",{style:{padding:"8px 8px",textAlign:"right",color:"#fff",fontWeight:900}},fmt(repTotal)))
                )))
            :e("div",{style:{overflowX:"auto"}},
              e("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:11}},
                e("thead",null,e("tr",null,["Date","Description","Category","Vendor","Account","Amount"].map(h=>e("th",{key:h,style:{padding:"7px 8px",textAlign:h==="Amount"?"right":"left",background:"#1F4E79",color:"#fff",fontWeight:700,whiteSpace:"nowrap"}},h)))),
                e("tbody",null,repRows.map((r,i)=>e("tr",{key:r.id,style:{background:i%2===0?"#f8faff":"#fff"}},
                  e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7",whiteSpace:"nowrap",color:"#6b7280"}},r.dateKey.split("-").reverse().join("-")),
                  e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7",fontWeight:500}},r.description),
                  e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7"}},(ICONS[r.category]||"")+" "+r.category),
                  e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7"}},r.vendor||"—"),
                  e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7"}},r.source),
                  e("td",{style:{padding:"6px 8px",borderBottom:"1px solid #eaeff7",textAlign:"right",fontWeight:700}},"₹"+fmtN(r.amount))))))))
      ),

      // ── EXPORT TAB ──
      tab==="export"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:13,fontWeight:700,color:"#1F4E79",marginBottom:14}},"📥 Download Expenses as CSV"),
          e("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}},
            e("div",{style:{flex:1,minWidth:140}},
              e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"From Date"),
              e("input",{type:"date",value:exportFrom,onChange:ev=>setExportFrom(ev.target.value),style:{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}})
            ),
            e("div",{style:{flex:1,minWidth:140}},
              e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"To Date"),
              e("input",{type:"date",value:exportTo,onChange:ev=>setExportTo(ev.target.value),style:{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}})
            )
          ),
          e("div",{style:{display:"flex",gap:10}},
          e("button",{onClick:()=>handleExport("summary"),disabled:exporting,style:{flex:1,padding:12,background:"#1F4E79",color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}},exporting?"Fetching…":"📊 Download Summary"),
          e("button",{onClick:()=>handleExport("raw"),disabled:exporting,style:{flex:1,padding:12,background:"#4E9668",color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}},exporting?"Fetching…":"📋 Download Raw Data")
        )
        ),

        // Filtered results preview
        exportRows.length>0&&e("div",{style:{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{padding:"12px 16px",fontSize:12,fontWeight:700,color:"#1F4E79"}},"Preview — "+exportRows.length+" entries"),
          e("div",{style:{overflowX:"auto"}},
            e("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:11}},
              e("thead",null,e("tr",null,
                ["Date","Description","Category","Account","Amount"].map(h=>e("th",{key:h,style:{padding:"8px 10px",textAlign:h==="Amount"?"right":"left",background:"#1F4E79",color:"#fff",fontWeight:700}},h))
              )),
              e("tbody",null,
                exportRows.map((r,i)=>{
                  const src=SOURCES.find(s=>s.label===r.source);
                  return e("tr",{key:r.id,style:{background:i%2===0?"#f8faff":"#fff"}},
                    e("td",{style:{padding:"7px 10px",borderBottom:"1px solid #eaeff7",fontSize:10,color:"#6b7280"}},r.date?.slice(0,10)||""),
                    e("td",{style:{padding:"7px 10px",borderBottom:"1px solid #eaeff7",fontWeight:500}},r.description||""),
                    e("td",{style:{padding:"7px 10px",borderBottom:"1px solid #eaeff7"}},ICONS[r.category]+" "+r.category),
                    e("td",{style:{padding:"7px 10px",borderBottom:"1px solid #eaeff7",color:src?.color||"#111",fontWeight:600}},r.source),
                    e("td",{style:{padding:"7px 10px",borderBottom:"1px solid #eaeff7",textAlign:"right",fontWeight:700,color:isIncome(r)?"#16a34a":isSpend(r)?"#1F4E79":"#9ca3af"}},isIncome(r)?"+₹"+fmtN(r.amount)+" (received)":isSpend(r)?"₹"+fmtN(r.amount):"₹"+fmtN(r.amount)+" (voucher, not counted)")
                  );
                })
              )
            )
          )
        )
      )
    )
      ,tab==="budget"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:14,fontWeight:700,color:"#1F4E79",marginBottom:4}},"🎯 Monthly Budgets"),
          e("div",{style:{fontSize:11,color:"#6b7280",marginBottom:14}},"Set a budget for each category."),
          e("div",{style:{display:"flex",flexDirection:"column",gap:10}},
            CATEGORIES.map(cat=>{
              const actual=fullT[cat]?.total||0,budget=parseFloat(budgets[cat])||0,over=budget>0&&actual>budget;
              const pct=budget>0?Math.min(100,(actual/budget)*100):0;
              return e("div",{key:cat,style:{padding:"12px",background:over?"#fff5f5":actual>0?"#f8faff":"#fafafa",borderRadius:10,border:"1px solid "+(over?"#fca5a5":actual>0?"#dde8f4":"#e5e7eb")}},
                e("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:budget>0?8:0}},
                  e("div",{style:{flex:1,fontSize:13,color:"#374151",fontWeight:500}},ICONS[cat]+" "+cat),
                  e("div",{style:{display:"flex",alignItems:"center",gap:8}},
                    actual>0&&e("span",{style:{fontSize:13,color:over?"#dc2626":"#6b7280",fontWeight:700}},fmt(actual)),
                    e("input",{type:"number",min:"0",value:budgets[cat]||"",placeholder:"Set budget",
                      onChange:ev=>setBudgets(p=>({...p,[cat]:ev.target.value})),
                      onBlur:handleBudgetBlur,
                      style:{width:110,padding:"8px 10px",border:"1px solid #fde68a",borderRadius:7,fontSize:13,textAlign:"right",background:"#fffbeb",color:"#92400e",fontWeight:700,outline:"none"}})
                  )
                ),
                budget>0&&e("div",null,
                  e("div",{style:{height:6,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}},
                    e("div",{style:{width:pct+"%",height:"100%",background:over?"#ef4444":"#2E75C2",borderRadius:4,transition:"width 0.5s"}})
                  ),
                  e("div",{style:{fontSize:10,color:over?"#dc2626":"#16a34a",marginTop:3,textAlign:"right",fontWeight:600}},
                    over?"⚠️ Over by "+fmt(actual-budget):"✓ "+fmt(budget-actual)+" remaining"
                  )
                )
              );
            })
          )
        )
      )

  );
}
// ── ROOT
function App(){
  const [user,setUser]=useState(null);
  if(user) return e(MainApp,{user,onLogout:()=>setUser(null)});
  return e(LoginScreen,{onLogin:setUser});
}

ReactDOM.render(e(App),document.getElementById("root"));
