// ══════════════════════════════════════════
//  app.js  →  public/app.js
//  Mobile + Web — slide panel navigation
// ══════════════════════════════════════════

import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, setDoc, updateDoc, serverTimestamp, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── STATE ──
let currentUser=null, activeChat=null, unsubMsgs=null, unsubUsers=null;
let unsubTyping=null, allUsers=[], callTimer=null, callSeconds=0;
let isMuted=false, typingTimeout=null, currentTab='chats', unreadCounts={};

// ── UTILS ──
const getChatId   = (a,b)  => [a,b].sort().join('_');
const getInitials = (n)    => (n||'??').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const escHtml     = (s)    => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const COLORS      = ['#00c896','#7c3aed','#f59e0b','#ef4444','#06b6d4','#10b981','#f97316','#8b5cf6'];
const uidColor    = (uid)  => COLORS[(uid||'a').charCodeAt(0)%COLORS.length];
const fmtTime     = (ts)   => { if(!ts)return''; try{const d=ts.toDate?ts.toDate():new Date(ts);return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}catch(e){return'';} };
const fmtDate     = (ts)   => { if(!ts)return'Today'; try{const d=ts.toDate?ts.toDate():new Date(ts);return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});}catch(e){return'Today';} };
const isMobile    = ()     => window.innerWidth < 900;
const el          = (id)   => document.getElementById(id);
const val         = (id)   => el(id)?.value||'';

function toast(msg,type='info'){
  const t=document.createElement('div');
  t.className=`toast toast-${type}`;t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3200);
}
function setBtnLoading(id,on){
  const b=el(id);if(!b)return;
  b.disabled=on;b.textContent=on?'Please wait…':b.dataset.label;
}
function friendlyErr(e){
  const m={'auth/email-already-in-use':'Email already registered.','auth/invalid-email':'Invalid email.','auth/user-not-found':'No account found.','auth/wrong-password':'Wrong password.','auth/invalid-credential':'Wrong email or password.','auth/weak-password':'Password needs 6+ chars.','auth/too-many-requests':'Too many attempts. Try later.'};
  return m[e.code]||e.message;
}


// ══════════════════════════════════════════
//  MOBILE NAVIGATION — slide panels
// ══════════════════════════════════════════
function showChatPanel() {
  if (!isMobile()) return;

  el('sidebar').classList.add('hidden');     // hide sidebar
  el('chat-main').classList.add('visible');  // show chat
}

function showSidebarPanel() {
  if (!isMobile()) return;

  el('sidebar').classList.remove('hidden');
  el('chat-main').classList.remove('visible');
}

// Back button handler
window.goBackToSidebar = () => {
  showSidebarPanel();
};

// Handle Android back button
window.addEventListener('popstate', () => {
  if (isMobile() && el('chat-main').classList.contains('visible')) {
    showSidebarPanel();
  }
});


// ══════════════════════════════════════════
//  AUTH STATE
// ══════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  if(user){
    currentUser=user;
    await ensureUserDoc(user);
    initApp();
  } else {
    currentUser=null;teardown();showAuthScreen();
  }
});

async function ensureUserDoc(user){
  try{
    await setDoc(doc(db,'users',user.uid),{
      uid:user.uid,
      name:user.displayName||user.email.split('@')[0],
      email:user.email,online:true,status:'active',
      lastSeen:serverTimestamp(),createdAt:serverTimestamp()
    },{merge:true});
  }catch(e){console.warn('ensureUserDoc:',e);}
}


// ══════════════════════════════════════════
//  REGISTER / LOGIN / LOGOUT
// ══════════════════════════════════════════
window.doRegister=async()=>{
  const name=val('reg-name').trim(),email=val('reg-email').trim(),pass=val('reg-pass');
  if(!name||!email||!pass)return toast('Fill all fields','warn');
  if(pass.length<6)return toast('Password needs 6+ chars','warn');
  setBtnLoading('btn-register',true);
  try{
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    await updateProfile(cred.user,{displayName:name});
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,name,email,online:true,status:'active',lastSeen:serverTimestamp(),createdAt:serverTimestamp()});
    toast('Welcome to ChatWave! 🎉','success');
  }catch(e){toast(friendlyErr(e),'error');}
  setBtnLoading('btn-register',false);
};

window.doLogin=async()=>{
  const email=val('log-email').trim(),pass=val('log-pass');
  if(!email||!pass)return toast('Fill all fields','warn');
  setBtnLoading('btn-login',true);
  try{await signInWithEmailAndPassword(auth,email,pass);toast('Welcome back! 👋','success');}
  catch(e){toast(friendlyErr(e),'error');}
  setBtnLoading('btn-login',false);
};

