// ============================================================
// ✅ STEP 1: PASTE YOUR SUPABASE CREDENTIALS HERE
// ============================================================
const SUPABASE_URL = "https://gktipiisfpwijfbnswre.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdGlwaWlzZnB3aWpmYm5zd3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjMyMDAsImV4cCI6MjA5MjY5OTIwMH0.F4hs86rodUHlBLilCNua97jjofo5tB2F7QCMxy0YFTQ";
const sb = (window.supabase || supabase).createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// CONSTANTS — unchanged from original
// ============================================================
const USERS = [
  { id:"1", name:"Uma",     pin:"1111", role:"admin"  },
  { id:"2", name:"Husband", pin:"2222", role:"member" },
];
const CATEGORIES = [
  "Groceries & Vegetables","School & Education","Utilities (Electricity/Water/Gas)",
  "Household Help (Maid/Cook/Driver)","Dining Out & Sweets","Restaurants",
  "Medical & Pharmacy","Transport & Fuel","Taxi / Auto","Gym","Shopping & Clothing",
  "Subscriptions (OTT/Internet)","Toiletries & Cleaning Supplies","Gardening","Gifts",
  "Wallet / FASTag Recharge","Entertainment","Miscellaneous"
];
const SOURCES = [
  { label:"HDFC CC",      color:"#2E75C2", light:"#D9E1F2" },
  { label:"Axis CC",      color:"#4E9668", light:"#E2EFDA" },
  { label:"RuPay CC",     color:"#B8860B", light:"#FFF2CC" },
  { label:"HDFC Bank",    color:"#1A5276", light:"#D6EAF8" },
  { label:"Axis Bank",    color:"#1E8449", light:"#D5F5E3" },
  { label:"Cash / UPI",   color:"#C65911", light:"#FCE4D6" },
  { label:"BBDaily",      color:"#6C3483", light:"#E8DAEF" },
  { label:"Akshayakalpa", color:"#117A65", light:"#D1F2EB" }
];
const ICONS = {
  "Groceries & Vegetables":"🥦","School & Education":"📚","Utilities (Electricity/Water/Gas)":"💡",
  "Household Help (Maid/Cook/Driver)":"🏠","Dining Out & Sweets":"🍽️","Restaurants":"🍜",
  "Medical & Pharmacy":"💊","Transport & Fuel":"⛽","Taxi / Auto":"🚕","Gym":"🏋️",
  "Shopping & Clothing":"👗","Subscriptions (OTT/Internet)":"📱","Toiletries & Cleaning Supplies":"🧴",
  "Gardening":"🌿","Gifts":"🎁","Wallet / FASTag Recharge":"💳","Entertainment":"🎬","Miscellaneous":"📦"
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DIM = {January:31,February:28,March:31,April:30,May:31,June:30,July:31,August:31,September:30,October:31,November:30,December:31};

// ============================================================
// AUTO CATEGORY — keyword matching on description
// ============================================================
const KEYWORD_MAP = [
  { keywords:["swiggy","zomato","eatsure","dunzo food"],        category:"Dining Out & Sweets" },
  { keywords:["milk","akshaya","bbdaily","vegetables","sabzi","groceries","bigbasket","zepto","blinkit","dmart"],category:"Groceries & Vegetables" },
  { keywords:["fees","school","tuition","class","course","coaching","exam","becker"],category:"School & Education" },
  { keywords:["uber","ola","auto","taxi","rapido","cab"],        category:"Taxi / Auto" },
  { keywords:["petrol","diesel","fuel","cng","hp","bharat"],     category:"Transport & Fuel" },
  { keywords:["electricity","water","gas","cylinder","bescom","power","bill"], category:"Utilities (Electricity/Water/Gas)" },
  { keywords:["maid","cook","driver","helper","bai","servant"],  category:"Household Help (Maid/Cook/Driver)" },
  { keywords:["doctor","hospital","pharmacy","medicine","apollo","med","clinic","lab","test"], category:"Medical & Pharmacy" },
  { keywords:["gym","fitness","cult","yoga","workout"],          category:"Gym" },
  { keywords:["amazon","flipkart","myntra","cloth","shirt","dress","shopping","shoes","bag"], category:"Shopping & Clothing" },
  { keywords:["netflix","hotstar","spotify","prime","jio","airtel","internet","wifi","phone","recharge","ott","subscription"], category:"Subscriptions (OTT/Internet)" },
  { keywords:["soap","shampoo","toothpaste","cleaning","detergent","harpic","toilet","tissue","sanitizer"], category:"Toiletries & Cleaning Supplies" },
  { keywords:["garden","plant","nursery","seeds","pot"],         category:"Gardening" },
  { keywords:["gift","birthday","wedding","anniversary","present"], category:"Gifts" },
  { keywords:["fastag","wallet","paytm","gpay","phonepe","load","recharge wallet"], category:"Wallet / FASTag Recharge" },
  { keywords:["movie","cinema","pvr","inox","bookmyshow","theatre","concert","show","multiplex","amusement","zoo","park","event","ticket","entertainment"], category:"Entertainment" },
  { keywords:["restaurant","hotel","cafe","coffee","sweets","bakery","pizza","burger","biryani"], category:"Restaurants" },
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
// SUPABASE DATA LAYER — replaces Google Sheets
// ============================================================
async function dbInsert(row) {
  const { error } = await sb.from("expenses").insert([{
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
  }]);
  if (error) throw error;
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
  }));
}

