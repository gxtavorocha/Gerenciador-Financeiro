import './styles/App.css';
import { useState, useRef, useEffect, useMemo } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";



const LS_TX="orcpro_tx"; const LS_CAT="orcpro_cat"; const LS_PLAN="orcpro_plan";
const LS_CUSTBUD="orcpro_custbud"; const LS_CUSTPLANS="orcpro_custplans"; const LS_CARDS="orcpro_cards";

const loadTx       = ()=>{ try{const v=localStorage.getItem(LS_TX);       return v?JSON.parse(v):SAMPLE_TX;}         catch{return SAMPLE_TX;} };
const loadCat      = ()=>{ try{const v=localStorage.getItem(LS_CAT);      return v?JSON.parse(v):DEFAULT_CATEGORIES;}catch{return DEFAULT_CATEGORIES;} };
const loadPlan     = ()=>{ try{const v=localStorage.getItem(LS_PLAN);     return v||"50-30-20";}                     catch{return "50-30-20";} };
const loadCustBud  = ()=>{ try{const v=localStorage.getItem(LS_CUSTBUD);  return v?JSON.parse(v):[];}                catch{return [];} };
const loadCustPlans= ()=>{ try{const v=localStorage.getItem(LS_CUSTPLANS);return v?JSON.parse(v):[];}                catch{return [];} };
const loadCards    = ()=>{ try{const v=localStorage.getItem(LS_CARDS);    return v?JSON.parse(v):DEFAULT_CARDS;}     catch{return DEFAULT_CARDS;} };

