const MODEL = 'gemini-3.8-flash';
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const KEY_STORAGE = 'poorvi_gemini_key';
const RESULT_STORAGE = 'poorvi_last_result';
const HISTORY_STORAGE = 'poorvi_history_v1';
const CHECK_STORAGE = 'poorvi_checks_v1';

const $ = id => document.getElementById(id);
const state = { files: [], lastResult: null, recognition: null };

const els = {
  fileInput:$('fileInput'), fileList:$('fileList'), textInput:$('textInput'), analyzeBtn:$('analyzeBtn'), status:$('status'),
  resultSection:$('resultSection'), urgentList:$('urgentList'), todayList:$('todayList'), homeworkList:$('homeworkList'),
  examList:$('examList'), bringList:$('bringList'), dateList:$('dateList'), unclearList:$('unclearList'),
  speakBtn:$('speakBtn'), copyBtn:$('copyBtn'), shareBtn:$('shareBtn'), clearBtn:$('clearBtn'), voiceBtn:$('voiceBtn'), voiceStatus:$('voiceStatus'),
  settingsBtn:$('settingsBtn'), settingsModal:$('settingsModal'), closeSettings:$('closeSettings'), apiKey:$('apiKey'), saveSettings:$('saveSettings'), clearKey:$('clearKey'),
  getKeyLink:$('getKeyLink'), pasteBtn:$('pasteBtn'), historyList:$('historyList'), toast:$('toast')
};

els.getKeyLink.href = 'https://aistudio.google.com/apikey';

function toast(msg){ els.toast.textContent=msg; els.toast.hidden=false; setTimeout(()=>els.toast.hidden=true,2400); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function items(v){ return Array.isArray(v)?v.filter(Boolean):[]; }
function renderList(el, arr){ const a=items(arr); el.innerHTML=a.length?a.map(x=>`<div>${esc(x)}</div>`).join(''):'<div class="empty-text">Kuch nahi mila.</div>'; }
function now(){ return new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); }

function openSettings(){ els.apiKey.value=localStorage.getItem(KEY_STORAGE)||''; els.settingsModal.style.display='flex'; els.settingsModal.hidden=false; }
function closeSettings(){ els.settingsModal.hidden=true; els.settingsModal.style.display='none'; }
els.settingsBtn.onclick=openSettings; els.closeSettings.onclick=closeSettings; els.settingsModal.addEventListener('click',e=>{if(e.target===els.settingsModal)closeSettings()});
els.saveSettings.onclick=()=>{ const key=els.apiKey.value.trim(); if(!key){toast('API key daalo');return;} localStorage.setItem(KEY_STORAGE,key); closeSettings(); toast('Key save ho gayi'); };
els.clearKey.onclick=()=>{localStorage.removeItem(KEY_STORAGE);els.apiKey.value='';toast('API key hata di');};

els.fileInput.onchange=e=>{ state.files=[...e.target.files]; renderFiles(); };
function renderFiles(){ els.fileList.className=state.files.length?'file-list':'file-list empty'; els.fileList.innerHTML=state.files.length?state.files.map(f=>`<span class="file-pill">${f.type.startsWith('image/')?'📷':f.type==='application/pdf'?'📄':'💬'} ${esc(f.name)}</span>`).join(''):'Abhi koi file select nahi ki'; }

els.pasteBtn.onclick=async()=>{ try{ const t=await navigator.clipboard.readText(); els.textInput.value += (els.textInput.value?'\n\n':'')+t; toast('Clipboard ka message paste ho gaya'); }catch{els.textInput.focus();toast('Text box mein long-press karke Paste karo');} };

function setupVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Is browser mein voice input available nahi hai');return;}
  if(state.recognition){state.recognition.stop();return;}
  const r=new SR(); state.recognition=r; r.lang='hi-IN'; r.interimResults=true; r.continuous=false;
  els.voiceStatus.hidden=false; els.voiceStatus.textContent='🎙️ Sun raha hoon... boliye'; els.voiceBtn.textContent='⏹️ Stop';
  let final='';
  r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const x=e.results[i][0].transcript;x&& (e.results[i].isFinal?final+=x+' ':interim+=x);}els.voiceStatus.textContent='🎙️ '+(final||interim)};
  r.onerror=()=>{els.voiceStatus.textContent='Voice input mein problem hui';cleanupVoice()};
  r.onend=()=>{if(final.trim())els.textInput.value += (els.textInput.value?'\n\n':'')+final.trim();cleanupVoice();};
  r.start();
}
function cleanupVoice(){state.recognition=null;els.voiceBtn.textContent='🎙️ Bolkar bhejo';setTimeout(()=>els.voiceStatus.hidden=true,1200)}
els.voiceBtn.onclick=setupVoice;