window.doLogout=async()=>{
  await setPresence(false);teardown();await signOut(auth);toast('Logged out 👋');
};


// ══════════════════════════════════════════
//  PRESENCE
// ══════════════════════════════════════════
async function setPresence(online){
  if(!currentUser)return;
  try{await updateDoc(doc(db,'users',currentUser.uid),{online,lastSeen:serverTimestamp()});}catch(_){}
}
function startPresence(){
  setPresence(true);
  document.addEventListener('visibilitychange',()=>setPresence(!document.hidden));
  window.addEventListener('beforeunload',()=>setPresence(false));
  window.addEventListener('pagehide',()=>setPresence(false));
}


// ══════════════════════════════════════════
//  INIT / TEARDOWN
// ══════════════════════════════════════════
function initApp(){showAppScreen();startPresence();loadUsers();}
function teardown(){
  unsubMsgs?.();unsubUsers?.();unsubTyping?.();
  unsubMsgs=unsubUsers=unsubTyping=null;
  activeChat=null;allUsers=[];unreadCounts={};
}


// ══════════════════════════════════════════
//  SCREENS
// ══════════════════════════════════════════
function showAuthScreen(){
  el('auth-screen').style.display='flex';
  el('app-screen').style.display='none';
  showLogin();
}
function showAppScreen(){
  el('auth-screen').style.display='none';
  el('app-screen').style.display='flex';
  const name=currentUser.displayName||currentUser.email.split('@')[0];
  el('my-name').textContent=name.split(' ')[0];
  const av=el('my-avatar');
  av.style.background=uidColor(currentUser.uid);
  av.innerHTML=getInitials(name)+'<span class="pdot online"></span>';
}
window.showLogin=()=>{el('pg-login').style.display='flex';el('pg-register').style.display='none';};
window.showRegister=()=>{el('pg-login').style.display='none';el('pg-register').style.display='flex';};


// ══════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════
window.switchTab=(tab,btn)=>{
  currentTab=tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  el('chat-list').style.display=tab==='chats'?'block':'none';
  el('contacts-list').style.display=tab==='contacts'?'block':'none';
  renderList();
};
window.onSearch=()=>renderList();


// ══════════════════════════════════════════
//  LOAD USERS
// ══════════════════════════════════════════
async function loadUsers(){
  el('chat-list').innerHTML='<div class="empty-list">Loading contacts…</div>';
  el('contacts-list').innerHTML='<div class="empty-list">Loading contacts…</div>';
  try{
    const snap=await getDocs(collection(db,'users'));
    allUsers=[];
    snap.forEach(d=>{const u=d.data();if(u.uid&&u.uid!==currentUser.uid)allUsers.push(u);});
    allUsers.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    renderList();
  }catch(e){console.error('loadUsers:',e);toast('Error loading contacts','error');}

  if(unsubUsers)unsubUsers();
  unsubUsers=onSnapshot(collection(db,'users'),snap=>{
    allUsers=[];
    snap.forEach(d=>{const u=d.data();if(u.uid&&u.uid!==currentUser.uid)allUsers.push(u);});
    allUsers.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    renderList();
    if(activeChat){const up=allUsers.find(u=>u.uid===activeChat.uid);if(up)updateChatHeader(up);}
  });
}


// ══════════════════════════════════════════
//  RENDER LISTS
// ══════════════════════════════════════════
function renderList(){
  const filter=(el('search-input')?.value||'').toLowerCase().trim();
  const filtered=allUsers.filter(u=>(u.name||'').toLowerCase().includes(filter)||(u.email||'').toLowerCase().includes(filter));
  if(currentTab==='chats')renderChatList(filtered);
  else renderContactsList(filtered);
}