const fmt    = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtPct = v => `${parseFloat(v).toFixed(1)}%`;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function RadialProgress({ pct, size=64, color="#E8B86D", trackColor="rgba(255,255,255,0.06)" }) {
  const r=(size-8)/2, circ=2*Math.PI*r, dash=Math.min(pct/100,1)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 5px ${color}99)`}}/>
    </svg>
  );
}

const TT = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:"#181B22",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"10px 14px",fontSize:12}}>
      <div style={{color:"rgba(240,238,232,0.4)",marginBottom:6,fontWeight:600}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color,fontWeight:700,marginBottom:2}}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  );
};

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [transactions, setTransactions] = useState(loadTx);
  const [categories,   setCategories]   = useState(loadCat);
  const [view,         setView]         = useState("dashboard");
  const [showForm,     setShowForm]     = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [form,         setForm]         = useState({desc:"",value:"",type:"expense",category:"outros",date:new Date().toISOString().slice(0,10),received:true});
  const [catForm,      setCatForm]      = useState({label:"",icon:"✦",color:"#E8B86D"});
  const [month,        setMonth]        = useState(new Date().getMonth());
  const [year,         setYear]         = useState(new Date().getFullYear());
  const [toast,        setToast]        = useState(null);
  const [activePlanId, setActivePlanId] = useState(loadPlan);
  const [customBudget, setCustomBudget] = useState(loadCustBud);
  const [customPlans,  setCustomPlans]  = useState(loadCustPlans);
  const [cards,        setCards]        = useState(loadCards);
  const [showCardModal,setShowCardModal]= useState(false);
  const [editingCard,  setEditingCard]  = useState(null); // null = new, id = editing
  const [cardForm,     setCardForm]     = useState({name:"",digits:"",flag:"Visa",limit:"",balance:"",due:"",gradIdx:0});
  const [showPlanModal,setShowPlanModal]= useState(false);
  const [newPlanForm,  setNewPlanForm]  = useState({name:"",groups:[
    {label:"Grupo A",pct:50,color:"#6DBFE8",icon:"🏠"},
    {label:"Grupo B",pct:30,color:"#A86DE8",icon:"🎭"},
    {label:"Reserva", pct:20,color:"#6DE8A0",icon:"💰"},
  ]});
  const [budTab, setBudTab] = useState("planos");
  const nextId=useRef(100); const nextCatId=useRef(500); const nextPlanId=useRef(900);

  useEffect(()=>{try{localStorage.setItem(LS_TX,JSON.stringify(transactions))}catch{}},[transactions]);
  useEffect(()=>{try{localStorage.setItem(LS_CAT,JSON.stringify(categories))}catch{}},[categories]);
  useEffect(()=>{try{localStorage.setItem(LS_PLAN,activePlanId)}catch{}},[activePlanId]);
  useEffect(()=>{try{localStorage.setItem(LS_CUSTBUD,JSON.stringify(customBudget))}catch{}},[customBudget]);
  useEffect(()=>{try{localStorage.setItem(LS_CUSTPLANS,JSON.stringify(customPlans))}catch{}},[customPlans]);
  useEffect(()=>{try{localStorage.setItem(LS_CARDS,JSON.stringify(cards))}catch{}},[cards]);

  const getCat = id => categories.find(c=>c.id===id);

  const filtered = useMemo(()=>transactions.filter(t=>{
    const d=new Date(t.date); return d.getMonth()===month&&d.getFullYear()===year;
  }),[transactions,month,year]);

  const totalIncome  = useMemo(()=>filtered.filter(t=>t.type==="income"&&t.received!==false).reduce((s,t)=>s+t.value,0),[filtered]);
  const totalPending = useMemo(()=>filtered.filter(t=>t.type==="income"&&t.received===false).reduce((s,t)=>s+t.value,0),[filtered]);
  const totalExpense = useMemo(()=>filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0),[filtered]);
  const balance      = totalIncome-totalExpense;
  const savePct      = totalIncome>0?Math.max(0,Math.min(100,(balance/totalIncome)*100)).toFixed(1):"0.0";

  const byCategory = useMemo(()=>categories.map(cat=>{
    const total=filtered.filter(t=>t.type==="expense"&&t.category===cat.id).reduce((s,t)=>s+t.value,0);
    return {...cat, total, pctOfExp:totalExpense>0?(total/totalExpense)*100:0, pctOfInc:totalIncome>0?(total/totalIncome)*100:0};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total),[categories,filtered,totalExpense,totalIncome]);

  const pieData = useMemo(()=>byCategory.map(c=>({name:c.label,value:c.total,color:c.color})),[byCategory]);

  const allPlans = useMemo(()=>[...PRESET_PLANS,...customPlans,
    {id:"custom",name:"Personalizado",badge:"Meu plano",desc:"Defina % para cada categoria",groups:[]}
  ],[customPlans]);

  const activePlan = useMemo(()=>allPlans.find(p=>p.id===activePlanId)||PRESET_PLANS[0],[allPlans,activePlanId]);

  const budgetGroups = useMemo(()=>{
    if(!activePlan||activePlan.id==="custom"||!activePlan.groups?.length) return [];
    return activePlan.groups.map(g=>{
      const limit=(g.pct/100)*totalIncome;
      const spent=g.catIds.reduce((s,cid)=>s+filtered.filter(t=>t.type==="expense"&&t.category===cid).reduce((ss,t)=>ss+t.value,0),0);
      const usedPct=limit>0?Math.min((spent/limit)*100,100):0;
      const cats=g.catIds.map(cid=>{
        const cat=getCat(cid);
        const catSpent=filtered.filter(t=>t.type==="expense"&&t.category===cid).reduce((s,t)=>s+t.value,0);
        return cat?{...cat,spent:catSpent,pctOfGroup:limit>0?(catSpent/limit)*100:0,pctOfInc:totalIncome>0?(catSpent/totalIncome)*100:0}:null;
      }).filter(Boolean);
      return {...g,limit,spent,usedPct,cats};
    });
  },[activePlan,totalIncome,filtered,categories]);

  const customRows = useMemo(()=>{
    if(activePlanId!=="custom") return [];
    return categories.map(cat=>{
      const e=customBudget.find(x=>x.catId===cat.id)||{pct:0};
      const limit=(e.pct/100)*totalIncome;
      const spent=filtered.filter(t=>t.type==="expense"&&t.category===cat.id).reduce((s,t)=>s+t.value,0);
      return {...cat,allocPct:e.pct,limit,spent,usedPct:limit>0?Math.min((spent/limit)*100,100):0,pctOfInc:totalIncome>0?(spent/totalIncome)*100:0};
    });
  },[activePlanId,customBudget,categories,filtered,totalIncome]);

  const displayList = useMemo(()=>{
    let list=filter==="all"?filtered:filtered.filter(t=>t.type===filter);
    if(search) list=list.filter(t=>t.desc.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[filtered,filter,search]);

  const toast$=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const addTx=()=>{
    if(!form.desc||!form.value) return;
    const t={...form,id:nextId.current++,value:parseFloat(form.value)};
    if(t.type==="expense") delete t.received;
    setTransactions(p=>[...p,t]);
    setForm({desc:"",value:"",type:"expense",category:categories[0]?.id||"outros",date:new Date().toISOString().slice(0,10),received:true});
    setShowForm(false); toast$("Transação adicionada! ✓");
  };
  const toggleReceived=id=>setTransactions(p=>p.map(t=>t.id===id?{...t,received:!t.received}:t));
  const removeTx=id=>{setTransactions(p=>p.filter(t=>t.id!==id));toast$("Transação removida.","err");};
  const addCat=()=>{
    if(!catForm.label.trim()) return;
    setCategories(p=>[...p,{...catForm,id:"c_"+nextCatId.current++,custom:true}]);
    setCatForm({label:"",icon:"✦",color:"#E8B86D"}); toast$("Categoria criada! ✓");
  };
  const removeCat=id=>{setCategories(p=>p.filter(c=>c.id!==id));toast$("Categoria removida.","err");};
  const prevMonth=()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1);
  const nextMonth=()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1);
  const updCustPct=(catId,pct)=>{
    const v=Math.max(0,Math.min(100,parseFloat(pct)||0));
    setCustomBudget(prev=>{const i=prev.findIndex(e=>e.catId===catId);return i>=0?prev.map((e,ii)=>ii===i?{...e,pct:v}:e):[...prev,{catId,pct:v}];});
  };
  const savePlan=()=>{
    if(!newPlanForm.name.trim()) return;
    const total=newPlanForm.groups.reduce((s,g)=>s+(parseFloat(g.pct)||0),0);
    if(Math.abs(total-100)>0.5){toast$("Grupos devem somar 100%","err");return;}
    const plan={id:"cp_"+nextPlanId.current++,name:newPlanForm.name,badge:"Personalizado",
      desc:newPlanForm.groups.map(g=>`${g.label} ${g.pct}%`).join(" · "),
      groups:newPlanForm.groups.map(g=>({...g,id:"g_"+Math.random().toString(36).slice(2),catIds:[]}))
    };
    setCustomPlans(p=>[...p,plan]);
    setActivePlanId(plan.id); setShowPlanModal(false); toast$(`Plano "${plan.name}" criado! ✓`);
  };
  const removePlan=id=>{setCustomPlans(p=>p.filter(cp=>cp.id!==id));if(activePlanId===id)setActivePlanId("50-30-20");toast$("Plano removido.","err");};

  const customTotal=customBudget.reduce((s,e)=>s+e.pct,0);
  const newPlanTotal=newPlanForm.groups.reduce((s,g)=>s+(parseFloat(g.pct)||0),0);
  const openNewCard=()=>{
    setEditingCard(null);
    setCardForm({name:"",digits:"",flag:"Visa",limit:"",balance:"",due:"",gradIdx:0});
    setShowCardModal(true);
  };
  const openEditCard=(card)=>{
    setEditingCard(card.id);
    const gi=CARD_GRADS.findIndex(g=>g.colors[0]===card.grad[0]);
    setCardForm({name:card.name,digits:card.digits,flag:card.flag,limit:String(card.limit),balance:String(card.balance),due:card.due,gradIdx:gi>=0?gi:0});
    setShowCardModal(true);
  };
  const saveCard=()=>{
    if(!cardForm.name.trim()||!cardForm.digits.trim()||!cardForm.limit) return;
    const grad=CARD_GRADS[cardForm.gradIdx]?.colors||CARD_GRADS[0].colors;
    if(editingCard!=null){
      setCards(p=>p.map(c=>c.id===editingCard?{...c,name:cardForm.name,digits:cardForm.digits,flag:cardForm.flag,limit:parseFloat(cardForm.limit)||0,balance:parseFloat(cardForm.balance)||0,due:cardForm.due,grad}:c));
      toast$("Cartão atualizado! ✓");
    } else {
      const newCard={id:Date.now(),name:cardForm.name,digits:cardForm.digits,flag:cardForm.flag,limit:parseFloat(cardForm.limit)||0,balance:parseFloat(cardForm.balance)||0,due:cardForm.due,grad};
      setCards(p=>[...p,newCard]);
      toast$("Cartão adicionado! ✓");
    }
    setShowCardModal(false);
  };
  const removeCard=id=>{setCards(p=>p.filter(c=>c.id!==id));toast$("Cartão removido.","err");};

  const navItems=[
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"transacoes",icon:"⇄",label:"Transações"},
    {id:"orcamento",icon:"◎",label:"Orçamento"},
    {id:"cartoes",icon:"▣",label:"Cartões"},
    {id:"categorias",icon:"◉",label:"Categorias"},
  ];

  return (<>
<div className="layout">

{/* SIDEBAR */}
<aside className="sb">
  <div className="sb-logo">
    <div className="sb-mark">₿</div>
    <div>
      <div style={{fontFamily:"var(--display)",fontSize:20,fontWeight:700,lineHeight:1}}>Orçamento</div>
      <div style={{fontSize:9,fontWeight:600,color:"var(--text3)",letterSpacing:"1.5px",textTransform:"uppercase",marginTop:3}}>Gestor financeiro</div>
    </div>
  </div>
  <nav className="sb-nav">
    {navItems.map(n=>(
      <div key={n.id} className={`ni${view===n.id?" on":""}`} onClick={()=>setView(n.id)}>
        <span className="ni-icon">{n.icon}</span>
        <span style={{fontWeight:600,flex:1}}>{n.label}</span>
        {n.id==="orcamento"&&<span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:99,background:"rgba(232,184,109,0.15)",color:"var(--gold)",letterSpacing:"0.3px",flexShrink:0}}>{activePlan?.name?.split(" ")[0]||"50/30"}</span>}
      </div>
    ))}
  </nav>
  <div className="sb-month">
    <div className="sb-mlbl">Período</div>
    <div className="mctrl">
      <button className="marr" onClick={prevMonth}>‹</button>
      <span className="mname">{MONTHS[month].slice(0,3)} {year}</span>
      <button className="marr" onClick={nextMonth}>›</button>
    </div>
  </div>
  <div className="sb-add">
    <button className="btn-new" onClick={()=>setShowForm(true)}>
      <span style={{fontSize:18,lineHeight:1}}>+</span> Nova Transação
    </button>
  </div>
</aside>

<main className="content">

{/* ══ DASHBOARD ══ */}
{view==="dashboard"&&(<>
  <div className="pg-title">Visão Geral</div>
  <div className="pg-sub">{MONTHS[month]} {year} · {filtered.length} transações · Plano <strong style={{color:"var(--gold)"}}>{activePlan?.name}</strong></div>

  <div className="g4">
    <div className="sc">
      <span style={{fontSize:20,marginBottom:14,display:"block"}}>↑</span>
      <div className="sc-lbl">Receitas</div>
      <div className="sc-val" style={{color:"var(--green)"}}>{fmt(totalIncome)}</div>
      <div className="sc-sub">{filtered.filter(t=>t.type==="income"&&t.received!==false).length} confirmadas</div>
      <span className="sc-trend tup">↑ 8.2%</span>
    </div>
    <div className="sc">
      <span style={{fontSize:20,marginBottom:14,display:"block"}}>⏳</span>
      <div className="sc-lbl">A Receber</div>
      <div className="sc-val" style={{color:"var(--gold)"}}>{fmt(totalPending)}</div>
      <div className="sc-sub">{filtered.filter(t=>t.type==="income"&&t.received===false).length} pendentes</div>
    </div>
    <div className="sc">
      <span style={{fontSize:20,marginBottom:14,display:"block"}}>↓</span>
      <div className="sc-lbl">Despesas</div>
      <div className="sc-val" style={{color:"var(--red)"}}>{fmt(totalExpense)}</div>
      <div className="sc-sub">{totalIncome>0?fmtPct((totalExpense/totalIncome)*100)+" da renda":"—"}</div>
      <span className="sc-trend tdn">↓ 3.1%</span>
    </div>
    <div className="sc gold">
      <div className="ring-w">
        <RadialProgress pct={parseFloat(savePct)} color={balance>=0?"#E8B86D":"#E87A6D"} size={66}/>
        <div className="ring-v" style={{color:balance>=0?"var(--gold)":"var(--red)"}}>{savePct}%</div>
      </div>
      <span style={{fontSize:20,marginBottom:14,display:"block"}}>◈</span>
      <div className="sc-lbl">Saldo Real</div>
      <div className="sc-val" style={{color:balance>=0?"var(--gold)":"var(--red)",fontSize:24}}>{fmt(balance)}</div>
      <div className="sc-sub">taxa de poupança</div>
    </div>
  </div>

  {/* Charts */}
  <div className="g2l">
    <div className="panel">
      <div className="ph">
        <div>
          <div className="pt">Fluxo de Caixa</div>
          <div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>Histórico de 6 meses</div>
        </div>
        <div style={{display:"flex",gap:14,fontSize:11}}>
          {[["Receitas","var(--green)"],["Despesas","var(--red)"]].map(([l,c])=>(
            <span key={l} style={{display:"flex",alignItems:"center",gap:5,color:"var(--text3)"}}>
              <span style={{width:8,height:8,borderRadius:2,background:c,display:"inline-block"}}/>{l}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={MONTHLY_HIST} margin={{left:-10,right:4}}>
          <defs>
            <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6DE8A0" stopOpacity={0.22}/><stop offset="95%" stopColor="#6DE8A0" stopOpacity={0}/></linearGradient>
            <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E87A6D" stopOpacity={0.22}/><stop offset="95%" stopColor="#E87A6D" stopOpacity={0}/></linearGradient>
          </defs>
          <XAxis dataKey="m" tick={{fill:"rgba(240,238,232,0.3)",fontSize:12}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:"rgba(240,238,232,0.3)",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
          <Tooltip content={<TT/>}/>
          <Area type="monotone" dataKey="r" name="Receitas"  stroke="#6DE8A0" strokeWidth={2.5} fill="url(#gr)" dot={{fill:"#6DE8A0",r:4,strokeWidth:0}}/>
          <Area type="monotone" dataKey="d" name="Despesas" stroke="#E87A6D" strokeWidth={2.5} fill="url(#gd)" dot={{fill:"#E87A6D",r:4,strokeWidth:0}}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="panel">
      <div className="ph">
        <div className="pt">Por Categoria</div>
        <button className="pl" onClick={()=>setView("transacoes")}>ver tudo →</button>
      </div>
      {pieData.length===0?<div className="empty">Sem despesas.</div>:<>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value">
              {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Pie>
            <Tooltip content={<TT/>}/>
          </PieChart>
        </ResponsiveContainer>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:10}}>
          {pieData.slice(0,4).map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,alignItems:"center"}}>
              <span style={{display:"flex",alignItems:"center",gap:7,color:"var(--text2)"}}>
                <span style={{width:7,height:7,borderRadius:2,background:d.color,display:"inline-block",flexShrink:0}}/>{d.name}
              </span>
              <span style={{fontWeight:700,color:d.color}}>{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  </div>

  {/* Recentes + Metas com % da renda */}
  <div className="g2">
    <div className="panel">
      <div className="ph">
        <div className="pt">Últimas Transações</div>
        <button className="pl" onClick={()=>setView("transacoes")}>ver todas →</button>
      </div>
      {filtered.length===0&&<div className="empty">Nenhuma transação neste mês.</div>}
      {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).map(t=>{
        const cat=getCat(t.category);const pend=t.type==="income"&&t.received===false;
        return (
          <div key={t.id} className={`tx-row${pend?" dim":""}`}>
            <div className="av" style={{background:(cat?.color||"#888")+"18"}}>{cat?.icon||"✦"}</div>
            <div className="ti">
              <div className="tn">{t.desc}</div>
              <div className="tm">
                <span>{new Date(t.date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</span>
                <span className="cdot" style={{background:cat?.color||"#888"}}/>
                <span style={{color:cat?.color||"var(--text3)"}}>{cat?.label}</span>
              </div>
            </div>
            {t.type==="income"&&(
              <span className={`tbadge ${t.received!==false?"bg":"bo"}`} onClick={()=>toggleReceived(t.id)}>
                {t.received!==false?"✓ recebido":"⏳ pendente"}
              </span>
            )}
            <div className="tamt" style={{color:t.type==="income"?"var(--green)":"var(--red)"}}>
              {t.type==="income"?"+":"-"}{fmt(t.value)}
            </div>
          </div>
        );
      })}
    </div>

    {/* METAS DE ORÇAMENTO — % da renda */}
    <div className="panel">
      <div className="ph">
        <div>
          <div className="pt">Metas de Orçamento</div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:3}}>% da renda por grupo e categoria</div>
        </div>
        <button className="pl" onClick={()=>setView("orcamento")}>detalhes →</button>
      </div>

      {/* Plan group bars */}
      {activePlanId!=="custom"&&budgetGroups.length>0&&(
        <div style={{marginBottom:14}}>
          {budgetGroups.map(g=>{
            const realPct=totalIncome>0?(g.id==="pou"?Math.max(0,balance)/totalIncome*100:g.spent/totalIncome*100):0;
            const over=realPct>g.pct;
            return (
              <div key={g.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><span>{g.icon}</span>{g.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,color:"var(--text3)"}}>meta {g.pct}%</span>
                    <span style={{fontSize:13,fontWeight:800,color:over?"var(--red)":g.color}}>{fmtPct(realPct)}</span>
                  </div>
                </div>
                {/* Background = limit bar, fill = actual usage */}
                <div style={{height:8,borderRadius:99,background:"var(--surface3)",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",height:"100%",width:`${g.pct}%`,background:g.color+"1a",borderRadius:99}}/>
                  <div style={{position:"absolute",height:"100%",width:`${Math.min(realPct,100)}%`,background:over?"var(--red)":g.color,borderRadius:99,transition:"width 1s",boxShadow:`0 0 6px ${g.color}66`}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)",marginTop:3}}>
                  <span>{fmt(g.id==="pou"?Math.max(0,balance):g.spent)}</span>
                  <span>meta: {fmt((g.pct/100)*totalIncome)}</span>
                </div>
              </div>
            );
          })}
          <div style={{height:1,background:"var(--border)",margin:"10px 0"}}/>
        </div>
      )}

      {/* Per-category breakdown with % of income */}
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"var(--text3)",marginBottom:10}}>
        Detalhamento por Categoria
      </div>
      {byCategory.length===0&&<div className="empty" style={{padding:"14px 0"}}>Sem despesas neste mês.</div>}
      {byCategory.map(cat=>{
        const warn=cat.pctOfInc>25;
        return (
          <div key={cat.id} className="cb">
            <div className="cem" style={{background:cat.color+"18"}}>{cat.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:600}}>{cat.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:10,color:warn?"var(--red)":"var(--text3)",fontWeight:warn?700:400}}>
                    {fmtPct(cat.pctOfInc)} da renda
                  </span>
                  <span style={{fontSize:12,fontWeight:800,color:cat.color}}>{fmt(cat.total)}</span>
                </div>
              </div>
              <div className="btr">
                <div className="bfi" style={{width:`${Math.min(cat.pctOfInc*2,100)}%`,background:warn?"var(--red)":cat.color,boxShadow:`0 0 6px ${cat.color}55`}}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</>)}

{/* ══ TRANSAÇÕES ══ */}
{view==="transacoes"&&(<>
  <div className="pg-title">Transações</div>
  <div className="pg-sub">{MONTHS[month]} {year}</div>
  <div className="fr">
    <div className="sb2">
      <span style={{color:"var(--text3)",fontSize:14}}>🔍</span>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar transação..."/>
    </div>
    {[["all","Todas"],["income","Receitas"],["expense","Despesas"]].map(([v,l])=>(
      <button key={v} className={`fch${filter===v?" on":""}`} onClick={()=>setFilter(v)}>{l}</button>
    ))}
    <span style={{marginLeft:"auto",fontSize:11,color:"var(--text3)",fontWeight:600}}>{displayList.length} registros</span>
  </div>
  <div className="txt">
    {displayList.length===0&&<div className="empty">Nenhuma transação encontrada.</div>}
    {displayList.map(t=>{
      const cat=getCat(t.category);const pend=t.type==="income"&&t.received===false;
      return (
        <div key={t.id} className={`ttr${pend?" dim":""}`}>
          <div className="av" style={{background:(cat?.color||"#888")+"18"}}>{cat?.icon||"✦"}</div>
          <div className="ti">
            <div className="tn">{t.desc}</div>
            <div className="tm">
              <span>{new Date(t.date+"T12:00:00").toLocaleDateString("pt-BR")}</span>
              <span className="cdot" style={{background:cat?.color||"#888"}}/>
              <span style={{color:cat?.color||"var(--text3)"}}>{cat?.label}</span>
            </div>
          </div>
          {t.type==="income"&&(
            <span className={`tbadge ${t.received!==false?"bg":"bo"}`} onClick={()=>toggleReceived(t.id)}>
              {t.received!==false?"✓ recebido":"⏳ pendente"}
            </span>
          )}
          <div className="tamt" style={{color:t.type==="income"?"var(--green)":"var(--red)"}}>
            {t.type==="income"?"+":"-"}{fmt(t.value)}
          </div>
          <button className="tdel" onClick={()=>removeTx(t.id)}>✕</button>
        </div>
      );
    })}
  </div>
</>)}

{/* ══ ORÇAMENTO ══ */}
{view==="orcamento"&&(<>
  <div className="pg-title">Orçamento</div>
  <div className="pg-sub">{MONTHS[month]} {year} · Plano: <strong style={{color:"var(--gold)"}}>{activePlan?.name}</strong> · Renda confirmada: <strong style={{color:"var(--green)"}}>{fmt(totalIncome)}</strong></div>

  <div className="btabs">
    <button className={`btab${budTab==="planos"?" on":""}`}  onClick={()=>setBudTab("planos")}>Planos</button>
    <button className={`btab${budTab==="detalhe"?" on":""}`} onClick={()=>setBudTab("detalhe")}>Detalhamento</button>
    {activePlanId==="custom"&&<button className={`btab${budTab==="custom"?" on":""}`} onClick={()=>setBudTab("custom")}>⚙ Configurar</button>}
  </div>

  {/* TAB: PLANOS */}
  {budTab==="planos"&&(<>
    <div style={{fontSize:11,color:"var(--text3)",fontWeight:600,letterSpacing:"0.5px",marginBottom:12}}>PLANOS PREDEFINIDOS</div>
    <div className="pgrid">
      {PRESET_PLANS.map(plan=>(
        <div key={plan.id} className={`pcard${activePlanId===plan.id?" active":""}`}
          onClick={()=>{setActivePlanId(plan.id);toast$(`Plano ${plan.name} ativado! ✓`);}}>
          {activePlanId===plan.id&&<div className="pcheck">✓</div>}
          <span className="pbadge">{plan.badge}</span>
          <div className="pname">{plan.name}</div>
          <div className="pdesc">{plan.desc}</div>
          <div className="pgrow">
            {plan.groups.map(g=>(
              <div key={g.id} className="pgr">
                <span style={{fontSize:10,color:"var(--text3)",width:54,flexShrink:0}}>{g.label.slice(0,9)}</span>
                <div className="pbo"><div className="pbi" style={{width:`${g.pct}%`,background:g.color}}/></div>
                <span style={{fontSize:11,fontWeight:800,color:g.color,width:28,textAlign:"right",flexShrink:0}}>{g.pct}%</span>
              </div>
            ))}
          </div>
          {activePlanId===plan.id&&totalIncome>0&&(
            <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              {plan.groups.map(g=>(
                <div key={g.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:g.color,fontWeight:600}}>{g.label}</span>
                  <span style={{color:"var(--text2)"}}>{fmt((g.pct/100)*totalIncome)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Personalizado selector */}
    <div className={`pcard${activePlanId==="custom"?" active":""}`}
      style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}
      onClick={()=>{setActivePlanId("custom");setBudTab("custom");toast$("Plano personalizado ativado! ✓");}}>
      {activePlanId==="custom"&&<div className="pcheck">✓</div>}
      <div style={{fontSize:28}}>⚙️</div>
      <div>
        <span className="pbadge">Meu Plano</span>
        <div className="pname" style={{fontSize:18}}>Personalizado</div>
        <div className="pdesc" style={{margin:0}}>Defina manualmente o % de cada categoria da sua renda</div>
      </div>
    </div>

    {/* User-created plans */}
    {customPlans.length>0&&(<>
      <div style={{fontSize:11,color:"var(--text3)",fontWeight:600,letterSpacing:"0.5px",marginBottom:12,marginTop:16}}>MEUS PLANOS CRIADOS</div>
      <div className="pgrid">
        {customPlans.map(plan=>(
          <div key={plan.id} className={`pcard${activePlanId===plan.id?" active":""}`}>
            <div style={{position:"absolute",top:14,right:14,display:"flex",gap:6,zIndex:1}}>
              {activePlanId===plan.id&&<div className="pcheck" style={{position:"static"}}>✓</div>}
              <button onClick={e=>{e.stopPropagation();removePlan(plan.id);}} style={{background:"rgba(232,122,109,0.1)",border:"1px solid rgba(232,122,109,0.25)",color:"var(--red)",cursor:"pointer",fontSize:11,padding:"2px 8px",borderRadius:8,fontWeight:700,fontFamily:"var(--font)"}}>✕</button>
            </div>
            <div onClick={()=>{setActivePlanId(plan.id);toast$(`Plano "${plan.name}" ativado! ✓`);}}>
              <span className="pbadge">{plan.badge}</span>
              <div className="pname">{plan.name}</div>
              <div className="pdesc">{plan.desc}</div>
              <div className="pgrow">
                {(plan.groups||[]).map((g,i)=>(
                  <div key={i} className="pgr">
                    <span style={{fontSize:10,color:"var(--text3)",width:54,flexShrink:0}}>{(g.label||"").slice(0,9)}</span>
                    <div className="pbo"><div className="pbi" style={{width:`${g.pct}%`,background:g.color||"var(--gold)"}}/></div>
                    <span style={{fontSize:11,fontWeight:800,color:g.color||"var(--gold)",width:28,textAlign:"right",flexShrink:0}}>{g.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>)}

    <button onClick={()=>setShowPlanModal(true)} style={{marginTop:6,padding:"11px 24px",borderRadius:12,border:"1px dashed rgba(232,184,109,0.3)",background:"rgba(232,184,109,0.05)",color:"var(--gold)",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"var(--font)"}}>
      + Criar Novo Plano Personalizado
    </button>
  </>)}

  {/* TAB: DETALHAMENTO */}
  {budTab==="detalhe"&&(<>
    {activePlanId==="custom"?(
      <>
        <div className="g3">
          {[
            {label:"Total Alocado",value:customRows.reduce((s,r)=>s+r.limit,0),color:"var(--gold)"},
            {label:"Total Gasto",  value:customRows.reduce((s,r)=>s+r.spent,0),color:"var(--red)"},
            {label:"Disponível",   value:customRows.reduce((s,r)=>s+Math.max(0,r.limit-r.spent),0),color:"var(--green)"},
          ].map((c,i)=>(
            <div key={i} className="sc">
              <div className="sc-lbl">{c.label}</div>
              <div className="sc-val" style={{color:c.color}}>{fmt(c.value)}</div>
            </div>
          ))}
        </div>
        {customRows.filter(r=>r.allocPct>0).length===0&&<div className="empty">Configure o plano na aba "⚙ Configurar"</div>}
        {customRows.filter(r=>r.allocPct>0).map(r=>{
          const over=r.usedPct>85;
          return (
            <div key={r.id} className="bg-item">
              <div className="bg-hd">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:10,background:r.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{r.icon}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700}}>{r.label}</div>
                    <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{fmtPct(r.allocPct)} da renda · {fmtPct(r.pctOfInc)} utilizado</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"var(--display)",color:over?"var(--red)":r.color}}>{fmt(r.spent)}</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>de {fmt(r.limit)}</div>
                </div>
              </div>
              <div className="bg-track">
                <div className="bg-fill" style={{width:`${r.usedPct}%`,background:over?"var(--red)":r.color,boxShadow:over?"0 0 8px rgba(232,122,109,0.4)":`0 0 8px ${r.color}55`}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:over?"var(--red)":"var(--green)",fontWeight:600}}>{over?`⚠️ ${fmt(r.limit-r.spent)} restante`:`✓ ${fmt(r.limit-r.spent)} disponível`}</span>
                <span style={{color:"var(--text3)"}}>{fmtPct(r.usedPct)} do limite</span>
              </div>
            </div>
          );
        })}
      </>
    ):(
      <>
        <div className="g3">
          {budgetGroups.map(g=>(
            <div key={g.id} className="sc">
              <span style={{fontSize:22,marginBottom:10,display:"block"}}>{g.icon}</span>
              <div className="sc-lbl">{g.label}</div>
              <div className="sc-val" style={{color:g.color,fontSize:20}}>{g.id==="pou"?fmt(Math.max(0,balance)):fmt(g.spent)}</div>
              <div className="sc-sub">meta: {g.pct}% = {fmt(g.limit)}</div>
              <div style={{marginTop:8,fontSize:12,fontWeight:700,color:g.id==="pou"?(balance>=(g.pct/100)*totalIncome?"var(--green)":"var(--gold)"):(g.spent>g.limit?"var(--red)":"var(--green)")}}>
                {g.id==="pou"
                  ?fmtPct(totalIncome>0?Math.max(0,balance)/totalIncome*100:0)+" poupado"
                  :fmtPct(totalIncome>0?g.spent/totalIncome*100:0)+" da renda"
                }
              </div>
            </div>
          ))}
        </div>

        {budgetGroups.map(g=>(
          <div key={g.id} className="bg-item">
            <div className="bg-hd">
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:12,background:g.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{g.icon}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:700}}>{g.label}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>Meta: {fmtPct(g.pct)} da renda = {fmt(g.limit)}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"var(--display)",color:g.color}}>
                  {g.id==="pou"?fmt(Math.max(0,balance)):fmt(g.spent)}
                </div>
                <div style={{fontSize:11,color:"var(--text3)"}}>
                  {g.id==="pou"
                    ?(totalIncome>0?fmtPct(Math.max(0,balance)/totalIncome*100)+" poupado":"—")
                    :(totalIncome>0?fmtPct(g.spent/totalIncome*100)+" da renda":"—")
                  }
                </div>
              </div>
            </div>
            {/* Double-layer bar: light bg = limit zone, solid = actual */}
            <div style={{height:10,borderRadius:99,background:"var(--surface3)",position:"relative",overflow:"hidden",margin:"12px 0 6px"}}>
              <div style={{position:"absolute",height:"100%",width:`${g.pct}%`,background:g.color+"15",borderRadius:99}}/>
              {g.id==="pou"?(
                <div style={{position:"absolute",height:"100%",width:`${totalIncome>0?Math.min(Math.max(0,balance)/totalIncome*100,100):0}%`,background:balance>=(g.pct/100)*totalIncome?"var(--green)":"var(--gold)",borderRadius:99,transition:"width 1s",boxShadow:"0 0 8px rgba(109,232,160,0.4)"}}/>
              ):(
                <div style={{position:"absolute",height:"100%",width:`${Math.min(g.usedPct,100)}%`,background:g.spent>g.limit?"var(--red)":g.color,borderRadius:99,transition:"width 1s",boxShadow:`0 0 8px ${g.color}55`}}/>
              )}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:g.cats.length>0?12:0}}>
              {g.id==="pou"?(
                <span style={{color:balance>=(g.pct/100)*totalIncome?"var(--green)":"var(--gold)",fontWeight:600}}>
                  {balance>=(g.pct/100)*totalIncome?`✓ Meta atingida!`:`Faltam ${fmt(Math.max(0,(g.pct/100)*totalIncome-balance))} para a meta`}
                </span>
              ):(
                <span style={{color:g.spent>g.limit?"var(--red)":"var(--green)",fontWeight:600}}>
                  {g.spent>g.limit?`⚠️ ${fmt(g.spent-g.limit)} acima do limite`:`✓ ${fmt(g.limit-g.spent)} disponível`}
                </span>
              )}
              <span style={{color:"var(--text3)"}}>{fmtPct(g.id==="pou"?(totalIncome>0?Math.min(Math.max(0,balance)/totalIncome*100,100):0):g.usedPct)} do limite</span>
            </div>
            {g.cats.map(cat=>{
              if(!cat) return null;
              return (
                <div key={cat.id} className="bg-cat">
                  <div style={{width:28,height:28,borderRadius:8,background:(cat.color||"#888")+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{cat.icon}</div>
                  <div style={{flex:1,marginLeft:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{fontWeight:500,color:"var(--text2)"}}>{cat.label}</span>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:10,color:"var(--text3)",fontWeight:600}}>{fmtPct(cat.pctOfInc)} da renda</span>
                        <span style={{fontWeight:700,color:cat.color||"var(--gold)"}}>{fmt(cat.spent)}</span>
                      </div>
                    </div>
                    <div style={{height:4,borderRadius:99,background:"var(--surface3)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(cat.pctOfGroup,100)}%`,borderRadius:99,background:cat.color||g.color,transition:"width 0.8s"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </>
    )}
  </>)}

  {/* TAB: CUSTOM CONFIG */}
  {budTab==="custom"&&activePlanId==="custom"&&(
    <div className="panel">
      <div className="ph">
        <div>
          <div className="pt">Configurar Plano Personalizado</div>
          <div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>Defina qual % da sua renda vai para cada categoria</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:15,fontWeight:800,color:Math.abs(customTotal-100)<0.5?"var(--green)":customTotal>100?"var(--red)":"var(--gold)"}}>{customTotal.toFixed(1)}%</div>
          <div style={{fontSize:11,color:"var(--text3)"}}>{Math.abs(customTotal-100)<0.5?"✓ Total OK":`${(100-customTotal).toFixed(1)}% restante`}</div>
          <div className="pct-bar" style={{width:160,marginTop:6}}>
            <div style={{height:"100%",width:`${Math.min(customTotal,100)}%`,background:customTotal>100?"var(--red)":"var(--gold)",borderRadius:99,transition:"width 0.4s"}}/>
          </div>
        </div>
      </div>
      {categories.map(cat=>{
        const e=customBudget.find(x=>x.catId===cat.id)||{pct:0};
        return (
          <div key={cat.id} className="cust-row">
            <div style={{width:34,height:34,borderRadius:10,background:cat.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{cat.label}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:1}}>{e.pct>0?`= ${fmt((e.pct/100)*totalIncome)} / mês`:"Sem alocação"}</div>
            </div>
            <input type="number" min="0" max="100" className="pinp" value={e.pct||""} onChange={ev=>updCustPct(cat.id,ev.target.value)} placeholder="0"/>
            <span style={{fontSize:13,color:"var(--text3)",fontWeight:600}}>%</span>
          </div>
        );
      })}
      {Math.abs(customTotal-100)<0.5&&(
        <div style={{marginTop:14,padding:"10px 14px",borderRadius:12,background:"rgba(109,232,160,0.07)",border:"1px solid rgba(109,232,160,0.2)",fontSize:12,color:"var(--green)",fontWeight:600}}>
          ✓ Plano configurado — {fmt(totalIncome)} distribuídos entre as categorias.
        </div>
      )}
    </div>
  )}