async function dbDelete(id) {
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

async function dbUpdate(id, changes) {
  const { error } = await sb.from("expenses").update({
    amount:      changes.amount,
    description: changes.description,
    category:    changes.category,
    account:     changes.source,
    note:        changes.note || changes.description,
  }).eq("id", id);
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
    source: r.account||"", date: r.date, enteredBy: r.entered_by||"",
  }));
}

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
        e("strong",null,"Uma"),": 1111  |  ",e("strong",null,"Husband"),": 2222"
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
  const [saving,setSaving] = useState(false);

  async function handleSave() {
    if (!amt || parseFloat(amt)<=0) return;
    setSaving(true);
    await onSave(row.id, { amount:parseFloat(amt), description:desc, category:cat, source:src, note:desc });
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
      e("input",{type:"text",value:desc,onChange:ev=>{setDesc(ev.target.value);setCat(autoCategory(ev.target.value));},style:inp}),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginTop:10}},"🏷️ Category (auto-detected, editable)"),
      e("select",{value:cat,onChange:ev=>setCat(ev.target.value),style:{...inp}},CATEGORIES.map(c=>e("option",{key:c,value:c},ICONS[c]+" "+c))),
      e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginTop:10}},"💳 Account"),
      e("select",{value:src,onChange:ev=>setSrc(ev.target.value),style:{...inp}},SOURCES.map(s=>e("option",{key:s.label,value:s.label},s.label))),
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

  // ── Export/filter
  const [exportFrom,setExportFrom] = useState("");
  const [exportTo,setExportTo]     = useState("");
  const [exportRows,setExportRows] = useState([]);
  const [exporting,setExporting]   = useState(false);

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
  useEffect(()=>{ setDetectedCat(autoCategory(newDesc)); },[newDesc]);

  function dayTotal(d){ return rows.filter(r=>r.day===d).reduce((s,r)=>s+(r.amount||0),0); }
  const dayRows = useMemo(()=>rows.filter(r=>r.day===activeDay).sort((a,b)=>a.timestamp-b.timestamp),[rows,activeDay]);

  // ── ADD ENTRY (3 fields only, category auto-detected)
  async function handleAdd() {
    const amt = parseFloat(newAmt);
    if (!amt||amt<=0||!newDesc.trim()) return;
    const category = autoCategory(newDesc);
    const row = {
      id: Date.now()+"_"+Math.random().toString(36).slice(2),
      month, year:String(year), day:activeDay,
      note: newDesc.trim(), description: newDesc.trim(),
      category, source: newSrc,
      amount: amt, enteredBy: user.name,
      timestamp: Date.now(), date: new Date().toISOString(),
    };
    // Optimistic update
    setRows(p=>[...p, row]);
    setNewAmt(""); setNewDesc("");
    localStorage.setItem("lastAccount", newSrc);
    setSyncStatus("saving");
    try { await dbInsert(row); setSyncStatus("saved"); }
    catch(ex) { setErr("Save failed: "+ex.message); setSyncStatus("error"); setRows(p=>p.filter(r=>r.id!==row.id)); }
  }

  // ── DELETE
  async function handleDelete(row) {
    setRows(p=>p.filter(r=>r.id!==row.id));
    setSyncStatus("saving");
    try { await dbDelete(row.id); setSyncStatus("saved"); }
    catch(ex) { setErr("Delete failed: "+ex.message); setSyncStatus("error"); }
  }

  // ── EDIT SAVE
  async function handleEditSave(id, changes) {
    setRows(p=>p.map(r=>r.id===id?{...r,...changes,source:changes.source}:r));
    setEditRow(null); setSyncStatus("saving");
    try { await dbUpdate(id, changes); setSyncStatus("saved"); }
    catch(ex) { setErr("Update failed: "+ex.message); setSyncStatus("error"); }
  }

  // ── BUDGET
  async function handleBudgetBlur() {
    try { await dbSaveBudgets(budgets); } catch(ex) { setErr("Budget save failed."); }
  }

  // ── EXPORT CSV (date range from Supabase)
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
          const catRows = data.filter(r=>r.category===cat);
          if(catRows.length===0) return null;
          const total = catRows.reduce((s,r)=>s+(r.amount||0),0);
          const bySrc = {};
          SOURCES.forEach(s=>{ bySrc[s.label]=catRows.filter(r=>r.source===s.label).reduce((a,r)=>a+(r.amount||0),0); });
          const budget = parseFloat(budgets[cat])||0;
          return [cat,...SOURCES.map(s=>bySrc[s.label]||0),total,budget,budget>0?total-budget:""];
        }).filter(Boolean);
        const header = ["Category",...SOURCES.map(s=>s.label),"Total","Budget","Variance"];
        csv = [header,...summaryRows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
        filename = `SmartExpense_Summary_${exportFrom}_to_${exportTo}.csv`;
      } else {
        const header = ["Date","Day","Description","Category","Account","Amount","Entered By"];
        const drows = data.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(r=>[r.date?.slice(0,10)||"",new Date(r.date).getDate(),r.description||"",r.category,r.source,r.amount||0,r.enteredBy||""]);
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
    const fil = rows.filter(r=>r.day>=rf&&r.day<=rt);
    const out={};
    for(const cat of CATEGORIES){
      out[cat]={total:0,bySrc:{}};
      for(const{label}of SOURCES){
        const s=fil.filter(r=>r.category===cat&&r.source===label).reduce((a,r)=>a+(r.amount||0),0);
        out[cat].bySrc[label]=s; out[cat].total+=s;
      }
    }
    return out;
  },[rows,rf,rt]);

  const srcT = useMemo(()=>{
    const out={};
    for(const{label}of SOURCES) out[label]=CATEGORIES.reduce((s,c)=>s+(catT[c]?.bySrc[label]||0),0);
    return out;
  },[catT]);

  const grand      = useMemo(()=>Object.values(srcT).reduce((a,b)=>a+b,0),[srcT]);
  const totalBud   = useMemo(()=>Object.values(budgets).reduce((a,b)=>a+(parseFloat(b)||0),0),[budgets]);
  const rem        = totalBud>0?totalBud-grand:null;

  const fullT = useMemo(()=>{
    const out={};
    for(const cat of CATEGORIES){
      out[cat]={total:0,bySrc:{}};
      for(const{label}of SOURCES){
        const s=rows.filter(r=>r.category===cat&&r.source===label).reduce((a,r)=>a+(r.amount||0),0);
        out[cat].bySrc[label]=s; out[cat].total+=s;
      }
    }
    return out;
  },[rows]);
  const fullGrand = useMemo(()=>CATEGORIES.reduce((s,c)=>s+(fullT[c]?.total||0),0),[fullT]);

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
      e("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 6px",flexWrap:"wrap",gap:6}},
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
          e("select",{value:month,onChange:ev=>setMonth(ev.target.value),style:{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:7,padding:"4px 7px",fontSize:11}},MONTHS.map(m=>e("option",{key:m,value:m},m))),
          e("select",{value:year,onChange:ev=>setYear(+ev.target.value),style:{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:7,padding:"4px 7px",fontSize:11}},[2024,2025,2026,2027].map(y=>e("option",{key:y,value:y},y))),
          e("button",{onClick:onLogout,style:{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer"}},"Logout")
        )
      ),
      e("div",{style:{display:"flex",gap:2,padding:"0 14px",overflowX:"auto"}},
        ["entry","dashboard","summary","export","budget"].map(t=>e("button",{key:t,onClick:()=>setTab(t),style:{padding:"8px 13px",borderRadius:"7px 7px 0 0",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",background:tab===t?"#f0f4f8":"transparent",color:tab===t?"#1F4E79":"rgba(255,255,255,0.7)"}},{"entry":"📝 Entry","dashboard":"🎯 Dashboard","summary":"📊 Summary","export":"📥 Export","budget":"🎯 Budget"}[t]))
      )
    ),

    err&&e("div",{style:{background:"#fee2e2",padding:"8px 14px",fontSize:11,color:"#dc2626",textAlign:"center",display:"flex",justifyContent:"space-between"}},e("span",null,err),e("button",{onClick:()=>setErr(""),style:{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontWeight:700}},"✕")),

    e("div",{style:{maxWidth:700,margin:"0 auto",padding:"12px 8px"}},

      // ── ENTRY TAB ──
      tab==="entry"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},

        // Day picker
        e("div",{style:{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:11,fontWeight:700,color:"#1F4E79",marginBottom:8}},"Select Day — "+month+" "+year),
          e("div",{style:{display:"flex",flexWrap:"wrap",gap:3}},
            Array.from({length:days},(_,i)=>i+1).map(d=>{
              const dt=dayTotal(d),isA=d===activeDay;
              return e("button",{key:d,onClick:()=>setActiveDay(d),style:{width:30,height:30,borderRadius:6,border:isA?"2px solid #1F4E79":"1px solid #dde3ed",background:isA?"#1F4E79":dt>0?"#dbeafe":"#fff",color:isA?"#fff":dt>0?"#1F4E79":"#666",fontSize:11,fontWeight:isA||dt>0?700:400,cursor:"pointer",position:"relative"}},
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
          e("div",{style:{fontSize:12,fontWeight:700,color:"#1F4E79",marginBottom:14}},"+ Quick Entry — Day "+activeDay),

          // Amount — first and biggest
          e("div",{style:{marginBottom:12}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"₹ Amount"),
            e("input",{type:"number",min:"0",value:newAmt,onChange:ev=>setNewAmt(ev.target.value),
              onKeyDown:ev=>ev.key==="Enter"&&document.getElementById("desc-input").focus(),
              placeholder:"0",autoFocus:true,
              style:{width:"100%",padding:"14px 16px",border:"2px solid #e5e7eb",borderRadius:10,fontSize:22,outline:"none",textAlign:"right",fontWeight:800,color:"#1F4E79",boxSizing:"border-box"}})
          ),

          // Description
          e("div",{style:{marginBottom:12}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"📝 Description"),
            e("input",{id:"desc-input",type:"text",value:newDesc,
              onChange:ev=>setNewDesc(ev.target.value),
              onKeyDown:ev=>ev.key==="Enter"&&handleAdd(),
              placeholder:"e.g. swiggy, school fees, milk, petrol…",
              style:{width:"100%",padding:"12px 14px",border:"1px solid #e5e7eb",borderRadius:10,fontSize:15,outline:"none",background:"#faf5ff",boxSizing:"border-box"}})
          ),

          // Auto-detected category badge
          newDesc&&e("div",{style:{marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            e("span",{style:{fontSize:10,color:"#6b7280"}},"Auto category:"),
            e("span",{style:{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"#eff6ff",color:"#1F4E79"}},ICONS[detectedCat]+" "+detectedCat)
          ),

          // Account (default = last used)
          e("div",{style:{marginBottom:14}},
            e("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}},"💳 Account"),
            e("select",{value:newSrc,onChange:ev=>{setNewSrc(ev.target.value);localStorage.setItem("lastAccount",ev.target.value);},
              style:{width:"100%",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}},
              SOURCES.map(s=>e("option",{key:s.label,value:s.label},s.label)))
          ),

          e("button",{onClick:handleAdd,disabled:!newAmt||parseFloat(newAmt)<=0||!newDesc.trim(),
            style:{width:"100%",padding:12,background:newAmt&&parseFloat(newAmt)>0&&newDesc.trim()?"#1F4E79":"#d1d5db",color:"#fff",border:"none",borderRadius:9,fontSize:14,fontWeight:700,cursor:newAmt&&parseFloat(newAmt)>0&&newDesc.trim()?"pointer":"not-allowed"}},
            "+ Add Entry")
        ),

        // Entries list for selected day
        e("div",{style:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}},
          e("div",{style:{fontSize:14,fontWeight:700,color:"#1F4E79",marginBottom:dayRows.length>0?14:0}},
            "Day "+activeDay+" Entries",
            dayRows.length>0&&e("span",{style:{marginLeft:8,fontSize:11,color:"#6b7280",fontWeight:400}},dayRows.length+" · "+fmt(dayTotal(activeDay)))
          ),
          dayRows.length===0
            ?e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic",textAlign:"center",padding:"16px 0"}},"No entries yet. Add above.")
            :dayRows.map(row=>{
              const src=SOURCES.find(s=>s.label===row.source);
              return e("div",{key:row.id,onClick:()=>setEditRow(row),style:{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:"1px solid #f3f4f6",cursor:"pointer"}},
                e("div",{style:{flex:1,minWidth:0}},
                  e("div",{style:{fontSize:15,fontWeight:600,color:"#111",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},row.description||row.note||"—"),
                  e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
                    e("span",{style:{fontSize:10,padding:"1px 7px",borderRadius:20,background:"#f0fdf4",color:"#166534",border:"1px solid #bbf7d0"}},ICONS[row.category]+" "+row.category),
                    e("span",{style:{fontSize:10,padding:"1px 7px",borderRadius:20,background:src?.light||"#f3f4f6",color:src?.color||"#666",fontWeight:600}},row.source),
                    e("span",{style:{fontSize:9,color:"#9ca3af"}},"tap to edit")
                  )
                ),
                e("div",{style:{fontSize:18,fontWeight:900,color:src?.color||"#111",minWidth:80,textAlign:"right"}},"₹"+fmtN(row.amount)),
                e("button",{onClick:ev=>{ev.stopPropagation();handleDelete(row);},style:{background:"#fee2e2",border:"none",color:"#dc2626",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontWeight:700}},"✕")
              );
            })
        ),

      ),

      // ── DASHBOARD TAB ──
      tab==="dashboard"&&e("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        e("div",{style:{background:"linear-gradient(135deg,#1F4E79,#2E75C2)",borderRadius:14,padding:20,marginBottom:4,textAlign:"center"}},
          e("div",{style:{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}},"Total Spent — "+month+" "+year),
          e("div",{style:{fontSize:36,fontWeight:900,color:"#fff",marginBottom:4}},"₹"+fmtN(fullGrand)),
          e("div",{style:{fontSize:12,color:"rgba(255,255,255,0.65)"}},activeDay+" of "+days+" days tracked")
        ),
        e("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:4}},
          [{label:"Budget",val:totalBud>0?fmt(totalBud):"Not set",color:"#16a34a",icon:"🎯"},
           {label:rem!==null&&rem<0?"Over Budget":"Remaining",val:rem!==null?fmt(Math.abs(rem)):"—",color:rem===null?"#9ca3af":rem>=0?"#16a34a":"#dc2626",icon:rem!==null&&rem<0?"🚨":"✅"},
           {label:"Daily Avg",val:fmt(fullGrand/Math.max(1,activeDay)),color:"#7c3aed",icon:"📅"},
          ].map((k,i)=>e("div",{key:i,style:{background:"#fff",borderRadius:10,padding:"10px 8px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",textAlign:"center"}},
            e("div",{style:{fontSize:16,marginBottom:3}},k.icon),
            e("div",{style:{fontSize:14,fontWeight:800,color:k.color}},k.val),
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
            SOURCES.map(s=>{const amt=rows.reduce((a,r)=>a+(r.source===s.label?r.amount||0:0),0);if(!amt)return null;const pct=fullGrand>0?(amt/fullGrand*100).toFixed(0):0;
              return e("div",{key:s.label,style:{flex:"1 1 100px",padding:"10px 12px",borderRadius:10,background:s.light,border:"1px solid "+s.color+"33",textAlign:"center"}},
                e("div",{style:{fontSize:10,fontWeight:700,color:s.color}},s.label),
                e("div",{style:{fontSize:15,fontWeight:800,color:s.color,margin:"3px 0"}},fmt(amt)),
                e("div",{style:{fontSize:9,color:"#6b7280"}},pct+"%")
              );
            }),
            fullGrand===0&&e("div",{style:{fontSize:11,color:"#9ca3af",fontStyle:"italic"}},"No expenses yet.")
          )
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
                SOURCES.map(s=>e("th",{key:s.label,style:{padding:"9px 5px",textAlign:"center",background:s.color,color:"#fff",fontWeight:700,minWidth:75,fontSize:10}},s.label)),
                e("th",{style:{padding:"9px 7px",textAlign:"center",background:"#0d2847",color:"#fff",fontWeight:700,minWidth:75}},"Total"),
                e("th",{style:{padding:"9px 7px",textAlign:"center",background:"#374151",color:"#fff",fontWeight:700,minWidth:75}},"Budget"),
                e("th",{style:{padding:"9px 7px",textAlign:"center",background:"#7B2C2C",color:"#fff",fontWeight:700,minWidth:75}},"Variance")
              )),
              e("tbody",null,
                CATEGORIES.map((cat,ci)=>{
                  const row=catT[cat],bud=parseFloat(budgets[cat])||0,variance=bud>0?row.total-bud:null,over=variance!==null&&variance>0,alt=ci%2===0?"#f8faff":"#fff";
                  return e("tr",{key:cat,style:{background:alt}},
                    e("td",{style:{padding:"7px 14px",fontWeight:500,color:"#1F4E79",position:"sticky",left:0,background:ci%2===0?"#eef3fb":"#fff",borderRight:"2px solid #dde8f4",borderBottom:"1px solid #eaeff7"}},ICONS[cat]+" "+cat),
                    SOURCES.map(({label,color})=>e("td",{key:label,style:{padding:"7px 5px",textAlign:"right",borderBottom:"1px solid #eaeff7",color:row.bySrc[label]>0?color:"#ddd",fontWeight:row.bySrc[label]>0?600:400}},fmt(row.bySrc[label]))),
                    e("td",{style:{padding:"7px 7px",textAlign:"right",fontWeight:700,color:row.total>0?"#1F4E79":"#bbb",borderBottom:"1px solid #eaeff7"}},fmt(row.total)),
                    e("td",{style:{padding:"7px 7px",textAlign:"right",color:bud>0?"#92400e":"#bbb",borderBottom:"1px solid #eaeff7"}},bud>0?fmt(bud):"—"),
                    e("td",{style:{padding:"7px 7px",textAlign:"right",fontWeight:variance!==null?700:400,borderBottom:"1px solid #eaeff7",color:variance===null?"#bbb":over?"#dc2626":"#16a34a"}},variance===null?"—":(over?"+":"")+fmt(Math.abs(variance))+(over?" ⚠️":" ✓"))
                  );
                }),
                e("tr",{style:{background:"#1F4E79"}},
                  e("td",{style:{padding:"10px 14px",fontWeight:700,color:"#fff",position:"sticky",left:0,background:"#1F4E79"}},"GRAND TOTAL"),
                  SOURCES.map(({label})=>e("td",{key:label,style:{padding:"10px 5px",textAlign:"right",fontWeight:700,color:"#fff",fontSize:11}},fmt(srcT[label]))),
                  e("td",{style:{padding:"10px 7px",textAlign:"right",fontWeight:800,color:"#fff",fontSize:13}},fmt(grand)),
                  e("td",{style:{padding:"10px 7px",textAlign:"right",fontWeight:700,color:"#fff"}},fmt(totalBud)),
                  e("td",{style:{padding:"10px 7px",textAlign:"right",fontWeight:700,color:rem!==null?(rem>=0?"#86efac":"#fca5a5"):"#fff"}},rem!==null?(rem>=0?"✓ "+fmt(rem):"⚠️ +"+fmt(Math.abs(rem))):"—")
                )
              )
            )
          )
        )
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
                    e("td",{style:{padding:"7px 10px",borderBottom:"1px solid #eaeff7",textAlign:"right",fontWeight:700,color:"#1F4E79"}},"₹"+fmtN(r.amount))
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