function renderChatList(users){
  const list=el('chat-list');list.innerHTML='';
  if(!users.length){
    list.innerHTML=`<div class="empty-list"><div style="font-size:40px;margin-bottom:10px">👥</div><div style="font-weight:700;color:var(--text2);margin-bottom:6px;font-size:15px">No contacts yet</div><div style="font-size:13px;line-height:1.7">Visit <a href="/seed.html" style="color:var(--accent);font-weight:600">/seed.html</a><br/>to add demo users</div></div>`;
    return;
  }
  users.forEach(u=>{
    const isActive=activeChat?.uid===u.uid;
    const dot=u.online?(u.status||'active'):'offline';
    const unread=(!isActive&&unreadCounts[u.uid])?`<span class="unread-badge">${unreadCounts[u.uid]}</span>`:'';
    const div=document.createElement('div');
    div.className='chat-item'+(isActive?' active':'');
    div.onclick=()=>openChat(u);
    div.innerHTML=`
      <div class="avatar md" style="background:${uidColor(u.uid)};color:#fff;font-weight:800;font-size:15px">
        ${getInitials(u.name)}<span class="pdot ${dot}"></span>
      </div>
      <div class="chat-item-info">
        <div class="chat-item-top">
          <span class="chat-item-name">${escHtml(u.name)}</span>
          <span class="chat-item-time" id="lt-${u.uid}"></span>
        </div>
        <div class="chat-item-bottom">
        <span class="chat-item-preview" id="lm-${u.uid}">...</span>
         ${unread}
        </div>
      </div>`;
    list.appendChild(div);
    listenLastMsg(u.uid);
  });
}

function renderContactsList(users){
  const list=el('contacts-list');list.innerHTML='';
  if(!users.length){
    list.innerHTML=`<div class="empty-list"><div style="font-size:40px;margin-bottom:10px">👥</div><div style="font-weight:700;color:var(--text2)">No people found</div></div>`;
    return;
  }
  users.forEach(u=>{
    const dot=u.online?(u.status||'active'):'offline';
    const stText=u.online?(u.status==='busy'?'🔴 Busy':u.status==='away'?'🟡 Away':'🟢 Online'):'⚫ Offline';
    const div=document.createElement('div');
    div.className='chat-item';div.onclick=()=>openChat(u);
    div.innerHTML=`
      <div class="avatar md" style="background:${uidColor(u.uid)};color:#fff;font-weight:800;font-size:15px">
        ${getInitials(u.name)}<span class="pdot ${dot}"></span>
      </div>
      <div class="chat-item-info">
        <div class="chat-item-top">
          <span class="chat-item-name">${escHtml(u.name)}</span>
          <span class="chat-item-time" style="font-size:12px">${stText}</span>
        </div>
        <span class="chat-item-preview" style="font-size:12px">${escHtml(u.email||'')}</span>
      </div>`;
    list.appendChild(div);
  });
}

function listenLastMsg(uid){
  const chatId=getChatId(currentUser.uid,uid);
  const q=query(collection(db,'chats',chatId,'messages'),orderBy('createdAt','desc'),limit(1));
  onSnapshot(q,snap=>{
    if(snap.empty)return;
    const d=snap.docs[0].data();
    const lm=el(`lm-${uid}`),lt=el(`lt-${uid}`);
    const preview=d.text?(d.text.length>32?d.text.slice(0,32)+'…':d.text):'📎 File';
    if(lm)lm.textContent=preview;
    if(lt)lt.textContent=fmtTime(d.createdAt);
    if(activeChat?.uid!==uid&&d.senderId!==currentUser.uid)unreadCounts[uid]=(unreadCounts[uid]||0)+1;
  });
}


// ══════════════════════════════════════════
//  OPEN CHAT
// ══════════════════════════════════════════
function openChat(user){
  activeChat=user;unreadCounts[user.uid]=0;renderList();
  updateChatHeader(user);

  el('empty-view').style.display='none';
  el('chat-view').style.display='flex';
  el('info-panel').style.display='none';

  // Mobile: slide to chat panel
  showChatPanel();
  // Push history state for back button
  history.pushState({chat:user.uid},'');

  setTimeout(()=>el('msg-input').focus(),300);

  unsubMsgs?.();unsubTyping?.();

  const chatId=getChatId(currentUser.uid,user.uid);
  const q=query(collection(db,'chats',chatId,'messages'),orderBy('createdAt'));
  unsubMsgs=onSnapshot(q,snap=>{
    const area=el('messages-area');area.innerHTML='';let lastDate='';
    snap.forEach(docSnap=>{
      const msg=docSnap.data(),date=fmtDate(msg.createdAt);
      if(date!==lastDate){lastDate=date;const dl=document.createElement('div');dl.className='date-divider';dl.innerHTML=`<span>${date}</span>`;area.appendChild(dl);}
      area.appendChild(buildMsgEl(msg));
    });
    area.scrollTop=area.scrollHeight;
    unreadCounts[user.uid]=0;
  });
  listenTyping(chatId,user.uid);
}