</>)}

{/* ══ CARTÕES ══ */}
{view==="cartoes"&&(<>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
    <div className="pg-title">Meus Cartões</div>
    <button onClick={openNewCard} style={{
      display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:12,
      background:"linear-gradient(135deg,var(--gold),var(--gold2))",border:"none",
      color:"#0A0B0E",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"var(--font)",
      boxShadow:"0 4px 20px rgba(232,184,109,0.3)",transition:"all 0.2s",whiteSpace:"nowrap"
    }}>+ Adicionar Cartão</button>
  </div>
  <div className="pg-sub">Controle de faturas e limites · {cards.length} cartão{cards.length!==1?"s":""} cadastrado{cards.length!==1?"s":""}</div>

  {cards.length===0&&(
    <div style={{background:"var(--surface)",border:"1px dashed rgba(232,184,109,0.25)",borderRadius:18,padding:48,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:16}}>💳</div>
      <div style={{fontSize:16,fontWeight:600,color:"var(--text2)",marginBottom:8}}>Nenhum cartão cadastrado</div>
      <div style={{fontSize:13,color:"var(--text3)",marginBottom:20}}>Adicione seus cartões para controlar faturas e limites</div>
      <button onClick={openNewCard} style={{padding:"10px 24px",borderRadius:12,background:"var(--gold3)",border:"1px solid rgba(232,184,109,0.3)",color:"var(--gold)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font)"}}>
        + Adicionar primeiro cartão
      </button>
    </div>
  )}

  {cards.length>0&&(<>
    <div className="cg2">
      {cards.map((card)=>(
        <div key={card.id} style={{position:"relative"}}>
          <div className="cc" style={{background:`linear-gradient(135deg,${card.grad[0]},${card.grad[1]})`}}>
            <div className="cc-s"/><div className="cc-s2"/>
            {/* Action buttons */}
            <div style={{position:"absolute",top:14,right:14,display:"flex",gap:6,zIndex:2}}>
              <button onClick={()=>openEditCard(card)} style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✎</button>
              <button onClick={()=>removeCard(card.id)} style={{width:28,height:28,borderRadius:8,background:"rgba(232,122,109,0.25)",border:"1px solid rgba(232,122,109,0.4)",color:"#fca5a5",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",position:"relative",marginBottom:22}}>
              <div>
                <div style={{fontSize:11,opacity:0.75,marginBottom:3,fontWeight:600,letterSpacing:"0.5px"}}>{card.flag}</div>
                <div style={{fontSize:15,fontWeight:800,paddingRight:70}}>{card.name}</div>
              </div>
              <div style={{fontSize:24,opacity:0.7,position:"absolute",bottom:0,right:0}}>▣</div>
            </div>
            <div style={{position:"relative"}}>
              <div style={{fontSize:15,fontWeight:600,letterSpacing:"3px",marginBottom:16,opacity:0.9}}>
                •••• •••• •••• {card.digits}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                <div>
                  <div style={{fontSize:9,opacity:0.65,marginBottom:2,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>Fatura Atual</div>
                  <div style={{fontSize:20,fontWeight:800}}>R$ {card.balance.toLocaleString("pt-BR")}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9,opacity:0.65,marginBottom:2,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>Limite</div>
                  <div style={{fontSize:13,fontWeight:600,opacity:0.9}}>R$ {card.limit.toLocaleString("pt-BR")}</div>
                  {card.due&&<div style={{fontSize:10,opacity:0.55}}>Vence dia {card.due}</div>}
                </div>
              </div>
              <div style={{marginTop:12,height:4,borderRadius:99,background:"rgba(255,255,255,0.2)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min((card.balance/Math.max(card.limit,1))*100,100)}%`,borderRadius:99,background:"rgba(255,255,255,0.75)"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:10,opacity:0.55}}>
                <span>{card.limit>0?((card.balance/card.limit)*100).toFixed(0):0}% utilizado</span>
                <span>R$ {Math.max(0,card.limit-card.balance).toLocaleString("pt-BR")} disponível</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Stats + Chart */}
    <div className="g2">
      <div className="panel">
        <div className="ph"><div className="pt">Fatura por Cartão</div></div>
        {cards.length>0&&(
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cards.map(c=>({name:c.name.length>12?c.name.slice(0,12)+"…":c.name,fatura:c.balance,disponivel:Math.max(0,c.limit-c.balance)}))} barSize={36}>
              <XAxis dataKey="name" tick={{fill:"rgba(240,238,232,0.4)",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"rgba(240,238,232,0.3)",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(1)}k`}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="fatura"     name="Fatura"     radius={[6,6,0,0]} stackId="a">
                {cards.map((c,i)=><Cell key={i} fill={c.grad[0]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="panel">
        <div className="ph"><div className="pt">Utilização dos Limites</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:18,paddingTop:4}}>
          {cards.map((card)=>{
            const pct=card.limit>0?(card.balance/card.limit)*100:0;
            const warn=pct>60;
            return (
              <div key={card.id}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:7,alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:2,background:card.grad[0],flexShrink:0}}/>
                    <span style={{fontWeight:600,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.name}</span>
                  </div>
                  <span style={{fontWeight:800,color:warn?"var(--red)":"var(--green)",flexShrink:0}}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{height:8,borderRadius:99,background:"var(--surface3)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min(pct,100)}%`,borderRadius:99,
                    background:warn?`linear-gradient(90deg,${card.grad[0]},var(--red))`:`linear-gradient(90deg,${card.grad[0]},var(--green))`,
                    transition:"width 0.8s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginTop:4}}>
                  <span>R$ {card.balance.toLocaleString("pt-BR")} usado</span>
                  {card.due&&<span>Vence dia {card.due}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Summary cards */}
    <div className="g3">
      {[
        {label:"Total em Faturas", value:cards.reduce((s,c)=>s+c.balance,0), color:"var(--red)",   icon:"💸"},
        {label:"Limite Total",     value:cards.reduce((s,c)=>s+c.limit,0),   color:"var(--text)",  icon:"▣"},
        {label:"Limite Disponível",value:cards.reduce((s,c)=>s+Math.max(0,c.limit-c.balance),0), color:"var(--green)", icon:"✓"},
      ].map((s,i)=>(
        <div key={i} className="sc">
          <span style={{fontSize:20,marginBottom:12,display:"block"}}>{s.icon}</span>
          <div className="sc-lbl">{s.label}</div>
          <div className="sc-val" style={{color:s.color,fontSize:22}}>{fmt(s.value)}</div>
        </div>
      ))}
    </div>
  </>)}
</>)}

{/* ══ CATEGORIAS ══ */}
{view==="categorias"&&(<>
  <div className="pg-title">Categorias</div>
  <div className="pg-sub">Gerencie suas categorias de gastos</div>
  <div className="cp">
    <div className="panel">
      <div className="ph"><div className="pt">Categorias Ativas ({categories.length})</div></div>
      {categories.map(cat=>(
        <div key={cat.id} className="ci">
          <div style={{width:34,height:34,borderRadius:10,background:cat.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cat.icon}</div>
          <span style={{flex:1,fontSize:14,fontWeight:600}}>{cat.label}</span>
          <div style={{width:8,height:8,borderRadius:"50%",background:cat.color,marginRight:6}}/>
          {cat.custom
            ?<button onClick={()=>removeCat(cat.id)} style={{background:"rgba(232,122,109,0.08)",border:"1px solid rgba(232,122,109,0.2)",color:"var(--red)",cursor:"pointer",fontSize:12,padding:"4px 10px",borderRadius:8,fontWeight:700,fontFamily:"var(--font)"}}>Remover</button>
            :<span style={{fontSize:10,fontWeight:700,color:"var(--text3)",letterSpacing:"0.5px",background:"var(--surface3)",padding:"3px 8px",borderRadius:6}}>padrão</span>
          }
        </div>
      ))}
    </div>
    <div className="panel">
      <div className="ph"><div className="pt">Nova Categoria</div></div>
      <div className="field">
        <label className="flbl">Nome</label>
        <input className="finp" placeholder="Ex: Pets, Investimentos..." value={catForm.label} onChange={e=>setCatForm(f=>({...f,label:e.target.value}))}/>
      </div>
      <div className="field">
        <label className="flbl" style={{marginBottom:8}}>Ícone</label>
        <div className="ig">{PRESET_ICONS.map(ic=><div key={ic} className={`io${catForm.icon===ic?" sel":""}`} onClick={()=>setCatForm(f=>({...f,icon:ic}))}>{ic}</div>)}</div>
      </div>
      <div className="field">
        <label className="flbl" style={{marginBottom:10}}>Cor</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {PRESET_COLORS.map(col=><div key={col} className={`cdot2${catForm.color===col?" sel":""}`} style={{background:col}} onClick={()=>setCatForm(f=>({...f,color:col}))}/>)}
        </div>
        <div className="cprev" style={{background:catForm.color+"12",border:`1px solid ${catForm.color}30`}}>
          <div style={{width:32,height:32,borderRadius:10,background:catForm.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{catForm.icon}</div>
          <span style={{fontSize:14,fontWeight:700,color:catForm.color}}>{catForm.label||"Prévia"}</span>
        </div>
      </div>
      <button className="btnp" onClick={addCat}>+ Criar Categoria</button>
    </div>
  </div>
</>)}

</main>
</div>

{/* MODAL: Nova Transação */}
{showForm&&(
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
    <div className="modal">
      <div className="mtitle">Nova Transação</div>
      <div className="tt">
        <button className={`tbtn${form.type==="expense"?" exp":""}`} onClick={()=>setForm(f=>({...f,type:"expense"}))}>↓ Despesa</button>
        <button className={`tbtn${form.type==="income"?" inc":""}`}  onClick={()=>setForm(f=>({...f,type:"income"}))}>↑ Receita</button>
      </div>
      <div className="field">
        <label className="flbl">Descrição</label>
        <input className="finp" placeholder="Ex: Aluguel, Salário..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
      </div>
      <div className="r2" style={{marginBottom:15}}>
        <div className="field" style={{margin:0}}>
          <label className="flbl">Valor (R$)</label>
          <input className="finp" type="number" placeholder="0,00" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))}/>
        </div>
        <div className="field" style={{margin:0}}>
          <label className="flbl">Data</label>
          <input className="finp" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        </div>
      </div>
      <div className="field">
        <label className="flbl">Categoria</label>
        <select className="finp" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      {form.type==="income"&&(
        <div className="field">
          <label className="flbl">Status do Recebimento</label>
          <div className="sr">
            <button className={`sbt${form.received!==false?" ok":""}`}  onClick={()=>setForm(f=>({...f,received:true}))}>✓ Recebido</button>
            <button className={`sbt${form.received===false?" pnd":""}`} onClick={()=>setForm(f=>({...f,received:false}))}>⏳ A Receber</button>
          </div>
          {form.received===false&&<div className="inote">Não será contabilizado no saldo até ser marcado como recebido.</div>}
        </div>
      )}
      <button className="btnp" onClick={addTx}>Adicionar Transação</button>
      <button className="btng" onClick={()=>setShowForm(false)}>Cancelar</button>
    </div>
  </div>
)}

{/* MODAL: Criar Plano */}
{showPlanModal&&(
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowPlanModal(false)}>
    <div className="modal">
      <div className="mtitle">Criar Plano</div>
      <div className="msub">Os grupos devem somar exatamente 100% da sua renda</div>
      <div className="field">
        <label className="flbl">Nome do Plano</label>
        <input className="finp" placeholder="Ex: Meu Plano 2026..." value={newPlanForm.name} onChange={e=>setNewPlanForm(f=>({...f,name:e.target.value}))}/>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"var(--text3)",marginBottom:10}}>Grupos de Orçamento</div>
      {newPlanForm.groups.map((g,i)=>(
        <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:10}}>
            <input className="finp" style={{padding:"8px 12px",fontSize:13}} placeholder="Nome do grupo" value={g.label}
              onChange={e=>setNewPlanForm(f=>({...f,groups:f.groups.map((gg,ii)=>ii===i?{...gg,label:e.target.value}:gg)}))}/>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input className="pinp" type="number" min="0" max="100" placeholder="%" value={g.pct||""}
                onChange={e=>setNewPlanForm(f=>({...f,groups:f.groups.map((gg,ii)=>ii===i?{...gg,pct:parseFloat(e.target.value)||0}:gg)}))}/>
              <span style={{fontSize:12,color:"var(--text3)",fontWeight:600}}>%</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:12,background:"var(--surface2)",border:"1px solid var(--border)",marginBottom:8}}>
        <span style={{fontSize:12,color:"var(--text3)",fontWeight:600}}>Total</span>
        <span style={{fontSize:15,fontWeight:800,color:Math.abs(newPlanTotal-100)<0.5?"var(--green)":newPlanTotal>100?"var(--red)":"var(--gold)"}}>
          {newPlanTotal.toFixed(0)}% / 100%
        </span>
      </div>
      <div className="pct-bar" style={{marginBottom:16}}>
        <div style={{height:"100%",width:`${Math.min(newPlanTotal,100)}%`,background:newPlanTotal>100?"var(--red)":"var(--gold)",borderRadius:99,transition:"width 0.3s"}}/>
      </div>
      <button className="btnp" onClick={savePlan}>✓ Criar Plano</button>
      <button className="btng" onClick={()=>setShowPlanModal(false)}>Cancelar</button>
    </div>
  </div>
)}

{/* MODAL: Cartão */}
{showCardModal&&(
  <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowCardModal(false)}>
    <div className="modal">
      <div className="mtitle">{editingCard!=null?"Editar Cartão":"Novo Cartão"}</div>
      <div className="msub">{editingCard!=null?"Atualize os dados do seu cartão":"Adicione um cartão de crédito ou débito"}</div>

      {/* Preview do cartão */}
      <div style={{
        borderRadius:16, padding:"20px 22px", marginBottom:20,
        background:`linear-gradient(135deg,${CARD_GRADS[cardForm.gradIdx]?.colors[0]||"#334155"},${CARD_GRADS[cardForm.gradIdx]?.colors[1]||"#0f172a"})`,
        position:"relative", overflow:"hidden", minHeight:110
      }}>
        <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
        <div style={{fontSize:11,opacity:0.75,marginBottom:3,fontWeight:700,letterSpacing:"0.8px"}}>{cardForm.flag||"Bandeira"}</div>
        <div style={{fontSize:15,fontWeight:800,marginBottom:10,opacity:cardForm.name?1:0.45}}>{cardForm.name||"Nome do cartão"}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div style={{fontSize:14,fontWeight:600,letterSpacing:"2px",opacity:0.85}}>
            •••• •••• •••• {cardForm.digits||"0000"}
          </div>
          <div style={{textAlign:"right",fontSize:10,opacity:0.65}}>
            {cardForm.due&&<div>Vence dia {cardForm.due}</div>}
          </div>
        </div>
      </div>

      {/* Escolha de gradiente */}
      <div className="field">
        <label className="flbl">Cor do Cartão</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {CARD_GRADS.map((g,i)=>(
            <div key={i} onClick={()=>setCardForm(f=>({...f,gradIdx:i}))} style={{
              width:36, height:36, borderRadius:10, cursor:"pointer",
              background:`linear-gradient(135deg,${g.colors[0]},${g.colors[1]})`,
              border: cardForm.gradIdx===i?"2.5px solid #fff":"2.5px solid transparent",
              boxShadow: cardForm.gradIdx===i?"0 0 0 2px rgba(255,255,255,0.3)":"none",
              transition:"all 0.15s", flexShrink:0
            }}/>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="flbl">Nome do Cartão</label>
        <input className="finp" placeholder="Ex: Nubank Ultravioleta, Itaú Platinum..." value={cardForm.name} onChange={e=>setCardForm(f=>({...f,name:e.target.value}))}/>
      </div>

      <div className="r2" style={{marginBottom:15}}>
        <div className="field" style={{margin:0}}>
          <label className="flbl">Últimos 4 Dígitos</label>
          <input className="finp" placeholder="0000" maxLength={4} value={cardForm.digits} onChange={e=>setCardForm(f=>({...f,digits:e.target.value.replace(/\D/g,"").slice(0,4)}))}/>
        </div>
        <div className="field" style={{margin:0}}>
          <label className="flbl">Bandeira</label>
          <select className="finp" value={cardForm.flag} onChange={e=>setCardForm(f=>({...f,flag:e.target.value}))}>
            {["Visa","Mastercard","American Express","Elo","Hipercard","Débito"].map(fl=>(
              <option key={fl} value={fl}>{fl}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="r2" style={{marginBottom:15}}>
        <div className="field" style={{margin:0}}>
          <label className="flbl">Limite (R$)</label>
          <input className="finp" type="number" placeholder="10000" value={cardForm.limit} onChange={e=>setCardForm(f=>({...f,limit:e.target.value}))}/>
        </div>
        <div className="field" style={{margin:0}}>
          <label className="flbl">Fatura Atual (R$)</label>
          <input className="finp" type="number" placeholder="0" value={cardForm.balance} onChange={e=>setCardForm(f=>({...f,balance:e.target.value}))}/>
        </div>
      </div>

      <div className="field">
        <label className="flbl">Dia do Vencimento</label>
        <input className="finp" placeholder="Ex: 15" maxLength={2} value={cardForm.due} onChange={e=>setCardForm(f=>({...f,due:e.target.value.replace(/\D/g,"").slice(0,2)}))}/>
      </div>

      <button className="btnp" onClick={saveCard}>
        {editingCard!=null?"✓ Salvar Alterações":"+ Adicionar Cartão"}
      </button>
      <button className="btng" onClick={()=>setShowCardModal(false)}>Cancelar</button>
    </div>
  </div>
)}

{/* TOAST */}
{toast&&(
  <div className="toast">
    <div className="tdot" style={{background:toast.type==="err"?"var(--red)":"var(--green)"}}/>
    {toast.msg}
  </div>
)}
</>);
}