function toBase64(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result.split(',')[1]);fr.onerror=rej;fr.readAsDataURL(file);});}
function readText(file){return file.text();}

const SYSTEM = `You are Poorvi School Assistant for an 8-year-old student in Delhi, India. The parent/guardian may understand Hindi better than English. Read all supplied school WhatsApp messages, diary photos, screenshots, PDFs and copied text carefully. Never invent homework, dates, fees, teacher names, or deadlines. If a detail is unclear, put it in unclear instead of guessing. Convert English school instructions into simple Hindi in Devanagari, keeping necessary subject/book names in English in parentheses. Separate urgent items from normal homework. Focus on what the parent must do and what Poorvi must do. Return ONLY valid JSON with exactly these keys: summary, urgent, today, homework, exams, bring_or_submit, dates, unclear. Each array must contain short actionable strings. summary is 1-3 short Hindi sentences. For today, include tasks that appear due today or that the parent should do today to prepare. Dates should include the exact date if present in source. If nothing exists for a category, return [].`;

async function analyze(){
  const key=localStorage.getItem(KEY_STORAGE)?.trim();
  if(!key){openSettings();els.status.textContent='Pehle Settings mein Free Gemini API key save karo.';return;}
  if(!state.files.length && !els.textInput.value.trim()){toast('Pehle photo, PDF ya message bhejo');return;}
  els.analyzeBtn.disabled=true;els.analyzeBtn.textContent='⏳ Samajh raha hoon...';els.status.textContent='School material read kiya ja raha hai...';
  try{
    const parts=[{text:SYSTEM+'\n\nAnalyze this school material and produce the JSON.'}];
    if(els.textInput.value.trim()) parts.push({text:'COPY/PASTED MESSAGES:\n'+els.textInput.value.trim()});
    for(const f of state.files){
      if(f.type==='text/plain' || f.name.toLowerCase().endsWith('.txt')){
        const t=await readText(f); parts.push({text:`FILE ${f.name}:\n${t}`});
      } else {
        const b64=await toBase64(f); parts.push({inline_data:{mime_type:f.type||'application/octet-stream',data:b64}});
        parts.push({text:`The previous attachment is file ${f.name}. Read it carefully.`});
      }
    }
    const body={contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',temperature:0.1}};
    const resp=await fetch(API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
    const data=await resp.json();
    if(!resp.ok) throw new Error(data?.error?.message||`API error ${resp.status}`);
    const raw=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
    const result=parseJSON(raw); state.lastResult=result; saveLast(result); renderResult(result); addHistory(result);
    els.status.textContent='✅ Summary ready';toast('Poorvi ka school work samajh liya');
  }catch(err){console.error(err);els.status.textContent='Error: '+err.message;toast('Analysis nahi ho paya');}
  finally{els.analyzeBtn.disabled=false;els.analyzeBtn.textContent='✨ Samjho & Summary banao';}
}
function parseJSON(raw){
  const cleaned=raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```$/,'').trim();
  try{return JSON.parse(cleaned)}catch{const m=cleaned.match(/\{[\s\S]*\}/);if(m)return JSON.parse(m[0]);throw new Error('AI response readable JSON mein nahi mila');}
}
function saveLast(r){localStorage.setItem(RESULT_STORAGE,JSON.stringify(r));}
function loadLast(){try{const r=JSON.parse(localStorage.getItem(RESULT_STORAGE)||'null');if(r){state.lastResult=r;renderResult(r)}}catch{}}
function renderResult(r){
  els.resultSection.hidden=false;
  renderList(els.urgentList,r.urgent); renderList(els.homeworkList,r.homework); renderList(els.examList,r.exams); renderList(els.bringList,r.bring_or_submit); renderList(els.dateList,r.dates); renderList(els.unclearList,r.unclear);
  const checks=JSON.parse(localStorage.getItem(CHECK_STORAGE)||'{}'); const ts=items(r.today);
  els.todayList.innerHTML=ts.length?ts.map((x,i)=>{const id='t_'+hash(x);const done=!!checks[id];return `<label class="check-item"><input type="checkbox" data-check="${id}" ${done?'checked':''}><span>${esc(x)}</span></label>`}).join(''):'<div class="empty-text">Aaj ke liye koi specific task nahi mila.</div>';
  els.todayList.querySelectorAll('input[data-check]').forEach(cb=>cb.onchange=()=>{const c=JSON.parse(localStorage.getItem(CHECK_STORAGE)||'{}');c[cb.dataset.check]=cb.checked;localStorage.setItem(CHECK_STORAGE,JSON.stringify(c));});
}
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=(h<<5)-h+s.charCodeAt(i)|0;return Math.abs(h).toString(36)}
function addHistory(r){const h=JSON.parse(localStorage.getItem(HISTORY_STORAGE)||'[]');h.unshift({at:Date.now(),summary:r.summary||'School summary',result:r});localStorage.setItem(HISTORY_STORAGE,JSON.stringify(h.slice(0,12)));renderHistory();}
function renderHistory(){const h=JSON.parse(localStorage.getItem(HISTORY_STORAGE)||'[]');els.historyList.innerHTML=h.length?h.map((x,i)=>`<div class="history-item" data-i="${i}"><div class="history-title">${esc(x.summary||'School summary')}</div><div class="history-date">${new Date(x.at).toLocaleString('en-IN')}</div></div>`).join(''):'<div class="empty-text">Abhi koi history nahi hai.</div>';els.historyList.querySelectorAll('.history-item').forEach(el=>el.onclick=()=>{const h=JSON.parse(localStorage.getItem(HISTORY_STORAGE)||'[]');state.lastResult=h[Number(el.dataset.i)].result;renderResult(state.lastResult);window.scrollTo({top:document.getElementById('resultSection').offsetTop-70,behavior:'smooth'})});}
function plainSummary(r){let out=(r.summary? r.summary+'\n\n':'')+'🚨 Sabse zaroori\n'+items(r.urgent).map(x=>'• '+x).join('\n')+'\n\n✅ Aaj\n'+items(r.today).map(x=>'• '+x).join('\n')+'\n\n📚 Homework\n'+items(r.homework).map(x=>'• '+x).join('\n')+'\n\n📝 Test / Exam\n'+items(r.exams).map(x=>'• '+x).join('\n')+'\n\n🎒 Lekar / Jama\n'+items(r.bring_or_submit).map(x=>'• '+x).join('\n')+'\n\n📅 Dates\n'+items(r.dates).map(x=>'• '+x).join('\n')+'\n\n❓ Clear nahi\n'+items(r.unclear).map(x=>'• '+x).join('\n');return out.replace(/\n{3,}/g,'\n\n');}
els.copyBtn.onclick=async()=>{if(!state.lastResult)return;await navigator.clipboard.writeText(plainSummary(state.lastResult));toast('Summary copy ho gayi');};
els.shareBtn.onclick=async()=>{if(!state.lastResult)return;const data={title:'Poorvi School Summary',text:plainSummary(state.lastResult)};if(navigator.share){await navigator.share(data).catch(()=>{});}else{await navigator.clipboard.writeText(data.text);toast('Share supported nahi, summary copy kar di');}};
els.speakBtn.onclick=()=>{if(!state.lastResult)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(plainSummary(state.lastResult));u.lang='hi-IN';u.rate=.94;u.pitch=1;window.speechSynthesis.speak(u);};
els.clearBtn.onclick=()=>{localStorage.removeItem(RESULT_STORAGE);state.lastResult=null;els.resultSection.hidden=true;toast('Current summary clear ho gayi');};
els.analyzeBtn.onclick=analyze;

async function handleShared(){
  try{const dbReq=indexedDB.open('poorvi_share',1);dbReq.onupgradeneeded=()=>dbReq.result.createObjectStore('items',{keyPath:'id',autoIncrement:true});dbReq.onsuccess=()=>{const db=dbReq.result;const tx=db.transaction('items','readonly');const req=tx.objectStore('items').getAll();req.onsuccess=()=>{const all=req.result;if(!all.length)return;const last=all[all.length-1];if(last.text)els.textInput.value += (els.textInput.value?'\n\n':'')+last.text;if(last.file){const f=new File([last.file.blob],last.file.name,{type:last.file.type});state.files.push(f);renderFiles();}db.transaction('items','readwrite').objectStore('items').clear();toast('WhatsApp se shared material mil gaya');};};
  }catch{}
}

loadLast();renderFiles();renderHistory();handleShared();
if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
