import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import {
  Calendar, Heart, AlertTriangle, Home, Wrench, Leaf, Save, Utensils,
  Check, ExternalLink, X, ChefHat, RotateCcw, ChevronDown, ChevronLeft, ChevronRight,
  Plus, Star, CheckCircle, Trophy, MessageSquare, Users, Edit,
  Wind, Armchair, Thermometer, Droplets, Shield, Snowflake, Flame, Sparkles,
  Bug, ThumbsUp, ThumbsDown, ClipboardCheck, ArrowRight, ShoppingCart, Copy, LogOut
} from "lucide-react";

// ── CALENDAR EVENTS ───────────────────────────────────────────────────────────
// Events loaded live from Google Calendar (see fetchCalendarEvents)
const ACTION_ITEMS = []; // Populated from calendar urgent events in future

// ── MAINTENANCE ───────────────────────────────────────────────────────────────
const MAINTENANCE = {
  0:[{id:"j1",task:"Replace furnace filters",cat:"HVAC",p:"high"},{id:"j2",task:"Inspect roof for ice dams",cat:"Roof",p:"high"},{id:"j3",task:"Test smoke & CO detectors",cat:"Safety",p:"high"},{id:"j4",task:"Check exposed pipe insulation",cat:"Plumbing",p:"medium"},{id:"j5",task:"Clean dryer vent",cat:"Appliances",p:"medium"}],
  1:[{id:"f1",task:"Replace furnace filters",cat:"HVAC",p:"high"},{id:"f2",task:"Deep clean kitchen appliances",cat:"Appliances",p:"medium"},{id:"f3",task:"Check & replace weatherstripping",cat:"Insulation",p:"medium"},{id:"f4",task:"Service whole-house humidifier",cat:"HVAC",p:"medium"}],
  2:[{id:"mr1",task:"Schedule spring HVAC tune-up",cat:"HVAC",p:"high"},{id:"mr2",task:"Clean gutters",cat:"Exterior",p:"high"},{id:"mr3",task:"Inspect roof for winter damage",cat:"Roof",p:"high"},{id:"mr4",task:"Prep sprinkler system",cat:"Irrigation",p:"medium"},{id:"mr5",task:"Wash windows inside and out",cat:"Cleaning",p:"low"}],
  3:[{id:"ap1",task:"Activate & test sprinkler system",cat:"Irrigation",p:"high"},{id:"ap2",task:"First lawn fertilizer application",cat:"Lawn",p:"high"},{id:"ap3",task:"Service AC unit",cat:"HVAC",p:"high"},{id:"ap4",task:"Power wash driveway & deck",cat:"Exterior",p:"medium"},{id:"ap5",task:"Inspect exterior caulk & siding",cat:"Exterior",p:"medium"},{id:"ap6",task:"Set up patio furniture",cat:"Outdoor",p:"low"}],
  4:[{id:"my1",task:"Pre-treat lawn for weeds before heat sets in",cat:"Lawn",p:"high"},{id:"my2",task:"Replace AC filters",cat:"HVAC",p:"high"},{id:"my3",task:"Roof inspection before hail season peaks",cat:"Roof",p:"high"},{id:"my4",task:"Clean gutters",cat:"Exterior",p:"medium"},{id:"my5",task:"Trim trees & shrubs away from house",cat:"Lawn",p:"medium"},{id:"my6",task:"Test sump pump",cat:"Plumbing",p:"medium"}],
  5:[{id:"jn1",task:"Replace AC filters",cat:"HVAC",p:"high"},{id:"jn2",task:"Check attic ventilation",cat:"Insulation",p:"medium"},{id:"jn3",task:"Schedule pest inspection",cat:"Pest",p:"medium"},{id:"jn4",task:"Deep clean gutters",cat:"Exterior",p:"medium"},{id:"jn5",task:"Adjust sprinkler for summer heat",cat:"Irrigation",p:"medium"}],
  6:[{id:"jl1",task:"Replace AC filters",cat:"HVAC",p:"high"},{id:"jl2",task:"Audit sprinkler heads",cat:"Irrigation",p:"high"},{id:"jl3",task:"Lawn grub check",cat:"Lawn",p:"medium"},{id:"jl4",task:"Inspect deck for loose boards",cat:"Exterior",p:"medium"}],
  7:[{id:"au1",task:"Book fall furnace tune-up NOW",cat:"HVAC",p:"high"},{id:"au2",task:"Clean dryer vent",cat:"Appliances",p:"medium"},{id:"au3",task:"Test smoke & CO detectors",cat:"Safety",p:"high"},{id:"au4",task:"Replace AC filters",cat:"HVAC",p:"high"}],
  8:[{id:"sp1",task:"Schedule sprinkler blow-out by Oct 15",cat:"Irrigation",p:"high"},{id:"sp2",task:"Fall fertilizer - most critical application",cat:"Lawn",p:"high"},{id:"sp3",task:"Check & replace weatherstripping",cat:"Insulation",p:"medium"},{id:"sp4",task:"Clean gutters",cat:"Exterior",p:"medium"},{id:"sp5",task:"Replace furnace filters",cat:"HVAC",p:"high"}],
  9:[{id:"oc1",task:"BLOW OUT SPRINKLER SYSTEM",cat:"Irrigation",p:"critical"},{id:"oc2",task:"Winterize outdoor faucets",cat:"Plumbing",p:"high"},{id:"oc3",task:"Clean gutters post leaf-fall",cat:"Exterior",p:"high"},{id:"oc4",task:"Service snow blower",cat:"Snow",p:"high"},{id:"oc5",task:"Store outdoor furniture",cat:"Outdoor",p:"medium"},{id:"oc6",task:"Check sump pump before ground freeze",cat:"Plumbing",p:"medium"}],
  10:[{id:"nv1",task:"Replace furnace filters",cat:"HVAC",p:"high"},{id:"nv2",task:"Check heat tape on exposed pipes",cat:"Plumbing",p:"high"},{id:"nv3",task:"Test generator",cat:"Safety",p:"medium"},{id:"nv4",task:"Deep clean before holidays",cat:"Cleaning",p:"medium"},{id:"nv5",task:"Stock ice melt & winter kit",cat:"Snow",p:"medium"}],
  11:[{id:"dc1",task:"Replace furnace filters",cat:"HVAC",p:"high"},{id:"dc2",task:"Check exterior lights & fire safety",cat:"Safety",p:"medium"},{id:"dc3",task:"Clear exterior drains before freeze",cat:"Plumbing",p:"medium"},{id:"dc4",task:"Inspect attic insulation",cat:"Insulation",p:"medium"}],
};

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
const CHECKLIST_SECTIONS = [
  { id:"planning", title:"Date planning & details", items:[
    {id:"pl1",text:"Who is organizing the details?"},{id:"pl2",text:"Place or activity confirmed"},
    {id:"pl3",text:"Sequence of events planned"},{id:"pl4",text:"Reservations or tickets purchased?"},
    {id:"pl5",text:"Confirmation numbers saved"},{id:"pl6",text:"Hotel/overnight check-in confirmed (if applicable)"},
    {id:"pl7",text:"Dress code or anything to bring discussed?"},{id:"pl8",text:"Any surprises or boundaries discussed?"},
  ]},
  { id:"transport", title:"Transportation & logistics", items:[
    {id:"tr1",text:"What time do we need to leave?"},{id:"tr2",text:"Who is driving?"},
    {id:"tr3",text:"Alternate transport if needed?"},{id:"tr4",text:"Traffic, parking, check-in timing considered?"},
    {id:"tr5",text:"Address saved and accessible"},{id:"tr6",text:"Return time agreed"},
  ]},
  { id:"childcare", title:"Childcare arrangements", items:[
    {id:"cc1",text:"Who is watching the kids, and where?"},{id:"cc2",text:"Kids are aware and comfortable"},
    {id:"cc3",text:"Backup childcare confirmed"},{id:"cc4",text:"Drop-off and pick-up times set"},
    {id:"cc5",text:"Kids supplies packed"},{id:"cc6",text:"Bedtime routines, meals, allergies communicated"},
    {id:"cc7",text:"Emergency contacts and our location shared"},{id:"cc8",text:"Medical details left behind"},
    {id:"cc9",text:"Check-in plan during the night agreed"},
  ]},
  { id:"emotional", title:"Mental & emotional check-in", description:"Do this together before you leave.", items:[
    {id:"em1",text:"Each person's mood, energy, stress - shared?"},{id:"em2",text:"Work/parenting issues that might affect being present?"},
    {id:"em3",text:"Any tension or unresolved emotions?"},{id:"em4",text:"What emotional support does each person need tonight?"},
    {id:"em5",text:"Intention for this time together - stated?"},{id:"em6",text:"What would help each of us get into a connected mindset?"},
  ]},
  { id:"connection", title:"Connection & communication", items:[
    {id:"cn1",text:"Safe word or signal for needing a breather - agreed?"},{id:"cn2",text:"What is each person hoping to feel tonight?"},
    {id:"cn3",text:"Possible challenges acknowledged?"},{id:"cn4",text:"What would make tonight feel special?"},
    {id:"cn5",text:"Anything off-limits for tonight?"},{id:"cn6",text:"How does each person like to feel loved tonight?"},
    {id:"cn7",text:"One thing each partner could do to help the other - shared?"},
  ]},
  { id:"reflection", title:"After the date - reflection", description:"Circle back together when settled.", items:[
    {id:"rf1",text:"What did each person enjoy most?"},{id:"rf2",text:"Anything to learn or do differently next time?"},
    {id:"rf3",text:"Appreciation or compliment shared?"},
  ]},
];