function updateChatHeader(user){
  activeChat=user;
  const av=el('chat-av');if(!av)return;
  const dot=user.online?(user.status||'active'):'offline';
  av.style.background=uidColor(user.uid);av.style.color='#fff';av.style.fontWeight='800';av.style.fontSize='15px';
  av.innerHTML=getInitials(user.name)+`<span class="pdot ${dot}"></span>`;
  el('chat-name').textContent=user.name;
  const st=el('chat-status');
  if(user.online){
    const labels={busy:'🔴 Busy',away:'🟡 Away',active:'● Online'};
    st.textContent=labels[user.status]||'● Online';
    st.style.color=user.status==='busy'?'var(--busy)':user.status==='away'?'var(--away)':'var(--online)';
  } else {st.textContent='last seen recently';st.style.color='var(--text3)';}
}

function buildMsgEl(msg){
  const isOut=msg.senderId===currentUser.uid;
  const div=document.createElement('div');div.className=`message ${isOut?'out':'in'}`;
  div.innerHTML=`<div class="bubble">${escHtml(msg.text||'')}</div>
    <div class="msg-meta">${fmtTime(msg.createdAt)}${isOut?`<span class="ticks ${msg.read?'read':''}">✓✓</span>`:''}</div>`;
  return div;
}


// ══════════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════════
window.sendMessage=async()=>{
  const input=el('msg-input'),text=input.value.trim();
  if(!text||!activeChat)return;
  input.value='';input.style.height='46px';clearTypingSignal();
  const chatId=getChatId(currentUser.uid,activeChat.uid);
  try{
    await addDoc(collection(db,'chats',chatId,'messages'),{
      text,senderId:currentUser.uid,
      senderName:currentUser.displayName||'User',
      receiverId:activeChat.uid,
      createdAt:serverTimestamp(),read:false
    });
    await setDoc(doc(db,'chats',chatId),{
      participants:[currentUser.uid,activeChat.uid],
      lastAt:serverTimestamp()
    },{merge:true});
  }catch(e){console.error('sendMessage:',e);toast('Failed to send','error');input.value=text;}
};

window.handleKey=(e)=>{
  // On mobile, Enter adds newline. On desktop, Enter sends.
  if(e.key==='Enter'&&!e.shiftKey&&!isMobile()){e.preventDefault();sendMessage();}
};

window.handleTyping=(textarea)=>{
  textarea.style.height='46px';
  textarea.style.height=Math.min(textarea.scrollHeight,120)+'px';
  sendTypingSignal();
};


// ══════════════════════════════════════════
//  TYPING INDICATOR
// ══════════════════════════════════════════
async function sendTypingSignal(){
  if(!activeChat)return;
  const chatId=getChatId(currentUser.uid,activeChat.uid);
  try{await setDoc(doc(db,'chats',chatId,'typing',currentUser.uid),{uid:currentUser.uid,name:currentUser.displayName||'Someone',ts:serverTimestamp()});}catch(_){}
  clearTimeout(typingTimeout);typingTimeout=setTimeout(clearTypingSignal,2500);
}
async function clearTypingSignal(){
  if(!activeChat)return;
  const chatId=getChatId(currentUser.uid,activeChat.uid);
  try{await setDoc(doc(db,'chats',chatId,'typing',currentUser.uid),{uid:currentUser.uid,ts:null});}catch(_){}
}
function listenTyping(chatId,otherUid){
  unsubTyping?.();
  const typRef=doc(db,'chats',chatId,'typing',otherUid);
  unsubTyping=onSnapshot(typRef,snap=>{
    const bar=el('typing-bar'),data=snap.data();
    if(data?.ts&&(Date.now()-data.ts.toMillis()<4000)){
      if(el('typing-text'))el('typing-text').textContent=`${data.name||'Someone'} is typing…`;
      bar.style.display='flex';
    } else {bar.style.display='none';}
  });
}


// ══════════════════════════════════════════
//  EMOJI
// ══════════════════════════════════════════
window.toggleEmoji=()=>{
  const picker=el('emoji-picker');
  if(picker.classList.contains('open')){picker.classList.remove('open');return;}
  const emojis=['😊','😂','❤️','👍','🙏','🔥','✨','😍','🥳','😎','🤔','😢','👏','🎉','💪','🚀','😅','🤣','😭','😤','🥺','😏','🤗','😴','🤯','🥰','😬','🙄','😇','🤩','😑','💀','👋','🤝','👌','✌️','🤞','🫶','💯','🎊','🏆','⚡','🌟','💥','🎯','🔑','💡','🎵'];
  el('emoji-grid').innerHTML=emojis.map(e=>`<button class="emoji-btn-item" onclick="insertEmoji('${e}')">${e}</button>`).join('');
  picker.classList.add('open');
};
window.insertEmoji=(emoji)=>{
  const input=el('msg-input'),pos=input.selectionStart||input.value.length;
  input.value=input.value.slice(0,pos)+emoji+input.value.slice(pos);
  input.selectionStart=input.selectionEnd=pos+emoji.length;
  input.focus();
  picker?.classList.remove('open');
};
document.addEventListener('click',e=>{
  const picker=el('emoji-picker');if(!picker)return;
  if(!picker.contains(e.target)&&!e.target.closest('.emoji-btn'))picker.classList.remove('open');
});


