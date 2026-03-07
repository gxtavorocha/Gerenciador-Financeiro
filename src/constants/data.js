// ─── CONSTANTS ───────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { id:"moradia",     label:"Moradia",     icon:"🏠", color:"#E8B86D", custom:false },
  { id:"alimentacao", label:"Alimentação", icon:"🍽️", color:"#6DBFE8", custom:false },
  { id:"transporte",  label:"Transporte",  icon:"🚗", color:"#8BE86D", custom:false },
  { id:"saude",       label:"Saúde",       icon:"💊", color:"#E86DB8", custom:false },
  { id:"lazer",       label:"Lazer",       icon:"🎭", color:"#A86DE8", custom:false },
  { id:"educacao",    label:"Educação",    icon:"📚", color:"#6DE8C8", custom:false },
  { id:"outros",      label:"Outros",      icon:"✦",  color:"#E8986D", custom:false },
];

export const PRESET_COLORS = ["#E8B86D","#6DBFE8","#8BE86D","#E86DB8","#A86DE8","#6DE8C8","#E8986D","#E86D6D","#6D8BE8","#E8D96D","#6DE87A","#E86D9A"];
export const PRESET_ICONS  = ["🏠","🍽️","🚗","💊","🎭","📚","✦","💰","🎮","✈️","👗","🐾","🏋️","🎵","📱","🛒","💡","🏦","🎁","🍺","🏥","🧾"];
export const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const PRESET_PLANS = [
  {
    id:"50-30-20", name:"50 / 30 / 20", badge:"Clássico",
    desc:"A regra de ouro das finanças pessoais",
    groups:[
      { id:"nec", label:"Necessidades", pct:50, color:"#6DBFE8", icon:"🏠", catIds:["moradia","alimentacao","saude","transporte"], desc:"Moradia, comida, saúde, transporte" },
      { id:"des", label:"Desejos",      pct:30, color:"#A86DE8", icon:"🎭", catIds:["lazer","educacao","outros"],                  desc:"Lazer, educação, estilo de vida" },
      { id:"pou", label:"Poupança",     pct:20, color:"#6DE8A0", icon:"💰", catIds:[],                                             desc:"Investimentos e reserva de emergência" },
    ]
  },
  {
    id:"70-20-10", name:"70 / 20 / 10", badge:"Agressivo",
    desc:"Para quem tem mais gastos fixos essenciais",
    groups:[
      { id:"nec", label:"Necessidades", pct:70, color:"#6DBFE8", icon:"🏠", catIds:["moradia","alimentacao","saude","transporte"], desc:"Moradia, comida, saúde, transporte" },
      { id:"des", label:"Desejos",      pct:20, color:"#A86DE8", icon:"🎭", catIds:["lazer","educacao","outros"],                  desc:"Lazer, educação, estilo de vida" },
      { id:"pou", label:"Poupança",     pct:10, color:"#6DE8A0", icon:"💰", catIds:[],                                             desc:"Investimentos e reserva de emergência" },
    ]
  },
  {
    id:"80-10-10", name:"80 / 10 / 10", badge:"Conservador",
    desc:"Para renda menor com foco em sobrevivência",
    groups:[
      { id:"nec", label:"Necessidades", pct:80, color:"#6DBFE8", icon:"🏠", catIds:["moradia","alimentacao","saude","transporte"], desc:"Gastos essenciais do dia a dia" },
      { id:"des", label:"Desejos",      pct:10, color:"#A86DE8", icon:"🎭", catIds:["lazer","educacao","outros"],                  desc:"Lazer e extras" },
      { id:"pou", label:"Poupança",     pct:10, color:"#6DE8A0", icon:"💰", catIds:[],                                             desc:"Reserva de emergência" },
    ]
  },
];

export const SAMPLE_TX = [
  { id:1,  desc:"Salário",           value:8500, type:"income",  category:"outros",      date:"2026-03-01", received:true  },
  { id:2,  desc:"Freelance Design",  value:1800, type:"income",  category:"outros",      date:"2026-03-05", received:true  },
  { id:3,  desc:"Dividendos",        value:620,  type:"income",  category:"outros",      date:"2026-03-10", received:false },
  { id:4,  desc:"Aluguel",           value:2200, type:"expense", category:"moradia",     date:"2026-03-02" },
  { id:5,  desc:"Supermercado",      value:480,  type:"expense", category:"alimentacao", date:"2026-03-03" },
  { id:6,  desc:"Netflix + Spotify", value:65,   type:"expense", category:"lazer",       date:"2026-03-04" },
  { id:7,  desc:"Academia",          value:120,  type:"expense", category:"saude",       date:"2026-03-06" },
  { id:8,  desc:"Combustível",       value:280,  type:"expense", category:"transporte",  date:"2026-03-07" },
  { id:9,  desc:"Restaurante",       value:95,   type:"expense", category:"alimentacao", date:"2026-03-08" },
  { id:10, desc:"Internet",          value:99,   type:"expense", category:"educacao",    date:"2026-03-09" },
  { id:11, desc:"Cafeteria",         value:38,   type:"expense", category:"alimentacao", date:"2026-03-12" },
  { id:12, desc:"Uber",              value:45,   type:"expense", category:"transporte",  date:"2026-03-14" },
];

export const MONTHLY_HIST = [
  { m:"Out", r:9200, d:5800 }, { m:"Nov", r:8700, d:6100 },
  { m:"Dez", r:11500,d:7800 }, { m:"Jan", r:8500, d:5400 },
  { m:"Fev", r:9100, d:6300 }, { m:"Mar", r:10800,d:3521 },
];

export const DEFAULT_CARDS = [
  { id:1, name:"Nubank Ultravioleta", digits:"3421", balance:4250, limit:12000, grad:["#7c3aed","#4c1d95"], flag:"Mastercard", due:"15" },
  { id:2, name:"Itaú Personnalité",   digits:"8870", balance:1830, limit:8000,  grad:["#b45309","#92400e"], flag:"Visa",       due:"08" },
];

export const CARD_GRADS = [
  { label:"Roxo",    colors:["#7c3aed","#4c1d95"] },
  { label:"Âmbar",   colors:["#b45309","#92400e"] },
  { label:"Slate",   colors:["#334155","#0f172a"] },
  { label:"Rose",    colors:["#be123c","#881337"] },
  { label:"Teal",    colors:["#0f766e","#134e4a"] },
  { label:"Indigo",  colors:["#4338ca","#312e81"] },
  { label:"Ouro",    colors:["#92400e","#78350f"] },
  { label:"Grafite", colors:["#374151","#111827"] },
];