const CONNECTION_QUESTIONS = [
  {kelly:"What do you need more of from me this week?",kevin:"What is one thing Kelly did recently that you have not thanked her for?"},
  {kelly:"What is weighing on you most right now?",kevin:"What would make this week feel like a win for you?"},
  {kelly:"How are you really doing - not the quick answer?",kevin:"What is one way I can make your life easier this week?"},
  {kelly:"Is there anything you have wanted to say but have not?",kevin:"What are you most looking forward to this week?"},
  {kelly:"What are you proud of from last week?",kevin:"What do you need from Kelly to feel supported?"},
  {kelly:"What has been stressing you out that we have not talked about?",kevin:"What is one thing you would love for us to do together soon?"},
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
// ── LOGISTICS: two-kid drop-off / pick-up coordination ────────────────────────
// Lily is in kindergarten (M-Th 8:30–3:30, Fri 9:15–3:30).
// Carter is in daycare.
// Each weekday, both parents (and Nana & Grumpa) coordinate who handles each leg.
const K_SCHEDULE = { 1:"8:30 AM–3:27 PM", 2:"8:30 AM–3:27 PM", 3:"8:30 AM–3:27 PM", 4:"8:30 AM–3:27 PM", 5:"9:15 AM–3:27 PM" };
const DAYCARE_HOURS = "6:30 AM–6:00 PM";
const DROPOFF_OPTIONS = ["Kelly", "Kevin", "Nana & Grumpa"];
const PICKUP_OPTIONS  = ["Kelly", "Kevin", "Nana & Grumpa"];
const AFTER_K_OPTIONS = ["Us", "Nana & Grumpa", "BASE", "Activity"];
const AFTER_K_LABEL = {"Nana & Grumpa":"Nana & G"};
const PERSON_COLOR = {
  Kelly:            { active: "bg-rose-500 text-white border-rose-500",     badge: "bg-rose-100 text-rose-700 border-rose-200" },
  Kevin:            { active: "bg-blue-500 text-white border-blue-500",     badge: "bg-blue-100 text-blue-700 border-blue-200" },
  "Nana & Grumpa":  { active: "bg-emerald-500 text-white border-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Together:         { active: "bg-violet-500 text-white border-violet-500",   badge: "bg-violet-100 text-violet-700 border-violet-200" },
};
const ACTIVITY_OWNERS = ["Kelly", "Kevin", "Nana & Grumpa", "Together"];
const AFTER_K_COLOR = {
  Us:               { active: "bg-violet-500 text-white border-violet-500",   badge: "bg-violet-100 text-violet-700 border-violet-200" },
  "Nana & Grumpa":  { active: "bg-emerald-500 text-white border-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  BASE:             { active: "bg-amber-500 text-white border-amber-500",     badge: "bg-amber-100 text-amber-700 border-amber-200" },
  Activity:         { active: "bg-cyan-500 text-white border-cyan-500",       badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};
const HOUSE_ICONS = {HVAC:Wind,Roof:Home,Safety:Shield,Plumbing:Droplets,Appliances:Wrench,Lawn:Leaf,Irrigation:Droplets,Exterior:Home,Snow:Snowflake,Cleaning:Sparkles,Insulation:Thermometer,Outdoor:Armchair,Pest:Bug};
const PRIORITY_COLOR = {critical:"text-rose-600",high:"text-amber-600",medium:"text-stone-400",low:"text-stone-300"};

const uid = () => Math.random().toString(36).slice(2,9);
// Firestore map keys can't contain "." or "/", and calendar UIDs usually do
const eventKeyOf = (id) => String(id||"").replace(/[^a-zA-Z0-9]/g,"_").slice(0,150);
const normalizeMeal = (s) => (s||"").trim().toLowerCase();
const categorizeIngredient = (item) => {
  const s = (item||"").toLowerCase();
  if (/(lettuce|tomato|onion|pepper|lime|lemon|garlic|cilantro|avocado|potato|carrot|celery|broccoli|cucumber|spinach|kale|zucchini|mushroom|apple|banana|berr|greens|scallion|shallot|corn|asparagus|green bean|peas|coleslaw|olive)/.test(s)) return "Produce";
  if (/(chicken|beef|pork|turkey|salmon|fish|shrimp|steak|bacon|sausage|tofu|egg|roast|\bmeat\b)/.test(s)) return "Protein";
  if (/(milk|cheese|butter|cream|yogurt|mozzarella|cheddar|parmesan|feta)/.test(s)) return "Dairy";
  return "Pantry";
};
// Split "Lime, 2" -> {num:2, unit:""}; "Ground beef, 1.5 lbs" -> {num:1.5, unit:"lbs"}
const parseQty = (qtyStr) => {
  const m = (qtyStr||"").trim().match(/^([\d.\/]+)\s*(.*)$/);
  if (!m) return { num: null, unit: (qtyStr||"").trim() };
  let num;
  if (m[1].includes("/")) { const [a,b]=m[1].split("/").map(Number); num = b ? a/b : Number(a); }
  else num = parseFloat(m[1]);
  if (isNaN(num)) return { num: null, unit: (qtyStr||"").trim() };
  return { num, unit: (m[2]||"").trim() };
};
// Combine same-named ingredient strings, summing quantities when units match
const combineItems = (strings) => {
  const name = strings[0].split(",")[0].trim();
  const parts = strings.map(s => { const i = s.indexOf(","); return i===-1 ? "" : s.slice(i+1).trim(); });
  const parsed = parts.map(parseQty);
  const unitNorm = (u) => u.toLowerCase().replace(/s$/,"");
  const numeric = parsed.filter(p => p.num !== null);
  const units = new Set(parsed.map(p => unitNorm(p.unit)));
  if (numeric.length === parsed.length && units.size === 1) {
    const sum = numeric.reduce((a,p) => a + p.num, 0);
    const disp = Number.isInteger(sum) ? String(sum) : String(Math.round(sum*100)/100);
    return parsed[0].unit ? `${name}, ${disp} ${parsed[0].unit}` : `${name}, ${disp}`;
  }
  const distinct = [...new Set(parts.filter(Boolean))];
  return distinct.length ? `${name}, ${distinct.join(" + ")}` : name;
};
// Words too generic to identify a recipe on their own
const RECIPE_STOP = new Set(["and","with","the","or","of","a","an","in","on","for","to","sheet","pan","style","homemade","easy","quick","baked","grilled","fried","roasted","slow","cooker","instant","pot","one","dinner","night","sauce","fresh","classic","best","bowl","bowls","plate"]);
const recipeWords = (s) => (s||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>2&&!RECIPE_STOP.has(w));
// Match a planned meal to a recipe key: full-name match wins, otherwise
// require strong overlap of the recipe's distinctive words (avoids matching
// e.g. "chicken and rice" to "sheet pan chicken fajitas" on the word "chicken")
const matchRecipeKey = (meal, keys) => {
  const norm = (meal||"").toLowerCase();
  let sub=null;
  keys.forEach(k=>{ if(k && norm.includes(k) && (!sub || k.length>sub.length)) sub=k; });
  if(sub) return sub;
  const mw = new Set(recipeWords(meal));
  let best=null, bestScore=0;
  keys.forEach(k=>{
    const kw = recipeWords(k);
    if(!kw.length) return;
    const shared = kw.filter(w=>mw.has(w)).length;
    const need = Math.max(2, Math.ceil(kw.length*0.5));
    if(shared>=need && shared>bestScore){ best=k; bestScore=shared; }
  });
  return best;
};
const getMonday = (d) => { const date=new Date(d),dow=date.getDay(); date.setDate(date.getDate()-(dow===0?6:dow-1)); date.setHours(0,0,0,0); return date; };
const fmtDateKey = (date) => { const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0"); return y+"-"+m+"-"+d; };
const subtractDays = (dateKey,n) => { const [y,m,d]=dateKey.split("-").map(Number); return fmtDateKey(new Date(y,m-1,d-n)); };

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────────
function OwnerToggle({ value, onChange }) {
  const opts=[
    {val:"Kelly",on:"bg-rose-500 text-white border-rose-500",off:"border-stone-200 text-stone-400 hover:bg-rose-50 hover:text-rose-600"},
    {val:"Kevin",on:"bg-blue-500 text-white border-blue-500",off:"border-stone-200 text-stone-400 hover:bg-blue-50 hover:text-blue-600"},
    {val:"Together",label:"Both",on:"bg-violet-500 text-white border-violet-500",off:"border-stone-200 text-stone-400 hover:bg-violet-50 hover:text-violet-600"},
  ];
  return (
    <div className="flex gap-1.5">
      {opts.map(o=>(
        <button key={o.val} onClick={()=>onChange(value===o.val?null:o.val)}
          className={"px-3 py-1 text-xs rounded-full font-semibold border transition-colors "+(value===o.val?o.on:o.off)}>
          {o.label||o.val}
        </button>
      ))}
    </div>
  );
}

function OwnerBadge({ value }) {
  if(!value) return <span className="text-xs text-stone-400 italic">unassigned</span>;
  const c={Kelly:"bg-rose-100 text-rose-700",Kevin:"bg-blue-100 text-blue-700",Together:"bg-violet-100 text-violet-700"};
  return <span className={"text-xs px-2.5 py-0.5 rounded-full font-semibold "+(c[value]||"bg-stone-100 text-stone-600")}>{value}</span>;
}

function SectionHeader({ icon:Icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-stone-400 flex-shrink-0"/>
      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex-1">{title}</h2>
      {count!==undefined&&<span className="text-xs text-stone-400">{count}</span>}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function FamilySOUnion({ db, user, role, onSignOut }) {
  const isCalendarOnly = role === "calendar";
  const today = useMemo(()=>new Date(),[]);
  const monthIdx = today.getMonth();
  const monthKey = monthIdx+"-"+today.getFullYear();
  const [weekOffset,setWeekOffset] = useState(0);

  const planningWeek = useMemo(()=>{
    const isSun=today.getDay()===0;
    const ref=new Date(today);
    if(isSun) ref.setDate(today.getDate()+1);
    ref.setDate(ref.getDate()+(weekOffset*7));
    const monday=getMonday(ref);
    return Array.from({length:7},(_,i)=>{
      const d=new Date(monday); d.setDate(monday.getDate()+i);
      return {key:fmtDateKey(d),label:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],dateStr:d.toLocaleDateString("en-US",{month:"short",day:"numeric"})};
    });
  },[today,weekOffset]);

  const weekId     = planningWeek[0].key;
  const lastWeekId = subtractDays(weekId,7);
  const weekNum    = Math.floor(Date.now()/(7*24*60*60*1000));
  const connectionQ = CONNECTION_QUESTIONS[weekNum%CONNECTION_QUESTIONS.length];
  const maintenanceTasks = MAINTENANCE[monthIdx]||[];

  // daysUntilDate is now computed inline from nextDateNight

  // ── STATE ─────────────────────────────────────────────────────────────────
  // Calendar state
  const [calEvents, setCalEvents]         = useState([]);
  const [calLoading, setCalLoading]       = useState(false);
  const [nextDateNight, setNextDateNight] = useState(null);
  // Add-event form (writes to the family Google Calendar via /api/create-event)
  const [showAddEvent,setShowAddEvent]    = useState(false);
  const [eventForm,setEventForm]          = useState({title:"",date:"",allDay:false,startTime:"18:00",endTime:"",notes:"",who:"family"});
  const [eventSaving,setEventSaving]      = useState(false);
  const [eventError,setEventError]        = useState("");

  // Fetch calendar from Vercel serverless function (reads iCal privately server-side)
  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    try {
      const res = await fetch("/api/calendar");
      if(!res.ok) throw new Error("Calendar fetch failed: "+res.status);
      const data = await res.json();
      const events = data.events || [];
      setCalEvents(events);
      const dateKeywords = ["date night","date with","💕","❤️","anniversary","dinner with","just us"];
      const nd = events.find(e=>dateKeywords.some(k=>e.title.toLowerCase().includes(k)));
      if(nd){
        const d = new Date(nd.date+"T12:00:00");
        setNextDateNight({ date:d, label:d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}), title:nd.title });
      }
    } catch(e){ console.error("Calendar error:",e); }
    setCalLoading(false);
  },[]);
  useEffect(()=>{ fetchCalendar(); },[fetchCalendar]);

  const submitEvent = async()=>{
    const title=eventForm.title.trim();
    if(!title||!eventForm.date){ setEventError("Add a title and date."); return; }
    setEventSaving(true); setEventError("");
    try {
      const res=await fetch("/api/create-event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...eventForm,title})});
      const data=await res.json();
      if(!res.ok||!data.ok) throw new Error(data.error||"Could not add the event.");
      setEventForm({title:"",date:"",allDay:false,startTime:"18:00",endTime:"",notes:"",who:"family"});
      setShowAddEvent(false);
      setTimeout(fetchCalendar,1500); // give Google a moment, then refresh the list
    } catch(e){ setEventError(e.message); }
    setEventSaving(false);
  };

  const [tab,setTab]                    = useState(isCalendarOnly ? "align" : "debrief");
  const [tabsVisited,setTabsVisited]    = useState(new Set([isCalendarOnly ? "align" : "debrief"]));
  const [syncStatus,setSyncStatus]      = useState("loading"); // loading|synced|saving

  // Current week data
  const [wins,setWins]                  = useState({kelly:"",kevin:""});
  const [appreciation,setAppreciation]  = useState({kelly:"",kevin:""});
  const [decisions,setDecisions]        = useState([]);
  const [logistics,setLogistics]        = useState({});
  const [ownership,setOwnership]        = useState({});
  const [parking,setParking]            = useState("");
  const [meals,setMeals]                = useState({});
  const [checklistState,setChecklistState] = useState({});
  const [checklistNote,setChecklistNote]   = useState("");
  const [checklistAnswers,setChecklistAnswers] = useState({});
  const [datePlanned,setDatePlanned]    = useState(false);
  const [mealFeedback,setMealFeedback]  = useState({});
  const [groceryList,setGroceryList]    = useState({});
  const [groceryChecked,setGroceryChecked] = useState({});

  // Last week data (for Debrief)
  const [lastWeekDecisions,setLastWeekDecisions] = useState([]);

  // House (separate collection)
  const [houseDone,setHouseDone]        = useState({});

  // UI state
  const [newDecText,setNewDecText]      = useState("");
  const [newDecOwner,setNewDecOwner]    = useState(null);
  const [mealEdits,setMealEdits]        = useState({});
  const [selectedMealDay,setSelectedMealDay] = useState(null);
  const [saveStatus,setSaveStatus]      = useState("idle");
  const [expandedSections,setExpandedSections] = useState({});
  const [copyStatus,setCopyStatus]      = useState("idle");
  const mealSaveTimer = useRef(null);

  // Meeting streak (persisted across weeks)
  const [streak,setStreak]              = useState({count:0,best:0,lastCompletedWeek:null});
  const streakRecorded                  = useRef(false);

  // Recipe library + persistent meal ratings (shared)
  const [recipes,setRecipes]            = useState([]);
  const [mealRatings,setMealRatings]    = useState({});
  const [showAddRecipe,setShowAddRecipe]= useState(false);
  const [recipeForm,setRecipeForm]      = useState({name:"",url:"",time:"",ingredients:""});

  // AI (Phase 3): recipe import + meal suggestions
  const [importing,setImporting]        = useState(false);
  const [importError,setImportError]    = useState("");
  const [showImportText,setShowImportText] = useState(false);
  const [importText,setImportText]      = useState("");
  const [aiSuggestions,setAiSuggestions]= useState([]);
  const [aiLoading,setAiLoading]        = useState(false);
  const [aiError,setAiError]            = useState("");
  const [openRecipe,setOpenRecipe]      = useState(null);
  const [instacartLoading,setInstacartLoading] = useState(false);
  const [instacartError,setInstacartError]     = useState("");
  const [groceryShareStatus,setGroceryShareStatus] = useState("idle");

  // ── FIRESTORE LISTENERS ───────────────────────────────────────────────────
  useEffect(()=>{
    // If Firestore doesn't respond within 15s, stop hanging so the user sees something
    const timeout = setTimeout(()=>setSyncStatus("synced"), 15000);
    // Current week
    const currRef = doc(db,"sou",weekId);
    const unsubCurr = onSnapshot(currRef,(snap)=>{
      if(snap.exists()){
        const d=snap.data();
        setWins(d.wins||{kelly:"",kevin:""});
        setAppreciation(d.appreciation||{kelly:"",kevin:""});
        setDecisions(d.decisions||[]);
        setLogistics(d.logistics||{});
        setOwnership(d.ownership||{});
        setParking(d.parking||"");
        setMeals(d.meals||{});
        setChecklistState(d.checklistState||{});
        setChecklistNote(d.checklistNote||"");
        setChecklistAnswers(d.checklistAnswers||{});
        setDatePlanned(!!d.datePlanned);
        setMealFeedback(d.mealFeedback||{});
        setGroceryList(d.groceryList||{});
        setGroceryChecked(d.groceryChecked||{});
      }
      setSyncStatus("synced");
    },(err)=>{
      console.error("Firestore error (current week):",err);
      setSyncStatus("synced");
    });
    // Last week (for Debrief)
    const lastRef = doc(db,"sou",lastWeekId);
    const unsubLast = onSnapshot(lastRef,(snap)=>{
      if(snap.exists()) setLastWeekDecisions(snap.data().decisions||[]);
      else setLastWeekDecisions([]);
    },(err)=>console.error("Firestore error (last week):",err));
    // House maintenance
    const houseRef = doc(db,"house",monthKey);
    const unsubHouse = onSnapshot(houseRef,(snap)=>{
      if(snap.exists()) setHouseDone(snap.data().done||{});
    },(err)=>console.error("Firestore error (house):",err));
    // Streak (single shared doc)
    const streakRef = doc(db,"meta","streak");
    const unsubStreak = onSnapshot(streakRef,(snap)=>{
      if(snap.exists()) setStreak(s=>({...s,...snap.data()}));
    },(err)=>console.error("Firestore error (streak):",err));
    // Recipe library + ratings (shared)
    const recipesRef = doc(db,"meta","recipes");
    const unsubRecipes = onSnapshot(recipesRef,(snap)=>{
      if(snap.exists()) setRecipes(snap.data().list||[]);
    });
    const ratingsRef = doc(db,"meta","ratings");
    const unsubRatings = onSnapshot(ratingsRef,(snap)=>{
      if(snap.exists()) setMealRatings(snap.data().ratings||{});
    },(err)=>console.error("Firestore error (ratings):",err));
    return ()=>{ clearTimeout(timeout); unsubCurr(); unsubLast(); unsubHouse(); unsubStreak(); unsubRecipes(); unsubRatings(); };
  },[db,weekId,lastWeekId,monthKey]);

  // Sync mealEdits with meals from Firestore
  useEffect(()=>{
    const init={};
    planningWeek.forEach(d=>{ init[d.key]=meals[d.key]||""; });
    setMealEdits(init);
  },[meals,planningWeek]);

  // ── PERSIST ───────────────────────────────────────────────────────────────
  const persist = useCallback(async(field,value)=>{
    setSyncStatus("saving");
    try {
      await setDoc(doc(db,"sou",weekId),{[field]:value},{merge:true});
      setSyncStatus("synced");
    } catch(e){ console.error(e); setSyncStatus("synced"); }
  },[db,weekId]);

  const persistHouse = useCallback(async(value)=>{
    try { await setDoc(doc(db,"house",monthKey),{done:value},{merge:true}); } catch(e){ console.error(e); }
  },[db,monthKey]);

  const persistLastWeek = useCallback(async(field,value)=>{
    try { await setDoc(doc(db,"sou",lastWeekId),{[field]:value},{merge:true}); } catch(e){ console.error(e); }
  },[db,lastWeekId]);

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const eventsByDate = useMemo(()=>{
    const g={};
    calEvents.forEach(e=>{ if(!g[e.date]) g[e.date]=[]; g[e.date].push(e); });
    return g;
  },[calEvents]);

  // Events beyond the planning week (upcoming 30 days)
  const upcomingEvents = useMemo(()=>{
    const planningKeys = new Set(planningWeek.map(d=>d.key));
    return calEvents.filter(e=>e.date && !planningKeys.has(e.date)).slice(0,15);
  },[calEvents, planningWeek]);

  const thisWeekDecisions  = useMemo(()=>decisions.filter(d=>d.weekOf===weekId),[decisions,weekId]);
  const carriedInItems     = useMemo(()=>lastWeekDecisions.filter(d=>d.carriedToWeek===weekId),[lastWeekDecisions,weekId]);

  // Days with incomplete logistics assignments (missing drop-off or pick-up)
  const logisticsGaps = useMemo(()=>{
    return planningWeek.filter(day=>{
      const dow = new Date(day.key+"T12:00:00").getDay();
      if (dow === 0 || dow === 6) return false; // weekends — no school logistics
      const dl = logistics[day.key];
      if (!dl) return true;
      const lilyOk = dl.lily && dl.lily.dropoff && dl.lily.afterCare;
      const carterOk = dl.carter && dl.carter.dropoff && dl.carter.pickup;
      return !(lilyOk && carterOk);
    }).map(d=>d.key);
  },[planningWeek,logistics]);

  const conflictDays = logisticsGaps;

  const houseDoneCount    = maintenanceTasks.filter(t=>houseDone[t.id]).length;
  const housePct          = maintenanceTasks.length?Math.round(houseDoneCount/maintenanceTasks.length*100):0;
  const totalCheckItems   = CHECKLIST_SECTIONS.reduce((s,sec)=>s+sec.items.length,0);
  const checkedCount      = Object.values(checklistState).filter(Boolean).length;
  const checklistPct      = totalCheckItems?Math.round(checkedCount/totalCheckItems*100):0;
  const allTabsVisited    = isCalendarOnly
    ? tabsVisited.has("align")
    : ["debrief","align","plan","home","connect"].every(t=>tabsVisited.has(t));
  const mealsPlanned      = planningWeek.filter(d=>(mealEdits[d.key]||"").trim()).length;
  const logisticsSet      = planningWeek.filter(d=>{
    const dow = new Date(d.key+"T12:00:00").getDay();
    if (dow === 0 || dow === 6) return false;
    const dl = logistics[d.key];
    return dl && dl.lily && dl.lily.dropoff && dl.lily.afterCare && dl.carter && dl.carter.dropoff && dl.carter.pickup;
  }).length;
  const groceryAllItems   = useMemo(()=>Object.entries(groceryList).flatMap(([cat,items])=>items.map((_,i)=>cat+"-"+i)),[groceryList]);
  const groceryCheckedCount = groceryAllItems.filter(k=>groceryChecked[k]).length;
  const groceryPct        = groceryAllItems.length?Math.round(groceryCheckedCount/groceryAllItems.length*100):0;

  // Record a completed meeting once per week, and grow the streak.
  // Also writes meetingCompletedAt to trigger the Lily pick-up reminder Cloud Function.
  // Calendar-only users never trigger this (they only visit one tab by design).
  useEffect(()=>{
    if(isCalendarOnly || !allTabsVisited || streakRecorded.current || streak.lastCompletedWeek===weekId) return;
    streakRecorded.current = true;
    const prevWeek = subtractDays(weekId,7);
    const count = streak.lastCompletedWeek===prevWeek ? (streak.count||0)+1 : 1;
    const updated = { count, best:Math.max(streak.best||0,count), lastCompletedWeek:weekId };
    setStreak(updated);
    setDoc(doc(db,"meta","streak"),updated,{merge:true}).catch(e=>console.error(e));
    // Send Lily pick-up reminders via callable Cloud Function
    const sendPickupReminders = httpsCallable(functions, "sendPickupReminders");
    sendPickupReminders({ weekId }).catch(e=>console.error("Pick-up reminder error:",e));
  },[allTabsVisited,streak,weekId,db,isCalendarOnly]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const visitTab = t=>{ setTab(t); setTabsVisited(p=>new Set([...p,t])); };

  const updateDecision = async(id,patch,isLastWeek=false)=>{
    if(isLastWeek){
      const u=lastWeekDecisions.map(d=>d.id===id?{...d,...patch}:d);
      setLastWeekDecisions(u); await persistLastWeek("decisions",u);
    } else {
      const u=decisions.map(d=>d.id===id?{...d,...patch}:d);
      setDecisions(u); await persist("decisions",u);
    }
  };

  const addDecision = async()=>{
    if(!newDecText.trim()) return;
    const dec={id:uid(),text:newDecText.trim(),owner:newDecOwner,status:"open",weekOf:weekId,createdAt:new Date().toISOString()};
    const u=[...decisions,dec];
    setDecisions(u); await persist("decisions",u);
    setNewDecText(""); setNewDecOwner(null);
  };

  const carryForward = async(dec)=>{
    const u=lastWeekDecisions.map(d=>d.id===dec.id?{...d,status:"carried",carriedToWeek:weekId}:d);
    setLastWeekDecisions(u); await persistLastWeek("decisions",u);
  };

  const saveLogistics = async(dateKey,child,field,val)=>{
    const dayLog = logistics[dateKey] || {};
    const childLog = dayLog[child] || {};
    // Toggle off if clicking the same value
    const newVal = childLog[field] === val ? null : val;
    const u = {
      ...logistics,
      [dateKey]: {
        ...dayLog,
        [child]: { ...childLog, [field]: newVal },
      },
    };
    setLogistics(u); await persist("logistics",u);
  };

  // Set a logistics field without toggling (used for text inputs like activity name)
  const setLogisticsField = async(dateKey,child,field,val)=>{
    const dayLog = logistics[dateKey] || {};
    const childLog = dayLog[child] || {};
    const u = {
      ...logistics,
      [dateKey]: {
        ...dayLog,
        [child]: { ...childLog, [field]: val },
      },
    };
    setLogistics(u); await persist("logistics",u);
  };

  // Assign a person to a calendar event (e.g. "Swim with Grace" → Kelly).
  // Calendar UIDs contain "." and "@", which are not valid Firestore map keys.
  const saveEventOwner = async(dateKey,eventId,who)=>{
    const key = eventKeyOf(eventId);
    const dayLog = logistics[dateKey] || {};
    const owners = dayLog.eventOwners || {};
    const u = {
      ...logistics,
      [dateKey]: { ...dayLog, eventOwners: { ...owners, [key]: owners[key]===who ? null : who } },
    };
    setLogistics(u); await persist("logistics",u);
  };

  const saveOwnership = async(itemId,val)=>{
    const u={...ownership,[itemId]:val};
    setOwnership(u); await persist("ownership",u);
  };

  const autoSaveMeals = (updatedEdits)=>{
    clearTimeout(mealSaveTimer.current);
    mealSaveTimer.current=setTimeout(async()=>{
      const u={...meals};
      Object.entries(updatedEdits).forEach(([k,v])=>{ const t=(v||"").trim(); if(t) u[k]=t; else delete u[k]; });
      setMeals(u); await persist("meals",u);
      setSaveStatus("autosaved"); setTimeout(()=>setSaveStatus("idle"),1500);
    },600);
  };

  const saveMeals = async()=>{
    clearTimeout(mealSaveTimer.current);
    const u={...meals};
    Object.entries(mealEdits).forEach(([k,v])=>{ const t=(v||"").trim(); if(t) u[k]=t; else delete u[k]; });
    setMeals(u); await persist("meals",u);
    setSaveStatus("saved"); setTimeout(()=>setSaveStatus("idle"),2000);
  };

  const toggleHouseTask = async id=>{
    const u={...houseDone,[id]:!houseDone[id]};
    setHouseDone(u); await persistHouse(u);
  };

  const toggleCheck = async id=>{
    const u={...checklistState,[id]:!checklistState[id]};
    setChecklistState(u); await persist("checklistState",u);
  };

  const resetChecklist = async()=>{
    setChecklistState({}); setChecklistNote(""); setChecklistAnswers({});
    await persist("checklistState",{}); await persist("checklistNote",""); await persist("checklistAnswers",{});
  };

  const rateMeal = async(mealName,rating)=>{
    const name=normalizeMeal(mealName);
    if(!name) return;
    const u={...mealRatings};
    if(u[name]===rating) delete u[name]; else u[name]=rating;
    setMealRatings(u);
    try { await setDoc(doc(db,"meta","ratings"),{ratings:u},{merge:true}); } catch(e){ console.error(e); }
  };

  const addRecipe = async()=>{
    const name=recipeForm.name.trim();
    if(!name) return;
    const ingredients=recipeForm.ingredients.split("\n").map(s=>s.trim()).filter(Boolean);
    const rec={id:uid(),name,url:recipeForm.url.trim(),time:recipeForm.time.trim(),ingredients};
    const u=[...recipes,rec];
    setRecipes(u);
    try { await setDoc(doc(db,"meta","recipes"),{list:u},{merge:true}); } catch(e){ console.error(e); }
    setRecipeForm({name:"",url:"",time:"",ingredients:""}); setShowAddRecipe(false);
  };

  const removeRecipe = async(id)=>{
    const u=recipes.filter(r=>r.id!==id);
    setRecipes(u);
    try { await setDoc(doc(db,"meta","recipes"),{list:u},{merge:true}); } catch(e){ console.error(e); }
  };

  const importRecipe = async(payload)=>{
    setImporting(true); setImportError("");
    try {
      const res=await fetch("/api/import-recipe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Import failed");
      if(!data.name && (!data.ingredients||!data.ingredients.length)) throw new Error("Couldn't find a recipe there. Try pasting the text instead.");
      setRecipeForm(f=>({
        name:data.name||f.name,
        url:payload.url||f.url,
        time:data.time||f.time,
        ingredients:(data.ingredients||[]).join("\n")||f.ingredients,
      }));
    } catch(e){ setImportError(e.message); }
    setImporting(false);
  };

  const fetchSuggestions = async()=>{
    setAiLoading(true); setAiError("");
    try {
      const liked=Object.entries(mealRatings).filter(([,v])=>v==="liked").map(([k])=>k);
      const disliked=Object.entries(mealRatings).filter(([,v])=>v==="disliked").map(([k])=>k);
      const recent=Object.values(meals).filter(Boolean);
      const res=await fetch("/api/suggest-meals",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({liked,disliked,recent})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Request failed");
      setAiSuggestions(data.suggestions||[]);
    } catch(e){ setAiError(e.message); }
    setAiLoading(false);
  };

  // Pick an AI suggestion for a day, and save its ingredients to the recipe
  // library so the grocery generator can use them (avoids "Add manually").
  const useAiSuggestion = async(dayKey,s)=>{
    const u={...mealEdits,[dayKey]:s.name};
    setMealEdits(u); autoSaveMeals(u); setSelectedMealDay(null);
    if(s.ingredients&&s.ingredients.length){
      const norm=normalizeMeal(s.name);
      if(!recipes.some(r=>normalizeMeal(r.name)===norm)){
        const nu=[...recipes,{id:uid(),name:s.name,url:"",time:s.time||"",ingredients:s.ingredients,steps:s.steps||[]}];
        setRecipes(nu);
        try { await setDoc(doc(db,"meta","recipes"),{list:nu},{merge:true}); } catch(e){ console.error(e); }
      }
    }
  };

  const sendToInstacart = async()=>{
    setInstacartLoading(true); setInstacartError("");
    try {
      const items=Object.entries(groceryList).filter(([cat])=>cat!=="Add manually").flatMap(([,arr])=>arr);
      const res=await fetch("/api/instacart",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({items})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Request failed");
      if(data.url) window.open(data.url,"_blank","noopener");
      else throw new Error("No link returned");
    } catch(e){ setInstacartError(e.message); }
    setInstacartLoading(false);
  };

  const shareGroceryList = async()=>{
    // Clean one-item-per-line (no headers/bullets, skip placeholders) so it
    // pastes perfectly into AnyList and other grocery apps.
    const items=Object.entries(groceryList).filter(([cat])=>cat!=="Add manually").flatMap(([,arr])=>arr);
    const text=items.join("\n");
    if(navigator.share){
      try { await navigator.share({title:"Grocery list",text}); } catch(e){ /* share cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setGroceryShareStatus("copied"); setTimeout(()=>setGroceryShareStatus("idle"),2500);
    } catch(e){ setGroceryShareStatus("error"); setTimeout(()=>setGroceryShareStatus("idle"),2500); }
  };

  const setMealFb = async(key,rating)=>{
    const u={...mealFeedback};
    if(u[key]===rating) delete u[key]; else u[key]=rating;
    setMealFeedback(u); await persist("mealFeedback",u);
  };

  const generateGroceryList = ()=>{
    const INGREDIENTS = {
      "ground beef tacos":        { Produce:["Romaine lettuce, 1 head","Roma tomatoes, 3","Lime, 2"], Protein:["Ground beef, 1.5 lbs"], Dairy:["Shredded Mexican cheese, 8 oz","Sour cream, 8 oz"], Pantry:["Taco shells or flour tortillas, 1 pkg","Taco seasoning, 2 packets","Salsa, 1 jar"] },
      "sheet pan chicken fajitas":{ Produce:["Bell peppers, 3 mixed","Yellow onion, 2","Lime, 1"], Protein:["Chicken breast, 1.5 lbs"], Dairy:["Shredded cheese, 8 oz"], Pantry:["Flour tortillas, 1 pkg","Fajita seasoning, 1 packet"] },
      "spaghetti":                { Protein:["Ground beef, 1 lb","Eggs, 2"], Dairy:["Parmesan, 4 oz"], Pantry:["Spaghetti, 1 lb","Marinara sauce, 1 jar","Breadcrumbs, 1/2 cup","Italian seasoning"] },
      "chicken quesadillas":      { Produce:["Green onions, 1 bunch"], Protein:["Chicken breast, 1 lb"], Dairy:["Shredded Mexican cheese, 2 cups","Sour cream, 8 oz"], Pantry:["Large flour tortillas, 1 pkg","Salsa, 1 jar"] },
      "teriyaki salmon":          { Produce:["Broccoli, 1 head","Green onions, 1 bunch"], Protein:["Salmon fillets, 4"], Pantry:["Soy sauce","Brown sugar","Rice, 2 cups"] },
      "pizza":                    { Dairy:["Shredded mozzarella, 2 cups"], Pantry:["Pizza dough or pre-made crust","Pizza sauce, 1 jar"] },
      "mac":                      { Dairy:["Shredded cheddar, 2 cups","Cream cheese, 4 oz","Milk, 1 cup"], Pantry:["Elbow macaroni, 1 lb"] },
      "chicken nuggets":          { Protein:["Chicken breast, 1.5 lbs","Eggs, 2"], Pantry:["Panko breadcrumbs, 1 cup","Frozen fries, 1 bag","All-purpose flour, 1/2 cup"] },
      "pancakes":                 { Protein:["Eggs, 3"], Dairy:["Buttermilk or milk, 2 cups"], Pantry:["All-purpose flour, 2 cups","Baking powder","Maple syrup, 1 bottle"] },
      "fried rice":               { Produce:["Frozen peas and carrots, 1 bag","Green onions, 1 bunch"], Protein:["Chicken breast, 1 lb","Eggs, 3"], Pantry:["Long-grain white rice, 2 cups","Soy sauce","Sesame oil"] },
      "greek chicken":            { Produce:["English cucumber, 1","Cherry tomatoes, 1 pint","Kalamata olives, 1 can","Red onion, 1","Lemons, 2"], Protein:["Chicken breast, 1.5 lbs"], Dairy:["Feta cheese, 4 oz","Plain Greek yogurt, 8 oz"], Pantry:["Rice or pita, 1 pkg","Greek seasoning"] },
      "garlic butter salmon":     { Produce:["Asparagus or green beans, 1 bunch","Lemon, 2"], Protein:["Salmon fillets, 4"], Dairy:["Butter, 4 tbsp"] },
      "turkey taco":              { Produce:["Romaine lettuce, 1 head","Roma tomatoes, 3","Lime, 2","Avocado, 2"], Protein:["Ground turkey, 1.5 lbs"], Dairy:["Shredded cheese, 8 oz","Sour cream, 8 oz"], Pantry:["Taco seasoning, 1 packet","Brown rice, 2 cups","Black beans, 2 cans","Salsa, 1 jar"] },
      "lemon herb chicken":       { Produce:["Lemons, 3","Baby potatoes or asparagus, 1 lb"], Protein:["Chicken thighs or breast, 2 lbs"], Pantry:["Dijon mustard","Italian seasoning"] },
      "pot roast":                { Produce:["Carrots, 4","Yukon gold potatoes, 1.5 lbs","Yellow onion, 2","Celery, 3 stalks"], Protein:["Chuck roast, 3 lbs"], Pantry:["Beef broth, 2 cups","Tomato paste","Worcestershire sauce"] },
      "pulled pork":              { Produce:["Coleslaw mix, 1 bag","Red onion, 1","Lime, 2"], Protein:["Pork shoulder, 3 lbs"], Pantry:["BBQ sauce, 1 bottle","Brioche buns, 8","Brown sugar","Smoked paprika"] },
      "chicken tacos":            { Produce:["Lime, 2","Cilantro, 1 bunch","Avocado, 2"], Protein:["Chicken thighs, 2 lbs"], Dairy:["Shredded cheese, 8 oz","Sour cream, 8 oz"], Pantry:["Flour tortillas, 1 pkg","Taco seasoning, 1 packet","Salsa, 1 jar"] },
      "beef chili":               { Produce:["Yellow onion, 2","Bell pepper, 2"], Protein:["Ground beef, 2 lbs"], Dairy:["Shredded cheese, 8 oz","Sour cream, 8 oz"], Pantry:["Kidney beans, 2 cans","Diced tomatoes, 2 cans","Chili powder","Cumin","Beef broth, 1 cup"] },
    };
    // Merge in the shared recipe library so custom meals feed the list too
    const lookup={...INGREDIENTS};
    recipes.forEach(r=>{
      if(!r.ingredients||!r.ingredients.length) return;
      const cats={Produce:[],Protein:[],Dairy:[],Pantry:[],Other:[]};
      r.ingredients.forEach(ing=>{ cats[categorizeIngredient(ing)].push(ing); });
      lookup[normalizeMeal(r.name)]=cats;
    });
    const mealList=planningWeek.map(d=>(mealEdits[d.key]||"").trim()).filter(Boolean);
    if(!mealList.length) return;
    const combined={Produce:[],Protein:[],Dairy:[],Pantry:[],Other:[]};
    const unmatched=[];
    mealList.forEach(meal=>{
      const matchKey=matchRecipeKey(meal, Object.keys(lookup));
      if(matchKey){
        Object.entries(lookup[matchKey]).forEach(([cat,items])=>{
          const target=combined[cat]!==undefined?cat:"Other";
          items.forEach(item=>{ combined[target].push(item); });
        });
      } else { unmatched.push(meal); }
    });
    const result={};
    Object.entries(combined).forEach(([k,v])=>{
      if(!v.length) return;
      const groups={}; const order=[];
      v.forEach(item=>{
        const key=item.split(",")[0].trim().toLowerCase().replace(/s$/,"");
        if(!groups[key]){ groups[key]=[]; order.push(key); }
        groups[key].push(item);
      });
      result[k]=order.map(key=>combineItems(groups[key]));
    });
    if(unmatched.length>0) result["Add manually"]=unmatched.map(m=>m+" - add ingredients manually");
    setGroceryList(result); setGroceryChecked({});
    persist("groceryList",result); persist("groceryChecked",{});
  };

  const copyChecklistToClipboard = async()=>{
    const dateLabel = nextDateNight ? nextDateNight.label : "Date Night";
    const lines=["DATE NIGHT PREP - "+dateLabel,""];
    if(checklistNote) { lines.push("Plan: "+checklistNote,""); }
    CHECKLIST_SECTIONS.forEach(section=>{
      const hasContent=section.items.some(item=>checklistState[item.id]||checklistAnswers[item.id]);
      if(!hasContent) return;
      lines.push(section.title.toUpperCase());
      if(section.description) lines.push("("+section.description+")");
      section.items.forEach(item=>{
        const isDone=checklistState[item.id];
        const answer=checklistAnswers[item.id]||"";
        if(isDone||answer) lines.push((isDone?"[x] ":"[ ] ")+item.text+(answer?" -> "+answer:""));
      });
      lines.push("");
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("copied"); setTimeout(()=>setCopyStatus("idle"),2500);
    } catch(e){ setCopyStatus("error"); setTimeout(()=>setCopyStatus("idle"),2500); }
  };

  const ALL_TABS=[
    {id:"debrief",label:"Debrief",icon:Trophy},
    {id:"align",label:"This Week",icon:Calendar},
    {id:"plan",label:"Plan",icon:Utensils},
    {id:"home",label:"Home",icon:Home},
    {id:"connect",label:"Us",icon:Heart},
  ];
  // Calendar-only role sees just the "This Week" tab
  const TABS = isCalendarOnly ? ALL_TABS.filter(t=>t.id==="align") : ALL_TABS;

  // ── RENDER ───────────────────────────────────────────────────────────────
  if(syncStatus==="loading") return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50" style={{fontFamily:"ui-sans-serif,system-ui,sans-serif"}}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* HEADER */}
        <header className="mb-6">
          <div className="flex justify-between items-start mb-4 gap-3">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Kelly & Kevin</p>
              <h1 className="text-2xl font-bold text-slate-900 leading-none">State of the Union</h1>
              <p className="text-sm text-stone-500 mt-1">{today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className={"w-2 h-2 rounded-full "+(syncStatus==="saving"?"bg-amber-400 animate-pulse":"bg-emerald-400")}/>
                <span className="text-xs text-stone-400">{user.displayName?.split(" ")[0]||user.email}</span>
                <button onClick={onSignOut} className="p-1.5 text-stone-400 hover:text-slate-700 hover:bg-stone-100 rounded-lg transition-colors">
                  <LogOut className="w-3.5 h-3.5"/>
                </button>
              </div>
              {conflictDays.length>0&&!isCalendarOnly&&(
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/>
                  {conflictDays.length} incomplete day{conflictDays.length>1?"s":""}
                </div>
              )}
              {/* Calendar status */}
              {calLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <div className="w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin"/>
                  Loading calendar...
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-stone-400">
                  <Calendar className="w-3 h-3"/>
                  {calEvents.length} events
                </div>
              )}
            </div>
          </div>
          <div className="flex border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {TABS.map((t,i)=>{
              const Icon=t.icon; const active=tab===t.id; const visited=tabsVisited.has(t.id);
              return (
                <button key={t.id} onClick={()=>visitTab(t.id)}
                  className={"flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors "+(i>0?"border-l border-stone-200 ":"")+(active?"bg-slate-900 text-white":visited?"bg-stone-50 text-slate-700 hover:bg-stone-100":"bg-white text-stone-400 hover:bg-stone-50")}>
                  <div className="relative">
                    <Icon className="w-4 h-4"/>
                    {visited&&!active&&(
                      <span className="absolute -top-1.5 -right-2 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white"/>
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block">{t.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* DEBRIEF */}
        {tab==="debrief"&&(
          <div className="space-y-5">
            {streak.count>0&&(
              <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                <Flame className="w-5 h-5 text-amber-500 flex-shrink-0"/>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{streak.count} week{streak.count!==1?"s":""} in a row</p>
                  <p className="text-xs text-stone-400">Best streak: {streak.best}</p>
                </div>
              </div>
            )}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <SectionHeader icon={Trophy} title="Start with wins"/>
              <p className="text-xs text-stone-500 mb-3">One win each from last week. No logistics yet.</p>
              <div className="space-y-3">
                {[{key:"kelly",label:"Kelly",cls:"text-rose-600"},{key:"kevin",label:"Kevin",cls:"text-blue-600"}].map(p=>(
                  <div key={p.key}>
                    <label className={"text-xs font-bold uppercase tracking-widest "+p.cls}>{p.label}</label>
                    <textarea value={wins[p.key]||""} onChange={e=>{ const u={...wins,[p.key]:e.target.value}; setWins(u); persist("wins",u); }}
                      placeholder={p.label+"'s win from last week..."}
                      className="w-full mt-1.5 text-sm border border-stone-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                      style={{height:60}}/>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>visitTab("align")}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors">
              Open this week's calendar <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        )}

        {/* ALIGN */}
        {tab==="align"&&(
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Weekly logistics</p>
                <h2 className="text-xl font-bold text-slate-900">
                  {planningWeek[0].dateStr}–{planningWeek[6].dateStr}
                </h2>
                <p className="text-sm text-stone-500 mt-1">Coordinate the week at a glance.</p>
              </div>
              <span className="text-xs font-semibold text-stone-400 whitespace-nowrap">
                {logisticsSet}/5 weekdays set
              </span>
            </div>
            <div className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl p-2 shadow-sm">
              <button onClick={()=>setWeekOffset(v=>v-1)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-stone-500 rounded-xl hover:bg-stone-50 hover:text-slate-900">
                <ChevronLeft className="w-4 h-4"/> Previous
              </button>
              <button onClick={()=>setWeekOffset(0)}
                className={"px-3 py-2 text-xs font-bold rounded-xl "+(weekOffset===0?"bg-slate-900 text-white":"text-stone-500 hover:bg-stone-50")}>
                {weekOffset===0?"This week":"Today"}
              </button>
              <button onClick={()=>setWeekOffset(v=>v+1)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-stone-500 rounded-xl hover:bg-stone-50 hover:text-slate-900">
                Next <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
            {conflictDays.length>0&&(
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0"/>
                  <p className="text-sm font-bold text-amber-800">{conflictDays.length} coverage gap{conflictDays.length>1?"s":""} this week</p>
                </div>
                <div className="space-y-1.5">
                  {planningWeek.filter(day=>conflictDays.includes(day.key)).map(day=>(
                    <a key={day.key} href={"#day-"+day.key}
                      className="flex items-center gap-2 text-xs font-semibold text-amber-800 hover:text-amber-950">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"/>
                      <span className="w-8">{day.label}</span>
                      <span className="font-normal">Drop-off, after-care, or pick-up needs an assignment</span>
                      <ArrowRight className="w-3 h-3 ml-auto flex-shrink-0"/>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {/* LOGISTICS GRID — two-kid drop-off / pick-up coordination */}
            <div>
              <SectionHeader icon={Users} title={isCalendarOnly ? "Drop-off & pick-up schedule" : "Drop-offs & pick-ups"} count={isCalendarOnly ? undefined : logisticsSet+" of 5 weekdays set"}/>
              <div className="space-y-2">
                {planningWeek.map(day=>{
                  const events=eventsByDate[day.key]||[];
                  const isConflict=conflictDays.includes(day.key);
                  const dow=new Date(day.key+"T12:00:00").getDay();
                  const isWeekday = dow>=1 && dow<=5;
                  const dl=logistics[day.key];
                  const kTime = K_SCHEDULE[dow];

                  // Helper to render a toggle row (parent) or a read-only badge (calendar-only)
                  const renderToggle = (label, options, child, field, colorMap) => {
                    const current = dl?.[child]?.[field];
                    return (
                      <div className="flex items-center gap-2 flex-nowrap">
                        <span className="text-xs font-semibold text-stone-500 w-16 flex-shrink-0">{label}</span>
                        {isCalendarOnly ? (
                          current ? (
                            <span className={"text-xs px-2.5 py-0.5 rounded-full font-semibold border "+(colorMap[current]?.badge||"bg-stone-100 text-stone-600 border-stone-200")}>{current}</span>
                          ) : (
                            <span className="text-xs text-stone-300 italic">not set</span>
                          )
                        ) : (
                          <div className="flex flex-nowrap gap-1 overflow-x-auto">
                            {options.map(opt=>(
                              <button key={opt} onClick={()=>saveLogistics(day.key,child,field,opt)}
                                className={"text-[11px] px-2 py-1 rounded-full font-semibold border transition-colors whitespace-nowrap flex-shrink-0 "+(current===opt?(colorMap[opt]?.active||"bg-stone-400 text-white border-stone-400"):"border-stone-200 text-stone-400 hover:border-stone-400 bg-white")}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div id={"day-"+day.key} key={day.key} className={"scroll-mt-4 bg-white border rounded-2xl p-3.5 shadow-sm "+(isConflict?"border-amber-300":"border-stone-200")}>
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 w-8">{day.label}</span>
                        <span className="text-xs text-stone-400">{day.dateStr}</span>
                        {isConflict&&<span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">incomplete</span>}
                      </div>

                      {isWeekday && (
                        <div className="space-y-2.5">
                          {/* Lily — Kindergarten */}
                          <div className="bg-rose-50/50 rounded-xl p-2.5 space-y-1.5">
                            <p className="text-xs font-bold text-rose-700">Lily — Kindergarten <span className="font-medium text-stone-400">{kTime}</span></p>
                            {renderToggle("Drop-off", DROPOFF_OPTIONS, "lily", "dropoff", PERSON_COLOR)}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-stone-500 w-16 flex-shrink-0">After K</span>
                                {isCalendarOnly ? (
                                  dl?.lily?.afterCare ? (
                                    <span className={"text-xs px-2.5 py-0.5 rounded-full font-semibold border "+(AFTER_K_COLOR[dl.lily.afterCare]?.badge||"bg-stone-100 text-stone-600 border-stone-200")}>{dl.lily.afterCare}</span>
                                  ) : (
                                    <span className="text-xs text-stone-300 italic">not set</span>
                                  )
                                ) : (
                                <div className="flex flex-nowrap gap-1 overflow-x-auto">
                                    {AFTER_K_OPTIONS.map(opt=>(
                                      <button key={opt} onClick={()=>saveLogistics(day.key,"lily","afterCare",opt)}
                                      className={"text-[11px] px-2 py-1 rounded-full font-semibold border transition-colors whitespace-nowrap flex-shrink-0 "+(dl?.lily?.afterCare===opt?(AFTER_K_COLOR[opt]?.active||"bg-stone-400 text-white border-stone-400"):"border-stone-200 text-stone-400 hover:border-stone-400 bg-white")}>
                                      {AFTER_K_LABEL[opt]||opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Sub-options: who from "Us" or activity name from "Activity" */}
                              {dl?.lily?.afterCare==="Us"&&(
                                <div className="ml-16 mt-1">
                                  {renderToggle("Who", ["Kelly","Kevin"], "lily", "afterWho", PERSON_COLOR)}
                                </div>
                              )}
                              {dl?.lily?.afterCare==="Activity"&&!isCalendarOnly&&(
                                <input value={dl?.lily?.activityName||""} onChange={e=>setLogisticsField(day.key,"lily","activityName",e.target.value)} placeholder="Activity name (e.g. Soccer 4pm)"
                                  className="ml-16 mt-1 w-[calc(100%-4rem)] text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"/>
                              )}
                              {dl?.lily?.afterCare==="Activity"&&isCalendarOnly&&dl?.lily?.activityName&&(
                                <p className="ml-16 mt-1 text-xs text-stone-600">{dl.lily.activityName}</p>
                              )}
                            </div>
                          </div>
                          {/* Carter — Daycare */}
                          <div className="bg-blue-50/50 rounded-xl p-2.5 space-y-1.5">
                            <p className="text-xs font-bold text-blue-700">Carter — Daycare <span className="font-medium text-stone-400">{DAYCARE_HOURS}</span></p>
                            {renderToggle("Drop-off", DROPOFF_OPTIONS, "carter", "dropoff", PERSON_COLOR)}
                            {renderToggle("Pick-up", PICKUP_OPTIONS, "carter", "pickup", PERSON_COLOR)}
                          </div>
                        </div>
                      )}
                      {/* Calendar events — assign who is on point */}
                      {(() => {
                        const owners = dl?.eventOwners || {};
                        if(events.length === 0){
                          return isWeekday ? null : (
                            <p className="text-xs text-stone-300 italic">Nothing on the calendar</p>
                          );
                        }
                        return (
                          <div className={isWeekday ? "mt-2.5 pt-2.5 border-t border-stone-100 space-y-1.5" : "space-y-1.5"}>
                            {events.map(e=>{
                              const owner = owners[eventKeyOf(e.id)];
                              return (
                                <div key={e.id} className="flex items-center gap-2 flex-wrap text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0"/>
                                  <span className="text-stone-700 flex-1 min-w-[100px]">{e.title}{e.time&&e.time!=="All day"?" - "+e.time:""}</span>
                                  {isCalendarOnly ? (
                                    owner ? (
                                      <span className={"px-2 py-0.5 rounded-full font-semibold border "+(PERSON_COLOR[owner]?.badge||"bg-stone-100 text-stone-600 border-stone-200")}>{owner}</span>
                                    ) : (
                                      <span className="text-stone-300 italic">unassigned</span>
                                    )
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {ACTIVITY_OWNERS.map(opt=>(
                                        <button key={opt} onClick={()=>saveEventOwner(day.key,e.id,opt)}
                                          className={"px-2 py-0.5 rounded-full font-semibold border transition-colors "+(owner===opt?(PERSON_COLOR[opt]?.active||"bg-stone-400 text-white border-stone-400"):"border-stone-200 text-stone-400 hover:border-stone-400 bg-white")}>
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Add an event to the family calendar — parents only */}
            {!isCalendarOnly&&(
            <div>
              <button onClick={()=>setShowAddEvent(v=>!v)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-stone-200 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-stone-50 transition-colors shadow-sm">
                {showAddEvent?<X className="w-4 h-4"/>:<Plus className="w-4 h-4"/>}
                {showAddEvent?"Cancel":"Add to family calendar"}
              </button>
              {showAddEvent&&(
                <div className="mt-2 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <input value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))}
                    placeholder="Event title" className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400"/>
                  <div className="flex gap-2">
                    <input type="date" value={eventForm.date} onChange={e=>setEventForm(f=>({...f,date:e.target.value}))}
                      className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400"/>
                    <label className="flex items-center gap-1.5 text-xs text-stone-500 px-2 whitespace-nowrap">
                      <input type="checkbox" checked={eventForm.allDay} onChange={e=>setEventForm(f=>({...f,allDay:e.target.checked}))}/>
                      All day
                    </label>
                  </div>
                  {!eventForm.allDay&&(
                    <div className="flex items-center gap-2">
                      <input type="time" value={eventForm.startTime} onChange={e=>setEventForm(f=>({...f,startTime:e.target.value}))}
                        className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400"/>
                      <span className="text-xs text-stone-400">to</span>
                      <input type="time" value={eventForm.endTime} onChange={e=>setEventForm(f=>({...f,endTime:e.target.value}))}
                        className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400"/>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {["family","Kelly","Kevin"].map(opt=>(
                      <button key={opt} onClick={()=>setEventForm(f=>({...f,who:opt}))}
                        className={"flex-1 text-xs font-semibold py-1.5 rounded-full border transition-colors "+(eventForm.who===opt?"bg-slate-900 text-white border-slate-900":"border-stone-200 text-stone-400 hover:border-stone-400")}>
                        {opt==="family"?"Family":opt}
                      </button>
                    ))}
                  </div>
                  <textarea value={eventForm.notes} onChange={e=>setEventForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Notes (optional)" rows={2}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 resize-none"/>
                  {eventError&&<p className="text-xs text-rose-600">{eventError}</p>}
                  <button onClick={submitEvent} disabled={eventSaving||!eventForm.title.trim()||!eventForm.date}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors">
                    {eventSaving?"Adding...":<><Plus className="w-4 h-4"/>Add to calendar</>}
                  </button>
                </div>
              )}
            </div>
            )}
            {/* Upcoming events (beyond planning week) */}
            {upcomingEvents.length>0&&(
              <div>
                <button onClick={()=>setExpandedSections(p=>({...p,upcoming:!p.upcoming}))}
                  className="w-full flex items-center gap-2 mb-2 text-left">
                  <Calendar className="w-4 h-4 text-stone-400 flex-shrink-0"/>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex-1">Coming up (30 days)</h2>
                  <span className="text-xs text-stone-400">{upcomingEvents.length} events</span>
                  {expandedSections.upcoming?<ChevronDown className="w-4 h-4 text-stone-400"/>:<ChevronRight className="w-4 h-4 text-stone-400"/>}
                </button>
                {expandedSections.upcoming&&(
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm mb-4">
                    {upcomingEvents.map((e,i)=>(
                      <div key={e.id} className={"flex items-start gap-3 px-4 py-3 "+(i<upcomingEvents.length-1?"border-b border-stone-100":"")}>
                        <span className={"w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 "+(e.who==="Kelly"?"bg-rose-400":e.who==="Kevin"?"bg-blue-400":"bg-stone-300")}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{e.title}</p>
                          <p className="text-xs text-stone-400">{new Date(e.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}{e.time&&e.time!=="All day"?" · "+e.time:""}</p>
                        </div>
                        {e.who!=="family"&&<span className={"text-xs font-semibold "+(e.who==="Kelly"?"text-rose-600":"text-blue-600")}>{e.who}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isCalendarOnly && (
              <button onClick={()=>visitTab("plan")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors">
                Continue to meal planning <ArrowRight className="w-4 h-4"/>
              </button>
            )}
          </div>
        )}

        {/* PLAN */}
        {tab==="plan"&&(
          <div className="space-y-5">
            <div>
              <SectionHeader icon={ChefHat} title="Dinner plan"/>
              <p className="text-xs text-stone-500 mb-3 -mt-2">Tap a day to see suggestions.</p>
              <div className="space-y-2">
                {planningWeek.map(day=>(
                  <div key={day.key}>
                    <div onClick={()=>setSelectedMealDay(selectedMealDay===day.key?null:day.key)}
                      className={"bg-white border rounded-2xl p-3 cursor-pointer transition-all shadow-sm "+(selectedMealDay===day.key?"border-slate-900 shadow-md":"border-stone-200 hover:border-stone-400")}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 flex-shrink-0 text-center">
                          <p className="text-xs font-bold text-stone-500">{day.label}</p>
                          <p className="text-xs text-stone-400">{day.dateStr}</p>
                        </div>
                        <textarea value={mealEdits[day.key]||""} onChange={e=>{e.stopPropagation();const u={...mealEdits,[day.key]:e.target.value};setMealEdits(u);autoSaveMeals(u);}}
                          onClick={e=>e.stopPropagation()}
                          placeholder="What's for dinner?"
                          className="flex-1 text-sm border border-stone-200 rounded-xl px-2.5 py-1.5 resize-none focus:outline-none focus:border-stone-400 text-slate-900 bg-white"
                          style={{height:36}}/>
                        <div className="flex gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>rateMeal(mealEdits[day.key],"liked")}
                            className={"p-1.5 rounded-lg border transition-colors "+(mealRatings[normalizeMeal(mealEdits[day.key])]==="liked"?"bg-emerald-50 border-emerald-300 text-emerald-600":"border-stone-200 text-stone-300 hover:text-emerald-500")}>
                            <ThumbsUp className="w-3.5 h-3.5"/>
                          </button>
                          <button onClick={()=>rateMeal(mealEdits[day.key],"disliked")}
                            className={"p-1.5 rounded-lg border transition-colors "+(mealRatings[normalizeMeal(mealEdits[day.key])]==="disliked"?"bg-rose-50 border-rose-300 text-rose-600":"border-stone-200 text-stone-300 hover:text-rose-500")}>
                            <ThumbsDown className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                    </div>
                    {selectedMealDay===day.key&&(
                      <div className="mt-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900">
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            <ChefHat className="w-3.5 h-3.5 text-amber-400"/> {day.label} {day.dateStr}
                          </p>
                          <button onClick={()=>setSelectedMealDay(null)}><X className="w-4 h-4 text-stone-400 hover:text-white"/></button>
                        </div>
                        <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
                          <div className="px-4 py-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-amber-500"/>AI ideas</p>
                              <button onClick={fetchSuggestions} disabled={aiLoading}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 flex items-center gap-1">
                                {aiLoading?<div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"/>:<RotateCcw className="w-3 h-3"/>}
                                {aiSuggestions.length?"Refresh":"Suggest"}
                              </button>
                            </div>
                            {aiError&&<p className="text-xs text-rose-600 mb-1">{aiError}</p>}
                            {aiSuggestions.map((s,i)=>(
                              <div key={"ai"+i}>
                                <div className="flex items-center gap-2 py-1.5 rounded-xl hover:bg-stone-50 px-2 cursor-pointer"
                                  onClick={()=>useAiSuggestion(day.key,s)}>
                                  <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0"/>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                                    {s.note&&<p className="text-xs text-stone-400 truncate">{s.note}</p>}
                                  </div>
                                  {s.time&&<span className="text-xs text-stone-400 flex-shrink-0">{s.time}</span>}
                                  {((s.steps&&s.steps.length)||(s.ingredients&&s.ingredients.length))&&(
                                    <button onClick={e=>{e.stopPropagation();setOpenRecipe(openRecipe==="ai"+i?null:"ai"+i);}}
                                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex-shrink-0 px-1">
                                      {openRecipe==="ai"+i?"Hide":"Recipe"}
                                    </button>
                                  )}
                                </div>
                                {openRecipe==="ai"+i&&(
                                  <div className="ml-6 mr-2 mb-2 mt-0.5 rounded-xl bg-amber-50 border border-amber-100 p-3 text-left">
                                    {s.ingredients&&s.ingredients.length>0&&(<>
                                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">Ingredients</p>
                                      <ul className="text-xs text-stone-600 space-y-0.5 mb-2 list-disc pl-4">
                                        {s.ingredients.map((ing,j)=><li key={"ing"+j}>{ing}</li>)}
                                      </ul>
                                    </>)}
                                    {s.steps&&s.steps.length>0&&(<>
                                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">Steps</p>
                                      <ol className="text-xs text-stone-600 space-y-1 list-decimal pl-4">
                                        {s.steps.map((st,j)=><li key={"st"+j}>{st}</li>)}
                                      </ol>
                                    </>)}
                                  </div>
                                )}
                              </div>
                            ))}
                            {!aiSuggestions.length&&!aiLoading&&!aiError&&<p className="text-xs text-stone-400">Tap Suggest for ideas based on what you like.</p>}
                          </div>
                          {recipes.length>0&&(
                            <div className="px-4 py-2.5">
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1.5">Your recipes</p>
                              {recipes.map(r=>(
                                <div key={r.id}>
                                  <div className="flex items-center gap-2 py-1.5 rounded-xl hover:bg-stone-50 px-2 cursor-pointer"
                                    onClick={()=>{const u={...mealEdits,[day.key]:r.name};setMealEdits(u);autoSaveMeals(u);setSelectedMealDay(null);}}>
                                    {mealRatings[normalizeMeal(r.name)]==="liked"&&<Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0"/>}
                                    <span className="flex-1 text-sm font-semibold text-slate-800">{r.name}</span>
                                    {r.time&&<span className="text-xs text-stone-400">{r.time}</span>}
                                    {((r.steps&&r.steps.length)||(r.ingredients&&r.ingredients.length))&&(
                                      <button onClick={e=>{e.stopPropagation();setOpenRecipe(openRecipe===r.id?null:r.id);}}
                                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex-shrink-0 px-1">
                                        {openRecipe===r.id?"Hide":"Recipe"}
                                      </button>
                                    )}
                                    {r.url&&<a href={r.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                                      className="p-1 text-stone-400 hover:text-blue-600 rounded-lg transition-colors">
                                      <ExternalLink className="w-3 h-3"/>
                                    </a>}
                                    <button onClick={e=>{e.stopPropagation();removeRecipe(r.id);}}
                                      className="p-1 text-stone-300 hover:text-rose-500 rounded-lg transition-colors">
                                      <X className="w-3 h-3"/>
                                    </button>
                                  </div>
                                  {openRecipe===r.id&&(
                                    <div className="ml-6 mr-2 mb-2 mt-0.5 rounded-xl bg-amber-50 border border-amber-100 p-3 text-left">
                                      {r.ingredients&&r.ingredients.length>0&&(<>
                                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">Ingredients</p>
                                        <ul className="text-xs text-stone-600 space-y-0.5 mb-2 list-disc pl-4">
                                          {r.ingredients.map((ing,j)=><li key={"ring"+j}>{ing}</li>)}
                                        </ul>
                                      </>)}
                                      {r.steps&&r.steps.length>0&&(<>
                                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">Steps</p>
                                        <ol className="text-xs text-stone-600 space-y-1 list-decimal pl-4">
                                          {r.steps.map((st,j)=><li key={"rst"+j}>{st}</li>)}
                                        </ol>
                                      </>)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={saveMeals} disabled={saveStatus==="saved"||saveStatus==="autosaved"}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white transition-colors"
                style={{background:saveStatus==="saved"||saveStatus==="autosaved"?"#059669":"#1e293b"}}>
                {saveStatus==="saved"||saveStatus==="autosaved"?<><Check className="w-4 h-4"/>Saved</>:<><Save className="w-4 h-4"/>Save plan</>}
              </button>
              <div className="mt-3">
                <button onClick={()=>setShowAddRecipe(v=>!v)}
                  className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-slate-900 transition-colors">
                  <Plus className="w-3.5 h-3.5"/>Add a meal to your recipes
                </button>
                {showAddRecipe&&(
                  <div className="mt-2 bg-white border border-stone-200 rounded-2xl p-3.5 shadow-sm space-y-2">
                    <input value={recipeForm.name} onChange={e=>setRecipeForm(f=>({...f,name:e.target.value}))}
                      placeholder="Meal name (e.g. Grandma's lasagna)"
                      className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 text-slate-900 bg-white"/>
                    <div className="flex gap-2">
                      <input value={recipeForm.url} onChange={e=>setRecipeForm(f=>({...f,url:e.target.value}))}
                        placeholder="Recipe link (optional)"
                        className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 text-slate-900 bg-white"/>
                      <input value={recipeForm.time} onChange={e=>setRecipeForm(f=>({...f,time:e.target.value}))}
                        placeholder="Time"
                        className="w-20 text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 text-slate-900 bg-white"/>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={()=>importRecipe({url:recipeForm.url})} disabled={importing||!recipeForm.url.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        {importing?<div className="w-3.5 h-3.5 border border-blue-600 border-t-transparent rounded-full animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}
                        Import from link
                      </button>
                      <button onClick={()=>setShowImportText(v=>!v)} className="text-xs font-semibold text-stone-500 hover:text-slate-900">
                        {showImportText?"hide paste box":"or paste text"}
                      </button>
                    </div>
                    {showImportText&&(
                      <div className="space-y-2">
                        <textarea value={importText} onChange={e=>setImportText(e.target.value)}
                          placeholder="Paste the full recipe text here, then Extract..."
                          className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                          style={{height:80}}/>
                        <button onClick={()=>importRecipe({text:importText})} disabled={importing||!importText.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          {importing?<div className="w-3.5 h-3.5 border border-blue-600 border-t-transparent rounded-full animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}
                          Extract from text
                        </button>
                      </div>
                    )}
                    {importError&&<p className="text-xs text-rose-600">{importError}</p>}
                    <textarea value={recipeForm.ingredients} onChange={e=>setRecipeForm(f=>({...f,ingredients:e.target.value}))}
                      placeholder="Ingredients, one per line (feeds the grocery list)"
                      className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                      style={{height:90}}/>
                    <div className="flex justify-end gap-2">
                      <button onClick={()=>{setShowAddRecipe(false);setRecipeForm({name:"",url:"",time:"",ingredients:""});}}
                        className="px-3 py-1.5 text-xs font-bold text-stone-500 hover:text-slate-900">Cancel</button>
                      <button onClick={addRecipe} disabled={!recipeForm.name.trim()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <Plus className="w-3.5 h-3.5"/>Save recipe
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <SectionHeader icon={ShoppingCart} title="Grocery list"/>
              {mealsPlanned===0?(
                <div className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl p-4 text-center">
                  <p className="text-sm text-stone-500">Add your dinner plan above first.</p>
                </div>
              ):(
                <>
                  {Object.keys(groceryList).length===0&&(
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-3">
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Will generate from</p>
                      {planningWeek.filter(d=>(mealEdits[d.key]||"").trim()).map(d=>(
                        <p key={d.key} className="text-xs text-stone-600"><span className="font-semibold">{d.label}:</span> {mealEdits[d.key]}</p>
                      ))}
                    </div>
                  )}
                  <button onClick={generateGroceryList}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors mb-3">
                    <ShoppingCart className="w-4 h-4"/>{Object.keys(groceryList).length>0?"Regenerate list":"Generate grocery list"}
                  </button>
                  {Object.keys(groceryList).length>0&&(
                    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all" style={{width:groceryPct+"%"}}/>
                        </div>
                        <span className="text-xs text-stone-400 whitespace-nowrap">{groceryCheckedCount}/{groceryAllItems.length}</span>
                        <button onClick={()=>{setGroceryList({});setGroceryChecked({});persist("groceryList",{});persist("groceryChecked",{});}}
                          className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors">
                          <X className="w-3 h-3"/>Clear
                        </button>
                      </div>
                      {Object.entries(groceryList).map(([category,items])=>(
                        <div key={category} className="border-b border-stone-100 last:border-0">
                          <p className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-widest bg-stone-50">{category}</p>
                          {items.map((item,i)=>{
                            const gk=category+"-"+i;
                            const isChecked=!!groceryChecked[gk];
                            return (
                              <label key={gk} htmlFor={"gr-"+gk}
                                className={"flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-stone-50 border-b border-stone-50 last:border-0 "+(isChecked?"opacity-40":"")}>
                                <input id={"gr-"+gk} type="checkbox" checked={isChecked}
                                  onChange={()=>{const u={...groceryChecked,[gk]:!isChecked};setGroceryChecked(u);persist("groceryChecked",u);}}
                                  className="w-4 h-4 accent-emerald-500 flex-shrink-0"/>
                                <span className={"text-sm text-slate-800 "+(isChecked?"line-through":"")}>{item}</span>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                  {Object.keys(groceryList).length>0&&(
                    <div className="mt-3">
                      <button onClick={shareGroceryList}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                        {groceryShareStatus==="copied"?<><Check className="w-4 h-4"/>Copied!</>:<><Copy className="w-4 h-4"/>Copy / share list</>}
                      </button>
                      {groceryShareStatus==="error"&&<p className="text-xs text-rose-600 mt-1.5">Couldn't copy. Try again.</p>}
                      <p className="text-xs text-stone-400 mt-1.5">One item per line, ready to paste into AnyList (then order from King Soopers, Safeway, or Amazon Fresh) or any grocery app.</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <button onClick={()=>visitTab("home")}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors">
              Next: Home <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        )}

        {/* HOME */}
        {tab==="home"&&(
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-stone-400"/>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{MONTHS[monthIdx]} maintenance</h2>
                </div>
                <span className="text-sm font-bold text-slate-900">{housePct}% <span className="text-xs text-stone-400 font-normal">{houseDoneCount}/{maintenanceTasks.length}</span></span>
              </div>
              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-emerald-500 transition-all" style={{width:housePct+"%"}}/>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                {maintenanceTasks.map((t,i)=>{
                  const isDone=!!houseDone[t.id];
                  const Icon=HOUSE_ICONS[t.cat]||Wrench;
                  return (
                    <label key={t.id} htmlFor={"ht-"+t.id}
                      className={"flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors "+(i<maintenanceTasks.length-1?"border-b border-stone-100 ":"")+(isDone?"opacity-40":"")}>
                      <input id={"ht-"+t.id} type="checkbox" checked={isDone} onChange={()=>toggleHouseTask(t.id)} className="w-4 h-4 flex-shrink-0"/>
                      <Icon className={"w-4 h-4 flex-shrink-0 "+PRIORITY_COLOR[t.p]}/>
                      <p className={"text-sm text-slate-900 flex-1 "+(isDone?"line-through":"")}>{t.task}</p>
                      <span className="text-xs text-stone-400">{t.cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <button onClick={()=>visitTab("connect")}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors">
              Next: Connect <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        )}

        {/* CONNECT */}
        {tab==="connect"&&(
          <div className="space-y-5">
            {nextDateNight ? (
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <Heart className="w-6 h-6 text-rose-500 flex-shrink-0"/>
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Next date night</p>
                  <p className="text-lg font-bold text-slate-900">{nextDateNight.label}</p>
                  {nextDateNight.title && <p className="text-xs text-stone-500 mt-0.5">{nextDateNight.title}</p>}
                </div>
                {(()=>{
                  const d=Math.round((nextDateNight.date-new Date())/(1000*60*60*24));
                  return <span className={"text-sm font-bold px-3 py-1.5 rounded-full border flex-shrink-0 "+(d<=7?"bg-rose-500 text-white border-rose-500":d<=14?"bg-amber-100 text-amber-700 border-amber-200":"bg-rose-100 text-rose-700 border-rose-200")}>{d<=0?"Today!":d===1?"Tomorrow":d+"d away"}</span>;
                })()}
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <Heart className="w-5 h-5 text-stone-400 flex-shrink-0"/>
                <div className="flex-1">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Next date night</p>
                  <p className="text-sm text-stone-400">No upcoming date nights found — add one to your family calendar with "date night" in the title</p>
                </div>

              </div>
            )}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <SectionHeader icon={MessageSquare} title="Connection questions"/>
              <p className="text-xs text-stone-500 mb-3 -mt-2">Take turns. No fixing, no advising - just listen.</p>
              <div className="space-y-3">
                {[{key:"kelly",q:connectionQ.kelly,lCls:"text-rose-600",bg:"bg-rose-50 border-rose-100"},{key:"kevin",q:connectionQ.kevin,lCls:"text-blue-600",bg:"bg-blue-50 border-blue-100"}].map(p=>(
                  <div key={p.key} className={"border rounded-xl p-3.5 "+p.bg}>
                    <p className={"text-xs font-bold uppercase tracking-widest mb-1.5 "+p.lCls}>{p.key==="kelly"?"Kelly":"Kevin"} answers</p>
                    <p className="text-sm font-semibold text-slate-900 italic leading-snug">{p.q}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <SectionHeader icon={Star} title="One appreciation each"/>
              <p className="text-xs text-stone-500 mb-3 -mt-2">Something specific. Say it out loud.</p>
              <div className="space-y-3">
                {[{key:"kelly",ph:"Kelly appreciates Kevin for...",cls:"text-rose-600"},{key:"kevin",ph:"Kevin appreciates Kelly for...",cls:"text-blue-600"}].map(p=>(
                  <div key={p.key}>
                    <label className={"text-xs font-bold uppercase tracking-widest "+p.cls}>{p.key==="kelly"?"Kelly":"Kevin"}</label>
                    <textarea value={appreciation[p.key]||""} onChange={e=>{ const u={...appreciation,[p.key]:e.target.value}; setAppreciation(u); persist("appreciation",u); }}
                      placeholder={p.ph}
                      className="w-full mt-1.5 text-sm border border-stone-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                      style={{height:56}}/>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
              <SectionHeader icon={Heart} title="Date night status"/>
              <div className="flex gap-2 mb-3">
                <button onClick={()=>{ setDatePlanned(true); persist("datePlanned",true); }}
                  className={"flex-1 py-2.5 text-sm font-bold rounded-xl border transition-colors "+(datePlanned?"bg-rose-500 text-white border-rose-500":"border-stone-200 text-stone-500 hover:border-rose-200 hover:text-rose-600")}>
                  Planned
                </button>
                <button onClick={()=>{ setDatePlanned(false); persist("datePlanned",false); }}
                  className={"flex-1 py-2.5 text-sm font-bold rounded-xl border transition-colors "+(!datePlanned?"bg-slate-200 text-slate-700 border-slate-200":"border-stone-200 text-stone-400")}>
                  Not yet
                </button>
              </div>
              {!datePlanned&&(
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-800">Decide before you close this meeting.</p>
                </div>
              )}
            </div>

            {/* Date prep checklist */}
            <div>
              <button onClick={()=>setExpandedSections(p=>({...p,dateprep:!p.dateprep}))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors shadow-sm text-left">
                <ClipboardCheck className="w-4 h-4 text-stone-400"/>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest flex-1">Date night prep checklist</span>
                <span className="text-xs text-stone-400">{checkedCount}/{totalCheckItems}</span>
                {expandedSections.dateprep?<ChevronDown className="w-4 h-4 text-stone-400"/>:<ChevronRight className="w-4 h-4 text-stone-400"/>}
              </button>
              {expandedSections.dateprep&&(
                <div className="mt-1.5 bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap">
                    <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden min-w-12">
                      <div className="h-full bg-rose-400 transition-all" style={{width:checklistPct+"%"}}/>
                    </div>
                    <span className="text-xs text-stone-500 whitespace-nowrap">{checkedCount}/{totalCheckItems}</span>
                    {/* Copy to clipboard - placeholder for future Google Calendar API */}
                    <button onClick={copyChecklistToClipboard}
                      disabled={checkedCount===0&&Object.values(checklistAnswers).filter(Boolean).length===0}
                      className={"flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-colors "+(copyStatus==="copied"?"bg-emerald-500 text-white border-emerald-500":copyStatus==="error"?"bg-rose-50 text-rose-600 border-rose-200":"border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50")}>
                      {copyStatus==="copied"?<><Check className="w-3 h-3"/>Copied!</>:copyStatus==="error"?<>Copy failed</>:<><Copy className="w-3 h-3"/>Copy for calendar</>}
                    </button>
                    <button onClick={resetChecklist} className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors">
                      <RotateCcw className="w-3 h-3"/>Reset
                    </button>
                  </div>
                  {copyStatus==="copied"&&(
                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                      <p className="text-xs text-emerald-700 font-semibold">Copied. Paste into your {nextDateNight ? nextDateNight.label : "date night"} calendar event description.</p>
                    </div>
                  )}
                  <div className="px-4 py-3 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-500 mb-1.5">What is the plan{nextDateNight ? " for "+nextDateNight.label : ""}?</p>
                    <textarea value={checklistNote||""} onChange={e=>{ setChecklistNote(e.target.value); persist("checklistNote",e.target.value); }}
                      placeholder="e.g. Dinner at Guard & Grace, 7pm..."
                      className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-rose-300 text-slate-900 bg-white"
                      style={{height:52}}/>
                  </div>
                  {CHECKLIST_SECTIONS.map(section=>{
                    const sectionDone=section.items.filter(it=>checklistState[it.id]).length;
                    const allDone=sectionDone===section.items.length;
                    const hasAnswers=section.items.some(it=>checklistAnswers[it.id]);
                    return (
                      <div key={section.id} className="border-b border-stone-100 last:border-0">
                        <button onClick={()=>setExpandedSections(p=>({...p,[section.id]:!p[section.id]}))}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left">
                          <div className={"w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 "+(allDone?"bg-emerald-500":hasAnswers?"bg-rose-200":"bg-stone-200")}>
                            {allDone?<Check className="w-3 h-3 text-white"/>:<span className="text-xs font-bold text-stone-500">{sectionDone}</span>}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 flex-1">{section.title}</span>
                          <span className="text-xs text-stone-400">{sectionDone}/{section.items.length}</span>
                          {expandedSections[section.id]?<ChevronDown className="w-3.5 h-3.5 text-stone-400"/>:<ChevronRight className="w-3.5 h-3.5 text-stone-400"/>}
                        </button>
                        {expandedSections[section.id]&&(
                          <div>
                            {section.description&&<p className="px-4 pb-1 text-xs text-stone-400 italic">{section.description}</p>}
                            {section.items.map(item=>(
                              <div key={item.id} className={"border-b border-stone-50 last:border-0 "+(checklistState[item.id]?"bg-stone-50":"")}>
                                <label htmlFor={"cl-"+item.id} className="flex items-start gap-3 px-4 pt-2 pb-1 cursor-pointer hover:bg-stone-50">
                                  <input id={"cl-"+item.id} type="checkbox" checked={!!checklistState[item.id]} onChange={()=>toggleCheck(item.id)}
                                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"/>
                                  <span className={"text-sm text-slate-800 "+(checklistState[item.id]?"line-through text-stone-400":"")}>{item.text}</span>
                                </label>
                                <div className="px-4 pb-2.5 pl-11">
                                  <input type="text" value={checklistAnswers[item.id]||""}
                                    onChange={e=>{ const u={...checklistAnswers,[item.id]:e.target.value}; setChecklistAnswers(u); persist("checklistAnswers",u); }}
                                    placeholder="Enter answer..."
                                    className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-300 text-slate-700 bg-stone-50 placeholder-stone-300"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Wrap-up */}
            {allTabsVisited&&(
              <div className="bg-slate-900 text-white rounded-2xl p-5">
                <div className="text-center mb-4">
                  <CheckCircle className="w-9 h-9 text-emerald-400 mx-auto mb-2"/>
                  <h3 className="text-base font-bold">Meeting complete</h3>
                </div>
                <div className="bg-white/10 rounded-xl p-3.5 mb-4 space-y-2">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">This meeting</p>
                  <p className="text-sm text-stone-200">{mealsPlanned} of 7 dinners planned</p>
                  {Object.keys(groceryList).length>0&&<p className="text-sm text-stone-200">Grocery list ready ({groceryAllItems.length} items)</p>}
                  <p className="text-sm text-stone-200">{logisticsSet} of 5 weekdays with drop-off / pick-up set</p>
                  {nextDateNight&&(()=>{ const d=Math.round((nextDateNight.date-new Date())/(1000*60*60*24)); return <p className="text-sm text-stone-200">Next date: {nextDateNight.label} ({d<=0?"today":d===1?"tomorrow":d+"d away"})</p>; })()}
                  {streak.count>0&&<p className="text-sm text-stone-200 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-amber-400"/>{streak.count} week streak{streak.best>streak.count?" · best "+streak.best:""}</p>}
                  {conflictDays.length>0&&<p className="text-sm text-amber-300">{conflictDays.length} weekday{conflictDays.length>1?"s":""} with incomplete assignments remaining</p>}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