// ══════════════════════════════════════════
//  CALL MODAL
// ══════════════════════════════════════════
window.startCall=(type)=>{
  if(!activeChat)return;
  const av=el('call-av');av.style.background=uidColor(activeChat.uid);av.textContent=getInitials(activeChat.name);
  el('call-name').textContent=activeChat.name;
  el('call-status').textContent=type==='video'?'📹 Video calling…':'📞 Calling…';
  el('call-timer').style.display='none';el('call-modal').style.display='flex';
  isMuted=false;el('call-mute-btn').textContent='🎤';el('call-speaker-btn').textContent='🔊';
  setTimeout(()=>{
    el('call-status').textContent='✅ Connected';el('call-timer').style.display='block';callSeconds=0;
    callTimer=setInterval(()=>{callSeconds++;const m=String(Math.floor(callSeconds/60)).padStart(2,'0'),s=String(callSeconds%60).padStart(2,'0');el('call-timer').textContent=`${m}:${s}`;},1000);
  },2000);
};
window.endCall=()=>{clearInterval(callTimer);el('call-modal').style.display='none';toast('Call ended');};
window.toggleMute=()=>{isMuted=!isMuted;el('call-mute-btn').textContent=isMuted?'🔇':'🎤';el('call-mute-btn').classList.toggle('active',isMuted);};
window.toggleSpeaker=()=>{const btn=el('call-speaker-btn');btn.classList.toggle('active');btn.textContent=btn.classList.contains('active')?'🔈':'🔊';};


// ══════════════════════════════════════════
//  INFO PANEL
// ══════════════════════════════════════════
window.toggleChatInfo=()=>{
  const panel=el('info-panel');
  if(panel.style.display==='none'||!panel.style.display){
    if(!activeChat)return;
    const av=el('info-av');av.style.background=uidColor(activeChat.uid);av.textContent=getInitials(activeChat.name);
    el('info-name').textContent=activeChat.name;el('info-email').textContent=activeChat.email||'';
    el('info-online').textContent=activeChat.online?'Online now':'Offline';
    panel.style.display='flex';
    if(isMobile())history.pushState({info:true},'');
  } else {panel.style.display='none';}
};


// ══════════════════════════════════════════
//  PROFILE MODAL
// ══════════════════════════════════════════
window.openProfileModal=()=>{
  const name=currentUser.displayName||'';
  const av=el('profile-av');av.style.background=uidColor(currentUser.uid);av.textContent=getInitials(name);
  el('profile-name').value=name;el('profile-email').value=currentUser.email;
  el('profile-modal').style.display='flex';
};
window.closeProfileModal=(e)=>{if(!e||e.target===el('profile-modal'))el('profile-modal').style.display='none';};
window.saveProfile=async()=>{
  const name=el('profile-name').value.trim(),status=el('profile-status-select').value;
  if(!name)return toast('Name cannot be empty','warn');
  try{
    await updateProfile(currentUser,{displayName:name});
    await updateDoc(doc(db,'users',currentUser.uid),{name,status});
    el('my-name').textContent=name.split(' ')[0];
    el('profile-modal').style.display='none';toast('Profile updated ✅','success');
  }catch(e){toast('Update failed','error');}
};


// ══════════════════════════════════════════
//  IMAGE VIEWER
// ══════════════════════════════════════════
window.openImgModal=(url)=>{el('img-viewer-src').src=url;el('img-modal').style.display='flex';};
window.closeImgModal=()=>{el('img-modal').style.display='none';el('img-viewer-src').src='';};


// ══════════════════════════════════════════
//  KEYBOARD HANDLING (mobile)
//  Scroll messages up when keyboard appears
// ══════════════════════════════════════════
if ('visualViewport' in window) {
  window.visualViewport.addEventListener('resize', () => {
    const area = el('messages-area');
    if (area) area.scrollTop = area.scrollHeight;
  });
}