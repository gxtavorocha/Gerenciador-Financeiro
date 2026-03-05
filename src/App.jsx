import { useState, useRef, useEffect } from "react";

const DEFAULT_CATEGORIES = [
  { id: "moradia",       label: "Moradia",        icon: "🏠", color: "#E8B86D", custom: false },
  { id: "alimentacao",  label: "Alimentação",     icon: "🍽️", color: "#6DBFE8", custom: false },
  { id: "transporte",   label: "Transporte",      icon: "🚗", color: "#8BE86D", custom: false },
  { id: "saude",        label: "Saúde",           icon: "💊", color: "#E86DB8", custom: false },
  { id: "lazer",        label: "Lazer",           icon: "🎭", color: "#A86DE8", custom: false },
  { id: "educacao",     label: "Educação",        icon: "📚", color: "#6DE8C8", custom: false },
  { id: "investimento", label: "Investimento",    icon: "📈", color: "#6DE8A0", custom: false },
  { id: "outros",       label: "Outros",          icon: "✦",  color: "#E8986D", custom: false },
];

const PRESET_COLORS = ["#E8B86D","#6DBFE8","#8BE86D","#E86DB8","#A86DE8","#6DE8C8","#E8986D","#E86D6D","#6D8BE8","#E8D96D","#6DE87A","#E86D9A"];
const PRESET_ICONS  = ["🏠","🍽️","🚗","💊","🎭","📚","✦","💰","🎮","✈️","👗","🐾","🏋️","🎵","📱","🛒","💡","🏦","🎁","🍺","🏥","🧾","✂"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmt  = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtp = (v) => `${v.toFixed(1)}%`;

const LS_TX  = "orcamento_transactions";
const LS_CAT = "orcamento_categories";
const LS_ID  = "orcamento_nextId";

const loadTx  = () => { try { const v = localStorage.getItem(LS_TX);  return v ? JSON.parse(v) : []; } catch { return []; } };
const loadId  = () => { try { const v = localStorage.getItem(LS_ID);  return v ? parseInt(v) : 1; } catch { return 1; } };

const loadCat = () => {
  try {
    const v = localStorage.getItem(LS_CAT);
    if (!v) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(v);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CATEGORIES;
    const defaultIds = DEFAULT_CATEGORIES.map(c => c.id);
    const hasAllDefaults = defaultIds.every(id => parsed.some(c => c.id === id));
    if (!hasAllDefaults) {
      const customOnly = parsed.filter(c => c.custom === true);
      return [...DEFAULT_CATEGORIES, ...customOnly];
    }
    return parsed;
  } catch { return DEFAULT_CATEGORIES; }
};

const calcNextCatId = () => {
  const cats = loadCat();
  const customIds = cats
    .filter(c => c.id && String(c.id).startsWith("c_"))
    .map(c => parseInt(String(c.id).replace("c_", "")))
    .filter(n => !isNaN(n));
  return customIds.length > 0 ? Math.max(...customIds) + 1 : 200;
};

const SAVINGS_MODELS = [
  { id: "5030",  label: "50/30/20",      desc: "Necessidades · Desejos · Poupança",  needs:50, wants:30, save:20 },
  { id: "7020",  label: "70/20/10",      desc: "Gastos · Poupança · Investimento",   needs:70, wants:20, save:10 },
  { id: "6030",  label: "60/30/10",      desc: "Essenciais · Lazer · Poupança",      needs:60, wants:30, save:10 },
  { id: "custom",label: "Personalizado", desc: "Defina seu próprio percentual",      needs:0,  wants:0,  save:0  },
];

function RadialProgress({ pct, size=64, color="#E8B86D" }) {
  const r=(size-8)/2, circ=2*Math.PI*r, dash=Math.min(pct/100,1)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 4px ${color}88)`}}/>
    </svg>
  );
}

function SegmentBar({ segments }) {
  const total = segments.reduce((s,sg)=>s+sg.pct,0);
  return (
    <div style={{display:"flex",borderRadius:99,overflow:"hidden",height:10,gap:2}}>
      {segments.map((sg,i)=>(
        <div key={i} style={{width:`${sg.pct}%`,background:sg.color,minWidth:sg.pct>0?4:0,transition:"width 0.8s cubic-bezier(.4,0,.2,1)",borderRadius:i===0?"99px 0 0 99px":i===segments.length-1?"0 99px 99px 0":"0"}}/>
      ))}
      {total < 100 && <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:"0 99px 99px 0"}}/>}
    </div>
  );
}

const EMPTY_FORM = () => ({
  desc:"", value:"", type:"expense", category:"outros",
  date:new Date().toISOString().slice(0,10),
  received:true, account:"corrente"
});

export default function App() {
  const [transactions, setTransactions] = useState(loadTx);
  const [categories, setCategories]     = useState(loadCat);
  const [view, setView]     = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [catForm, setCatForm] = useState({ label:"", icon:"✦", color:"#E8B86D" });
  const [savModel, setSavModel] = useState("5030");
  const [customSav, setCustomSav] = useState({ needs:50, wants:30, save:20 });
  const [month, setMonth] = useState(new Date().getMonth());
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);
  const nextId    = useRef(loadId());
  const nextCatId = useRef(calcNextCatId());

  useEffect(()=>{ try{localStorage.setItem(LS_TX, JSON.stringify(transactions));}catch{} },[transactions]);
  useEffect(()=>{ try{localStorage.setItem(LS_CAT,JSON.stringify(categories));}catch{} },[categories]);
  useEffect(()=>{ try{localStorage.setItem(LS_ID, String(nextId.current));}catch{} });

  const getCat = (id) => categories.find(c=>c.id===id);

  // Filtra pelo mês/ano
  const filtered = transactions.filter(t=>{ const d=new Date(t.date); return d.getMonth()===month&&d.getFullYear()===year; });

  // ── Conta Corrente ──
  const corrente = filtered.filter(t => (t.account||"corrente") === "corrente");
  const incomeCorrente  = corrente.filter(t=>t.type==="income" &&t.received!==false).reduce((s,t)=>s+t.value,0);
 const expenseCorrente = corrente.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const balanceCorrente = incomeCorrente - expenseCorrente;

  // ── Poupança ──
  const poupanca = filtered.filter(t => t.account === "poupanca");
  const incomePoupanca  = poupanca.filter(t=>t.type==="income" &&t.received!==false).reduce((s,t)=>s+t.value,0);
  const expensePoupanca = poupanca.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const balancePoupanca = incomePoupanca - expensePoupanca;

  // ── Investimentos (categoria especial) ──
  const totalInvestido = filtered.filter(t=>t.type==="expense"&&t.category==="investimento").reduce((s,t)=>s+t.value,0);

  // ── Totais gerais ──
  const totalIncome   = filtered.filter(t=>t.type==="income" &&t.received!==false).reduce((s,t)=>s+t.value,0);
  const totalPending  = filtered.filter(t=>t.type==="income" &&t.received===false).reduce((s,t)=>s+t.value,0);
  const totalExpense = filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const balance = totalIncome - totalExpense;
  const savePct       = totalIncome>0 ? Math.max(0,Math.min(100,(balance/totalIncome)*100)) : 0;

  const byCategory = categories.map(cat=>{
    const total=filtered.filter(t=>t.type==="expense"&&t.category===cat.id).reduce((s,t)=>s+t.value,0);
    return { ...cat, total,
      pctOfExpense: totalExpense>0?(total/totalExpense)*100:0,
      pctOfIncome:  totalIncome >0?(total/totalIncome )*100:0,
    };
  }).filter(c=>c.total>0&&c.id!=="investimento").sort((a,b)=>b.total-a.total);

  const displayList = filter==="all"?filtered:filtered.filter(t=>t.type===filter);

  const model     = SAVINGS_MODELS.find(m=>m.id===savModel);
  const activeSav = savModel==="custom" ? customSav : { needs:model.needs, wants:model.wants, save:model.save };
  const idealSave  = totalIncome * (activeSav.save /100);
  const idealNeeds = totalIncome * (activeSav.needs/100);
  const idealWants = totalIncome * (activeSav.wants/100);
  const saveDiff   = balance - idealSave;

  const toast$ = (msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const openAdd  = () => { setEditingId(null); setForm(EMPTY_FORM()); setShowForm(true); };
  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({ desc:t.desc, value:String(t.value), type:t.type, category:t.category,
      date:t.date, received:t.received!==false, account:t.account||"corrente" });
    setShowForm(true);
  };

  const saveForm = () => {
    if (!form.desc||!form.value) return;
    const payload = {...form, value:parseFloat(form.value)};
    if (payload.type==="expense") delete payload.received;
    if (editingId!==null) {
      setTransactions(p=>p.map(t=>t.id===editingId?{...payload,id:editingId}:t));
      toast$("Transação atualizada!");
    } else {
      setTransactions(p=>[...p,{...payload,id:nextId.current++}]);
      toast$("Transação adicionada!");
    }
    setShowForm(false);
  };

  const toggleReceived = (id) => setTransactions(p=>p.map(t=>t.id===id?{...t,received:!t.received}:t));
  const removeTx  = (id)=>{ setTransactions(p=>p.filter(t=>t.id!==id)); toast$("Removida.","err"); };
  const addCat    = ()=>{
    if (!catForm.label.trim()) return;
    setCategories(p=>[...p,{...catForm,id:"c_"+nextCatId.current++,custom:true}]);
    setCatForm({label:"",icon:"✦",color:"#E8B86D"}); toast$("Categoria criada!");
  };
  const removeCat = (id)=>{ setCategories(p=>p.filter(c=>c.id!==id)); toast$("Removida.","err"); };
  const prevMonth=()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1);
  const nextMonth=()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1);

  const navItems=[
    {id:"dashboard", icon:"◈", label:"Dashboard"},
    {id:"transacoes",icon:"⇄", label:"Transações"},
    {id:"poupanca",  icon:"◎", label:"Poupança"},
    {id:"categorias",icon:"◉", label:"Categorias"},
  ];

  // Label da conta
  const accountLabel = (a) => a==="poupanca" ? "Poupança" : "Conta Corrente";
  const accountColor = (a) => a==="poupanca" ? "var(--green)" : "var(--blue)";

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
      *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
      :root{
        --bg:#0A0B0E; --surface:#111318; --surface2:#181B22; --surface3:#1E2129;
        --border:rgba(255,255,255,0.06); --border2:rgba(255,255,255,0.1);
        --gold:#E8B86D; --gold2:#F5D08A;
        --text:#F0EEE8; --text2:rgba(240,238,232,0.55); --text3:rgba(240,238,232,0.28);
        --green:#6DE8A0; --red:#E87A6D; --blue:#6DB4E8;
        --font-body:'Sora',sans-serif; --font-display:'Cormorant Garamond',serif;
      }
      html,body,#root{width:100%;min-height:100vh;margin:0;padding:0;}
      body{background:var(--bg);color:var(--text);font-family:var(--font-body);overflow-x:hidden;}
      ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:rgba(232,184,109,0.2);border-radius:3px;}
      .layout{display:flex;min-height:100vh;}

      /* Sidebar */
      .sidebar{width:240px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;}
      .sidebar-logo{padding:28px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;}
      .logo-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#E8B86D,#F5D08A);display:flex;align-items:center;justify-content:center;font-size:16px;color:#0A0B0E;font-weight:800;box-shadow:0 4px 16px rgba(232,184,109,0.35);flex-shrink:0;}
      .logo-text{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--text);line-height:1;}
      .logo-sub{font-size:9px;font-weight:500;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;}
      .sidebar-nav{flex:1;padding:18px 14px;display:flex;flex-direction:column;gap:3px;}
      .nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all 0.2s;color:var(--text2);font-size:13px;font-weight:500;border:1px solid transparent;user-select:none;}
      .nav-item:hover{background:var(--surface2);color:var(--text);}
      .nav-item.active{background:linear-gradient(135deg,rgba(232,184,109,0.12),rgba(232,184,109,0.06));border-color:rgba(232,184,109,0.2);color:var(--gold);}
      .nav-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0;}
      .sidebar-month{padding:16px 14px;border-top:1px solid var(--border);}
      .month-label-sm{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px;}
      .month-ctrl{display:flex;align-items:center;gap:8px;}
      .m-arrow{background:var(--surface2);border:1px solid var(--border2);color:var(--text2);border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-family:var(--font-body);flex-shrink:0;}
      .m-arrow:hover{background:var(--surface3);color:var(--text);border-color:rgba(232,184,109,0.3);}
      .m-name{flex:1;text-align:center;font-size:13px;font-weight:600;color:var(--gold);}
      .sidebar-add{padding:14px;border-top:1px solid var(--border);}
      .btn-add-tx{width:100%;padding:11px;border-radius:12px;background:linear-gradient(135deg,#E8B86D,#F0C97A);border:none;color:#0A0B0E;font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(232,184,109,0.3);}
      .btn-add-tx:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(232,184,109,0.4);}

      /* Content */
      .content{flex:1;padding:32px 36px;overflow-y:auto;min-width:0;}
      .page-title{font-family:var(--font-display);font-size:32px;font-weight:700;color:var(--text);margin-bottom:4px;font-style:italic;}
      .page-sub{font-size:12px;color:var(--text3);font-weight:500;margin-bottom:28px;letter-spacing:0.3px;}

      /* Cards */
      .cards-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px;}
      .cards-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;}
      .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;position:relative;overflow:hidden;transition:all 0.2s;}
      .stat-card::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);}
      .stat-card:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.3);}
      .stat-card.accent{border-color:rgba(232,184,109,0.2);background:linear-gradient(135deg,var(--surface),rgba(232,184,109,0.04));}
      .stat-card.green-accent{border-color:rgba(109,232,160,0.2);background:linear-gradient(135deg,var(--surface),rgba(109,232,160,0.04));}
      .stat-card.blue-accent{border-color:rgba(109,180,232,0.2);background:linear-gradient(135deg,var(--surface),rgba(109,180,232,0.04));}
      .stat-icon{font-size:20px;margin-bottom:12px;display:block;}
      .stat-label{font-size:10px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:var(--text3);margin-bottom:7px;}
      .stat-value{font-family:var(--font-display);font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1;margin-bottom:5px;}
      .stat-sub{font-size:11px;color:var(--text3);font-weight:500;}
      .ring-wrap{position:absolute;top:18px;right:18px;}
      .ring-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;}

      /* Section divider */
      .section-divider{display:flex;align-items:center;gap:10px;margin-bottom:12px;margin-top:4px;}
      .section-divider-label{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--text3);white-space:nowrap;}
      .section-divider-line{flex:1;height:1px;background:var(--border);}

      /* Two col */
      .two-col{display:grid;grid-template-columns:1fr 300px;gap:16px;}
      .panel{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px;}
      .panel-title{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:18px;display:flex;align-items:center;gap:8px;}
      .panel-title::after{content:'';flex:1;height:1px;background:var(--border);}

      /* Investimento banner */
      .invest-banner{background:linear-gradient(135deg,rgba(109,232,160,0.06),rgba(109,232,160,0.02));border:1px solid rgba(109,232,160,0.2);border-radius:16px;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;gap:16px;}
      .invest-icon{width:44px;height:44px;border-radius:12px;background:rgba(109,232,160,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
      .invest-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(109,232,160,0.6);margin-bottom:4px;}
      .invest-value{font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--green);}
      .invest-sub{font-size:11px;color:var(--text3);margin-top:3px;}

      /* TX rows */
      .tx-row{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);transition:all 0.15s;}
      .tx-row:last-child{border-bottom:none;padding-bottom:0;}
      .tx-row:first-child{padding-top:0;}
      .tx-row.dim{opacity:0.45;}
      .tx-row:hover{opacity:1!important;}
      .tx-avatar{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
      .tx-info{flex:1;min-width:0;}
      .tx-name{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tx-meta{font-size:11px;color:var(--text3);margin-top:2px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
      .tx-cat-dot{width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0;}
      .tx-acct-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;}
      .tx-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;cursor:pointer;user-select:none;transition:all 0.15s;flex-shrink:0;white-space:nowrap;}
      .badge-green{background:rgba(109,232,160,0.1);border:1px solid rgba(109,232,160,0.2);color:var(--green);}
      .badge-gold{background:rgba(232,184,109,0.1);border:1px solid rgba(232,184,109,0.2);color:var(--gold);}
      .tx-amount{font-size:14px;font-weight:700;font-family:var(--font-display);flex-shrink:0;}
      .tx-actions{display:flex;gap:4px;flex-shrink:0;}
      .tx-btn{background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:4px 7px;border-radius:7px;transition:all 0.15s;font-family:var(--font-body);}
      .tx-btn.edit:hover{color:var(--gold);background:rgba(232,184,109,0.1);}
      .tx-btn.del:hover{color:var(--red);background:rgba(232,122,109,0.1);}

      /* Category bars */
      .cat-bar-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
      .cat-bar-row:last-child{margin-bottom:0;}
      .cat-emoji{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
      .cat-bar-track{height:4px;border-radius:99px;background:var(--surface3);flex:1;overflow:hidden;}
      .cat-bar-fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1);}
      .cat-pct-badges{display:flex;gap:5px;flex-shrink:0;}
      .pct-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;}

      /* Filters */
      .filter-row{display:flex;gap:8px;margin-bottom:20px;align-items:center;}
      .filter-chip{padding:6px 16px;border-radius:99px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-body);cursor:pointer;transition:all 0.18s;}
      .filter-chip:hover{border-color:rgba(232,184,109,0.3);color:var(--text);}
      .filter-chip.on{background:rgba(232,184,109,0.12);border-color:rgba(232,184,109,0.35);color:var(--gold);}
      .filter-count{margin-left:auto;font-size:11px;color:var(--text3);font-weight:500;}
      .tx-table{background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;}
      .tx-table-row{display:flex;align-items:center;gap:14px;padding:13px 20px;border-bottom:1px solid var(--border);transition:background 0.15s;}
      .tx-table-row:last-child{border-bottom:none;}
      .tx-table-row:hover{background:var(--surface2);}
      .tx-table-row.dim{opacity:0.45;}
      .tx-table-row.dim:hover{opacity:1;}

      /* Account toggle */
      .acct-toggle{display:flex;gap:8px;margin-bottom:16px;}
      .acct-btn{flex:1;padding:10px;border-radius:12px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font-size:12px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:all 0.18s;display:flex;align-items:center;justify-content:center;gap:6px;}
      .acct-btn.corrente{border-color:rgba(109,180,232,0.4);background:rgba(109,180,232,0.08);color:var(--blue);}
      .acct-btn.poupanca{border-color:rgba(109,232,160,0.4);background:rgba(109,232,160,0.08);color:var(--green);}

      /* Savings page */
      .sav-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
      .sav-model-btn{padding:14px 18px;border-radius:14px;border:1px solid var(--border2);background:var(--surface);cursor:pointer;transition:all 0.18s;text-align:left;font-family:var(--font-body);}
      .sav-model-btn:hover{border-color:rgba(232,184,109,0.3);background:var(--surface2);}
      .sav-model-btn.on{border-color:rgba(232,184,109,0.4);background:linear-gradient(135deg,var(--surface),rgba(232,184,109,0.06));}
      .sav-model-name{font-size:15px;font-weight:700;color:var(--gold);font-family:var(--font-display);margin-bottom:3px;}
      .sav-model-desc{font-size:11px;color:var(--text3);font-weight:500;}
      .sav-status-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);}
      .sav-status-row:last-child{border-bottom:none;}
      .sav-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
      .custom-sav-inputs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px;}
      .sav-input-wrap{text-align:center;}
      .sav-inp-label{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;display:block;}
      .sav-inp{width:100%;padding:9px 10px;border-radius:10px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:14px;font-weight:700;text-align:center;outline:none;font-family:var(--font-body);transition:all 0.15s;}
      .sav-inp:focus{border-color:rgba(232,184,109,0.5);}

      /* Categories page */
      .cat-page{display:grid;grid-template-columns:1fr 360px;gap:16px;}
      .cat-list-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);margin-bottom:8px;transition:all 0.15s;}
      .cat-list-item:hover{border-color:var(--border2);}
      .cat-list-item:last-child{margin-bottom:0;}

      /* Form / Modal */
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      .modal{background:var(--surface);border:1px solid var(--border2);border-radius:24px;padding:32px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.6);animation:slideUp 0.3s cubic-bezier(.4,0,.2,1);}
      @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      .modal-title{font-family:var(--font-display);font-size:26px;font-weight:700;font-style:italic;color:var(--gold);margin-bottom:24px;}
      .field{margin-bottom:16px;}
      .field-label{display:block;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--text3);margin-bottom:7px;}
      .field-input{width:100%;padding:11px 14px;border-radius:12px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:14px;font-weight:500;font-family:var(--font-body);outline:none;transition:all 0.18s;}
      .field-input:focus{border-color:rgba(232,184,109,0.5);box-shadow:0 0 0 3px rgba(232,184,109,0.1);background:var(--surface3);}
      input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5);cursor:pointer;}
      select.field-input option{background:var(--surface2);color:var(--text);}
      .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .type-toggle{display:flex;gap:8px;margin-bottom:16px;}
      .type-btn{flex:1;padding:10px;border-radius:12px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:all 0.18s;}
      .type-btn.expense{border-color:rgba(232,122,109,0.4);background:rgba(232,122,109,0.08);color:var(--red);}
      .type-btn.income{border-color:rgba(109,232,160,0.4);background:rgba(109,232,160,0.08);color:var(--green);}
      .status-row{display:flex;gap:8px;}
      .status-btn{flex:1;padding:9px;border-radius:10px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font-size:12px;font-weight:700;font-family:var(--font-body);cursor:pointer;transition:all 0.15s;}
      .status-btn.s-ok{border-color:rgba(109,232,160,0.35);background:rgba(109,232,160,0.08);color:var(--green);}
      .status-btn.s-pend{border-color:rgba(232,184,109,0.35);background:rgba(232,184,109,0.08);color:var(--gold);}
      .info-note{font-size:11px;color:var(--gold);background:rgba(232,184,109,0.07);border:1px solid rgba(232,184,109,0.15);border-radius:9px;padding:8px 12px;margin-top:8px;line-height:1.5;}
      .btn-primary{width:100%;padding:13px;border-radius:14px;background:linear-gradient(135deg,#E8B86D,#F0C97A);color:#0A0B0E;border:none;font-size:14px;font-weight:800;font-family:var(--font-body);cursor:pointer;margin-top:8px;box-shadow:0 4px 20px rgba(232,184,109,0.3);transition:all 0.2s;}
      .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(232,184,109,0.4);}
      .btn-ghost{width:100%;padding:10px;border-radius:12px;background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:13px;font-weight:600;font-family:var(--font-body);cursor:pointer;margin-top:8px;transition:all 0.15s;}
      .btn-ghost:hover{background:var(--surface2);color:var(--text);}
      .icon-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;}
      .icon-opt{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;border:1.5px solid transparent;transition:all 0.14s;background:var(--surface2);}
      .icon-opt:hover{background:var(--surface3);}
      .icon-opt.sel{border-color:var(--gold);background:rgba(232,184,109,0.1);}
      .color-dot{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;transition:all 0.15s;flex-shrink:0;}
      .color-dot:hover{transform:scale(1.15);}
      .color-dot.sel{border-color:#fff;transform:scale(1.18);box-shadow:0 0 0 1px rgba(0,0,0,0.4);}
      .cat-preview{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;margin-top:12px;}
      .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);border-radius:14px;padding:12px 20px;z-index:200;font-size:13px;font-weight:600;color:var(--text);box-shadow:0 8px 32px rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px;animation:slideUp 0.25s ease;white-space:nowrap;}
      .toast-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
      .empty{color:var(--text3);font-size:13px;text-align:center;padding:32px 0;font-weight:500;}
    `}</style>

    <div className="layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">₿</div>
          <div>
            <div className="logo-text">Orçamento</div>
            <div className="logo-sub">Gestor financeiro</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n=>(
            <div key={n.id} className={`nav-item${view===n.id?" active":""}`} onClick={()=>setView(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span style={{fontWeight:600}}>{n.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-month">
          <div className="month-label-sm">Período</div>
          <div className="month-ctrl">
            <button className="m-arrow" onClick={prevMonth}>‹</button>
            <span className="m-name">{MONTHS[month].slice(0,3)} {year}</span>
            <button className="m-arrow" onClick={nextMonth}>›</button>
          </div>
        </div>
        <div className="sidebar-add">
          <button className="btn-add-tx" onClick={openAdd}>
            <span style={{fontSize:18,lineHeight:1}}>+</span> Nova Transação
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="content">

        {/* ── DASHBOARD ── */}
        {view==="dashboard" && (<>
          <div className="page-title">Visão Geral</div>
          <div className="page-sub">{MONTHS[month]} {year} · {filtered.length} transações</div>

          {/* Linha 1 — resumo geral */}
          <div className="section-divider">
            <span className="section-divider-label">Resumo do mês</span>
            <div className="section-divider-line"/>
          </div>
          <div className="cards-grid" style={{marginBottom:24}}>
            <div className="stat-card">
              <span className="stat-icon">💲</span>
              <div className="stat-label">Receitas</div>
              <div className="stat-value" style={{color:"var(--green)"}}>{fmt(totalIncome)}</div>
              <div className="stat-sub">{filtered.filter(t=>t.type==="income"&&t.received!==false).length} confirmadas</div>
            </div>
            <div className="stat-card accent">
              <span className="stat-icon">⏳</span>
              <div className="stat-label">A Receber</div>
              <div className="stat-value" style={{color:"var(--gold)"}}>{fmt(totalPending)}</div>
              <div className="stat-sub">{filtered.filter(t=>t.type==="income"&&t.received===false).length} pendentes</div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🧾</span>
              <div className="stat-label">Despesas</div>
              <div className="stat-value" style={{color:"var(--red)"}}>{fmt(totalExpense)}</div>
              <div className="stat-sub">{totalIncome>0?fmtp((totalExpense/totalIncome)*100):"—"} da renda</div>
            </div>
            <div className="stat-card accent">
              <div className="ring-wrap">
                <RadialProgress pct={savePct} color={balance>=0?"var(--gold)":"var(--red)"} size={64}/>
                <div className="ring-pct" style={{color:balance>=0?"var(--gold)":"var(--red)"}}>{savePct.toFixed(0)}%</div>
              </div>
              <span className="stat-icon">◈</span>
              <div className="stat-label">Saldo Geral</div>
              <div className="stat-value" style={{color:balance>=0?"var(--gold)":"var(--red)",fontSize:24}}>{fmt(balance)}</div>
              <div className="stat-sub">saldo em conta</div>
            </div>
          </div>

          {/* Linha 2 — contas separadas */}
          <div className="section-divider">
            <span className="section-divider-label">Por conta</span>
            <div className="section-divider-line"/>
          </div>
          <div className="cards-grid-3" style={{marginBottom:24}}>
            <div className="stat-card blue-accent">
              <span className="stat-icon">🏦</span>
              <div className="stat-label">Conta Corrente</div>
              <div className="stat-value" style={{color:"var(--blue)",fontSize:22}}>{fmt(balanceCorrente)}</div>
              <div className="stat-sub">
                <span style={{color:"var(--green)"}}>+{fmt(incomeCorrente)}</span>
                <span style={{margin:"0 4px",color:"var(--text3)"}}>·</span>
                <span style={{color:"var(--red)"}}>-{fmt(expenseCorrente)}</span>
              </div>
            </div>
            <div className="stat-card green-accent">
              <span className="stat-icon">🏛️</span>
              <div className="stat-label">Poupança</div>
              <div className="stat-value" style={{color:"var(--green)",fontSize:22}}>{fmt(balancePoupanca)}</div>
              <div className="stat-sub">
                <span style={{color:"var(--green)"}}>+{fmt(incomePoupanca)}</span>
                <span style={{margin:"0 4px",color:"var(--text3)"}}>·</span>
                <span style={{color:"var(--red)"}}>-{fmt(expensePoupanca)}</span>
              </div>
            </div>
            <div className="stat-card" style={{borderColor:"rgba(109,232,160,0.15)",background:"linear-gradient(135deg,var(--surface),rgba(109,232,160,0.03))"}}>
              <span className="stat-icon">📈</span>
              <div className="stat-label">Investimentos</div>
              <div className="stat-value" style={{color:"var(--green)",fontSize:22}}>{fmt(totalInvestido)}</div>
              <div className="stat-sub">{totalIncome>0?fmtp((totalInvestido/totalIncome)*100):"—"} da renda investidos</div>
            </div>
          </div>

          {/* Transações + categorias */}
          <div className="two-col">
            <div className="panel">
              <div className="panel-title">Últimas Transações</div>
              {filtered.length===0 && <div className="empty">Nenhuma transação neste mês.</div>}
              {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8).map(t=>{
                const cat=getCat(t.category); const pend=t.type==="income"&&t.received===false;
                const acct=t.account||"corrente";
                return (
                  <div key={t.id} className={`tx-row${pend?" dim":""}`}>
                    <div className="tx-avatar" style={{background:(cat?.color||"#888")+"18"}}>{cat?.icon||"✦"}</div>
                    <div className="tx-info">
                      <div className="tx-name">{t.desc}</div>
                      <div className="tx-meta">
                        <span>{new Date(t.date+"T12:00:00").toLocaleDateString("pt-BR")}</span>
                        <span className="tx-cat-dot" style={{background:cat?.color||"#888"}}/>
                        <span style={{color:cat?.color||"var(--text3)"}}>{cat?.label}</span>
                        <span className="tx-acct-badge" style={{background:accountColor(acct)+"18",color:accountColor(acct)}}>
                          {accountLabel(acct)}
                        </span>
                      </div>
                    </div>
                    {t.type==="income" && (
                      <span className={`tx-badge ${t.received!==false?"badge-green":"badge-gold"}`} onClick={()=>toggleReceived(t.id)}>
                        {t.received!==false?"✓ recebido":"⏳ pendente"}
                      </span>
                    )}
                    <div className="tx-amount" style={{color:t.type==="income"?"var(--green)":"var(--red)"}}>{t.type==="income"?"+":"-"}{fmt(t.value)}</div>
                    <div className="tx-actions">
                      <button className="tx-btn edit" onClick={()=>openEdit(t)}>✎</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="panel">
              <div className="panel-title">Por Categoria</div>
              {byCategory.length===0 && <div className="empty">Sem despesas neste mês.</div>}
              {byCategory.map(cat=>(
                <div key={cat.id} className="cat-bar-row">
                  <div className="cat-emoji" style={{background:cat.color+"18"}}>{cat.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{cat.label}</span>
                      <div className="cat-pct-badges">
                        <span className="pct-badge" style={{background:cat.color+"18",color:cat.color}}>{fmtp(cat.pctOfExpense)} gastos</span>
                        {totalIncome>0 && <span className="pct-badge" style={{background:"rgba(255,255,255,0.05)",color:"var(--text3)"}}>{fmtp(cat.pctOfIncome)} renda</span>}
                      </div>
                    </div>
                    <div className="cat-bar-track">
                      <div className="cat-bar-fill" style={{width:`${Math.min(cat.pctOfExpense,100)}%`,background:cat.color,boxShadow:`0 0 6px ${cat.color}66`}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ── TRANSAÇÕES ── */}
        {view==="transacoes" && (<>
          <div className="page-title">Transações</div>
          <div className="page-sub">{MONTHS[month]} {year}</div>
          <div className="filter-row">
            {[["all","Todas"],["income","Receitas"],["expense","Despesas"]].map(([v,l])=>(
              <button key={v} className={`filter-chip${filter===v?" on":""}`} onClick={()=>setFilter(v)}>{l}</button>
            ))}
            <span className="filter-count">{displayList.length} registros</span>
          </div>
          <div className="tx-table">
            {displayList.length===0 && <div className="empty">Nenhuma transação encontrada.</div>}
            {[...displayList].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>{
              const cat=getCat(t.category); const pend=t.type==="income"&&t.received===false;
              const acct=t.account||"corrente";
              return (
                <div key={t.id} className={`tx-table-row${pend?" dim":""}`}>
                  <div className="tx-avatar" style={{background:(cat?.color||"#888")+"18"}}>{cat?.icon||"✦"}</div>
                  <div className="tx-info">
                    <div className="tx-name">{t.desc}</div>
                    <div className="tx-meta">
                      <span>{new Date(t.date+"T12:00:00").toLocaleDateString("pt-BR")}</span>
                      <span className="tx-cat-dot" style={{background:cat?.color||"#888"}}/>
                      <span style={{color:cat?.color||"var(--text3)"}}>{cat?.label}</span>
                      <span className="tx-acct-badge" style={{background:accountColor(acct)+"18",color:accountColor(acct)}}>
                        {accountLabel(acct)}
                      </span>
                    </div>
                  </div>
                  {t.type==="income" && (
                    <span className={`tx-badge ${t.received!==false?"badge-green":"badge-gold"}`} onClick={()=>toggleReceived(t.id)}>
                      {t.received!==false?"✓ recebido":"⏳ pendente"}
                    </span>
                  )}
                  <div className="tx-amount" style={{color:t.type==="income"?"var(--green)":"var(--red)"}}>{t.type==="income"?"+":"-"}{fmt(t.value)}</div>
                  <div className="tx-actions">
                    <button className="tx-btn edit" onClick={()=>openEdit(t)}>✎</button>
                    <button className="tx-btn del"  onClick={()=>removeTx(t.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ── POUPANÇA ── */}
        {view==="poupanca" && (<>
          <div className="page-title">Meta de Poupança</div>
          <div className="page-sub">Calcule quanto você deveria guardar com base na sua renda de {MONTHS[month]}</div>
          <div className="sav-grid">
            {SAVINGS_MODELS.map(m=>(
              <button key={m.id} className={`sav-model-btn${savModel===m.id?" on":""}`} onClick={()=>setSavModel(m.id)}>
                <div className="sav-model-name">{m.label}</div>
                <div className="sav-model-desc">{m.desc}</div>
                {m.id!=="custom" && <div style={{marginTop:8,fontSize:11,color:"var(--gold)",fontWeight:700}}>Guardar: {m.save}% da renda</div>}
              </button>
            ))}
          </div>
          {savModel==="custom" && (
            <div className="panel" style={{marginBottom:16}}>
              <div className="panel-title">Defina seus percentuais</div>
              <div className="custom-sav-inputs">
                {[["needs","Necessidades"],["wants","Desejos"],["save","Poupança"]].map(([k,l])=>(
                  <div key={k} className="sav-input-wrap">
                    <span className="sav-inp-label">{l}</span>
                    <div style={{position:"relative"}}>
                      <input className="sav-inp" type="number" min="0" max="100" value={customSav[k]}
                        onChange={e=>setCustomSav(p=>({...p,[k]:parseFloat(e.target.value)||0}))}/>
                      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--text3)",fontWeight:700,pointerEvents:"none"}}>%</span>
                    </div>
                  </div>
                ))}
              </div>
              {(customSav.needs+customSav.wants+customSav.save)!==100 && (
                <div style={{marginTop:12,fontSize:11,color:"var(--red)",fontWeight:600}}>⚠ Total: {customSav.needs+customSav.wants+customSav.save}% (deve ser 100%)</div>
              )}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div className="panel">
              <div className="panel-title">Distribuição Ideal — {MONTHS[month]}</div>
              {totalIncome===0 ? <div className="empty">Adicione receitas confirmadas para calcular.</div> : (<>
                {[
                  {label:"Necessidades",           pct:activeSav.needs, value:idealNeeds, color:"var(--blue)"},
                  {label:"Desejos / Lazer",         pct:activeSav.wants, value:idealWants, color:"var(--gold)"},
                  {label:"Poupança / Investimento", pct:activeSav.save,  value:idealSave,  color:"var(--green)"},
                ].map((r,i)=>(
                  <div key={i} className="sav-status-row">
                    <div className="sav-dot" style={{background:r.color}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{r.label}</div>
                      <div style={{fontSize:11,color:"var(--text3)"}}>{r.pct}% da renda</div>
                    </div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:r.color}}>{fmt(r.value)}</div>
                  </div>
                ))}
                <div style={{marginTop:16}}>
                  <SegmentBar segments={[{color:"var(--blue)",pct:activeSav.needs},{color:"var(--gold)",pct:activeSav.wants},{color:"var(--green)",pct:activeSav.save}]}/>
                  <div style={{display:"flex",gap:14,marginTop:8}}>
                    {[["var(--blue)","Necessidades"],["var(--gold)","Desejos"],["var(--green)","Poupança"]].map(([c,l])=>(
                      <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"var(--text3)",fontWeight:600}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:c}}/>{l}
                      </div>
                    ))}
                  </div>
                </div>
              </>)}
            </div>
            <div className="panel">
              <div className="panel-title">Realidade vs Meta</div>
              {totalIncome===0 ? <div className="empty">Sem receitas para comparar.</div> : (<>
                {[
                  {label:"Renda confirmada", value:totalIncome,  color:"var(--green)", sub:"base de cálculo"},
                  {label:"Total gasto",      value:totalExpense, color:"var(--red)",   sub:`${fmtp((totalExpense/totalIncome)*100)} da renda`},
                  {label:"Investido",        value:totalInvestido,color:"var(--green)",sub:`${fmtp((totalInvestido/totalIncome)*100)} da renda`},
                  {label:"Saldo atual",      value:balance,      color:balance>=0?"var(--gold)":"var(--red)", sub:`${fmtp(savePct)} guardado`},
                  {label:"Meta de poupança", value:idealSave,    color:"var(--green)", sub:`${activeSav.save}% ideal`},
                  {label:"Diferença",        value:saveDiff,     color:saveDiff>=0?"var(--green)":"var(--red)", sub:saveDiff>=0?"✓ acima da meta":"✕ abaixo da meta"},
                ].map((r,i)=>(
                  <div key={i} className="sav-status-row">
                    <div className="sav-dot" style={{background:r.color}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:1}}>{r.label}</div>
                      <div style={{fontSize:11,color:"var(--text3)"}}>{r.sub}</div>
                    </div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,color:r.color}}>{fmt(Math.abs(r.value))}</div>
                  </div>
                ))}
                <div style={{marginTop:16,padding:"12px 14px",borderRadius:12,background:saveDiff>=0?"rgba(109,232,160,0.06)":"rgba(232,122,109,0.06)",border:`1px solid ${saveDiff>=0?"rgba(109,232,160,0.2)":"rgba(232,122,109,0.2)"}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:saveDiff>=0?"var(--green)":"var(--red)",lineHeight:1.5}}>
                    {saveDiff>=0
                      ? `🎉 Parabéns! Você está guardando ${fmtp(savePct)} — ${fmt(saveDiff)} acima da meta.`
                      : `⚠ Você guarda ${fmtp(savePct)} mas a meta é ${activeSav.save}%. Faltam ${fmt(Math.abs(saveDiff))}.`}
                  </div>
                </div>
              </>)}
            </div>
          </div>
        </>)}

        {/* ── CATEGORIAS ── */}
        {view==="categorias" && (<>
          <div className="page-title">Categorias</div>
          <div className="page-sub">Gerencie suas categorias de gastos</div>
          <div className="cat-page">
            <div className="panel">
              <div className="panel-title">Categorias Ativas ({categories.length})</div>
              {categories.map(cat=>(
                <div key={cat.id} className="cat-list-item">
                  <div style={{width:34,height:34,borderRadius:10,background:cat.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cat.icon}</div>
                  <span style={{flex:1,fontSize:14,fontWeight:600,color:"var(--text)"}}>{cat.label}</span>
                  <div style={{width:8,height:8,borderRadius:"50%",background:cat.color,marginRight:6}}/>
                  {cat.custom
                    ? <button onClick={()=>removeCat(cat.id)} style={{background:"rgba(232,122,109,0.08)",border:"1px solid rgba(232,122,109,0.2)",color:"var(--red)",cursor:"pointer",fontSize:12,padding:"4px 10px",borderRadius:8,fontWeight:700,transition:"all 0.15s",fontFamily:"var(--font-body)"}}>Remover</button>
                    : <span style={{fontSize:10,fontWeight:700,color:"var(--text3)",letterSpacing:"0.5px",background:"var(--surface3)",padding:"3px 8px",borderRadius:6}}>padrão</span>
                  }
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="panel-title">Nova Categoria</div>
              <div className="field">
                <label className="field-label">Nome</label>
                <input className="field-input" placeholder="Ex: Pets, Investimentos..." value={catForm.label} onChange={e=>setCatForm(f=>({...f,label:e.target.value}))}/>
              </div>
              <div className="field">
                <label className="field-label" style={{marginBottom:8}}>Ícone</label>
                <div className="icon-grid">
                  {PRESET_ICONS.map(ic=>(
                    <div key={ic} className={`icon-opt${catForm.icon===ic?" sel":""}`} onClick={()=>setCatForm(f=>({...f,icon:ic}))}>{ic}</div>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-label" style={{marginBottom:10}}>Cor</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {PRESET_COLORS.map(col=>(
                    <div key={col} className={`color-dot${catForm.color===col?" sel":""}`} style={{background:col}} onClick={()=>setCatForm(f=>({...f,color:col}))}/>
                  ))}
                </div>
                <div className="cat-preview" style={{background:catForm.color+"12",border:`1px solid ${catForm.color}30`}}>
                  <div style={{width:32,height:32,borderRadius:10,background:catForm.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{catForm.icon}</div>
                  <span style={{fontSize:14,fontWeight:700,color:catForm.color}}>{catForm.label||"Prévia"}</span>
                </div>
              </div>
              <button className="btn-primary" onClick={addCat}>+ Criar Categoria</button>
            </div>
          </div>
        </>)}
      </main>
    </div>

    {/* ── MODAL ADD / EDIT ── */}
    {showForm && (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
        <div className="modal">
          <div className="modal-title">{editingId!==null?"Editar Transação":"Nova Transação"}</div>

          {/* Tipo */}
          <div className="type-toggle">
            <button className={`type-btn${form.type==="expense"?" expense":""}`} onClick={()=>setForm(f=>({...f,type:"expense"}))}>↓ Despesa</button>
            <button className={`type-btn${form.type==="income"?" income":""}`}  onClick={()=>setForm(f=>({...f,type:"income"}))}>↑ Receita</button>
          </div>

          {/* Conta */}
          <div className="field">
            <label className="field-label">Conta</label>
            <div className="acct-toggle">
              <button className={`acct-btn${form.account==="corrente"?" corrente":""}`} onClick={()=>setForm(f=>({...f,account:"corrente"}))}>🏦 Conta Corrente</button>
              <button className={`acct-btn${form.account==="poupanca"?" poupanca":""}`} onClick={()=>setForm(f=>({...f,account:"poupanca"}))}>🏛️ Poupança</button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Descrição</label>
            <input className="field-input" placeholder="Ex: Aluguel, Salário..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
          </div>

          <div className="row2" style={{marginBottom:16}}>
            <div className="field" style={{margin:0}}>
              <label className="field-label">Valor (R$)</label>
              <input className="field-input" type="number" placeholder="0,00" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))}/>
            </div>
            <div className="field" style={{margin:0}}>
              <label className="field-label">Data</label>
              <input className="field-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Categoria</label>
            <select className="field-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          {form.type==="income" && (
            <div className="field">
              <label className="field-label">Status do Recebimento</label>
              <div className="status-row">
                <button className={`status-btn${form.received!==false?" s-ok":""}`} onClick={()=>setForm(f=>({...f,received:true}))}>✓ Recebido</button>
                <button className={`status-btn${form.received===false?" s-pend":""}`} onClick={()=>setForm(f=>({...f,received:false}))}>⏳ A Receber</button>
              </div>
              {form.received===false && <div className="info-note">Não contabilizado no saldo até ser marcado como recebido.</div>}
            </div>
          )}

          <button className="btn-primary" onClick={saveForm}>{editingId!==null?"Salvar Alterações":"Adicionar Transação"}</button>
          <button className="btn-ghost" onClick={()=>setShowForm(false)}>Cancelar</button>
        </div>
      </div>
    )}

    {toast && (
      <div className="toast">
        <div className="toast-dot" style={{background:toast.type==="err"?"var(--red)":"var(--green)"}}/>
        {toast.msg}
      </div>
    )}
  </>);
}