"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "worldOfNovels:adminDraft:v2";
  const API = "https://api.github.com/repos/arkanws513-spec/world-of-novels/contents/";
  let manifest = null, selectedNovel = null, selectedChapter = null;
  let changed = new Map();

  const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const status = (message, bad=false) => { $("adminStatus").textContent=message; $("adminStatus").style.color=bad?"#e7a2a2":"#e5bd80"; };
  const fileName = number => String(number).padStart(3,"0")+".md";
  const chapterPath = (novel, number) => novel.contentDir+"/"+fileName(number);
  const activeNovel = () => manifest?.novels.find(n => n.id===selectedNovel);
  const slugify = value => value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"") || "novel";

  function persist() {
    try {
      localStorage.setItem(KEY,JSON.stringify({manifest,chapters:[...changed.entries()]}));
      $("draftBadge").textContent="مسودة محفوظة محليًا";
    } catch { status("تعذر حفظ المسودة المحلية؛ قد تكون مساحة التخزين ممتلئة.",true); }
  }
  function restore() {
    try {
      const draft=JSON.parse(localStorage.getItem(KEY)||"null");
      if(draft?.manifest?.novels){manifest=draft.manifest;changed=new Map(draft.chapters||[]);return true;}
    } catch {}
    return false;
  }
  async function discoverChapters(novel) {
    try {
      const path=novel.contentDir.split("/").map(encodeURIComponent).join("/");
      const response=await fetch(API+path+"?ref=main",{headers:{Accept:"application/vnd.github+json"}});
      if(!response.ok) return novel.chapters||[];
      const files=await response.json();
      const names=files.filter(file=>file.type==="file" && /^\d{3}\.md$/i.test(file.name)).sort((a,b)=>a.name.localeCompare(b.name));
      const known=new Map((novel.chapters||[]).map(c=>[c.number,c]));
      novel.chapters=names.map((file,index)=>{
        const number=Number(file.name.slice(0,3));
        return {...(known.get(number)||{}),number,title:known.get(number)?.title||("الفصل "+number),url:""};
      });
    } catch {}
    return novel.chapters||[];
  }
  function renderNovels() {
    const host=$("novelList");
    host.innerHTML=manifest.novels.map(n=>`<button class="novel-choice ${n.id===selectedNovel?"active":""}" data-id="${esc(n.id)}">${esc(n.title)}<small>${(n.chapters||[]).length} فصل</small></button>`).join("")||'<p class="empty-admin">لا توجد روايات. أضف رواية جديدة للبدء.</p>';
    host.querySelectorAll("[data-id]").forEach(button=>button.addEventListener("click",()=>selectNovel(button.dataset.id)));
  }
  function fillNovel() {
    const n=activeNovel(); $("novelForm").hidden=!n; if(!n)return;
    $("novelTitle").value=n.title||""; $("novelAuthor").value=n.author||"عالم الروايات";
    $("novelGenre").value=n.genre||""; $("novelIcon").value=n.icon||"✦";
    $("novelCategories").value=(n.categories||[]).join("، ");
    $("novelDescription").value=n.description||"";
    $("novelCover").value=n.cover||""; $("novelStatus").value=n.status||"متاحة للقراءة"; $("novelIntro").value=(n.intro||[]).join("\n\n");
  }
  function renderChapters() {
    const n=activeNovel(),list=$("chapterList");
    if(!n){list.innerHTML="";$("chapterSummary").textContent="اختر رواية لعرض فصولها.";return;}
    const chapters=[...(n.chapters||[])].sort((a,b)=>a.number-b.number);
    $("chapterSummary").textContent=chapters.length+" فصل مكتشف في ملفات المستودع";
    list.innerHTML=chapters.map(c=>`<button class="chapter-choice ${selectedChapter===c.number?"active":""}" data-number="${c.number}">الفصل ${c.number}<small>${esc(c.title)}</small></button>`).join("")||'<p class="empty-admin">لا توجد فصول بعد.</p>';
    list.querySelectorAll("[data-number]").forEach(button=>button.addEventListener("click",()=>loadChapter(Number(button.dataset.number))));
  }
  function selectNovel(id) {
    selectedNovel=id; selectedChapter=null; renderNovels(); fillNovel(); renderChapters();
    $("chapterNumber").value=""; $("chapterTitle").value=""; $("chapterContent").value="";
    status("تم اختيار الرواية.");
  }
  async function loadChapter(number) {
    const n=activeNovel(),chapter=n?.chapters.find(item=>item.number===number);
    if(!n||!chapter)return;
    selectedChapter=number; renderChapters(); $("chapterNumber").value=number; $("chapterTitle").value=chapter.title||"الفصل "+number;
    const path=chapterPath(n,number); let source=changed.get(path);
    if(source===undefined) {
      status("جارٍ تحميل الفصل "+number+"…");
      try { const response=await fetch(path+"?v="+Date.now()); if(!response.ok)throw Error("missing"); source=await response.text(); const parsedTitle=source.match(/^#\\s+(.+)$/m)?.[1]?.trim(); if(parsedTitle){chapter.title=parsedTitle;$("chapterTitle").value=parsedTitle;} }
      catch { source="# "+$("chapterTitle").value+"\n\n"; status("تعذر تحميل ملف الفصل المنشور. تحقق من المسار أو أنشئ محتواه.",true); }
    }
    $("chapterContent").value=source; status("تم فتح الفصل "+number+".");
  }
  function saveNovel(event) {
    event.preventDefault(); const n=activeNovel(); if(!n)return;
    n.title=$("novelTitle").value.trim(); n.author=$("novelAuthor").value.trim()||"عالم الروايات";
    n.genre=$("novelGenre").value.trim(); n.icon=$("novelIcon").value.trim()||"✦";
    n.categories=$("novelCategories").value.split(/[،,]/).map(x=>x.trim()).filter(Boolean);
    n.description=$("novelDescription").value.trim(); n.cover=$("novelCover").value.trim();
    n.status=$("novelStatus").value.trim()||"متاحة للقراءة"; n.intro=$("novelIntro").value.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
    persist(); renderNovels(); status("تم حفظ بيانات الرواية في المسودة.");
  }
  function saveChapter() {
    const n=activeNovel(); if(!n||selectedChapter===null)return;
    const chapter=n.chapters.find(item=>item.number===selectedChapter); if(!chapter)return;
    const title=$("chapterTitle").value.trim()||"الفصل "+selectedChapter;
    chapter.title=title;
    const body=$("chapterContent").value.replace(/^#\s+[^\n]*(?:\r?\n)?/,"").replace(/^\n+/,"");
    const normalized="# "+title+"\n\n"+body;
    changed.set(chapterPath(n,selectedChapter),normalized.endsWith("\n")?normalized:normalized+"\n");
    persist(); renderChapters(); status("تم حفظ الفصل في المسودة المحلية. نزّل الملفات ثم ارفعها إلى GitHub.");
  }
  function download(name,content,type="text/plain;charset=utf-8") {
    const blob=new Blob(["\ufeff",content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function exportManifest() {
    if(!manifest)return;
    download("novels.json",JSON.stringify(manifest,null,2)+"\n","application/json;charset=utf-8");
    status("تم تجهيز novels.json. استبدل به ملف content/novels.json في المستودع.");
  }
  function addNovel() {
    const title=prompt("اكتب عنوان الرواية الجديدة:"); if(!title?.trim())return;
    const slug=slugify(title)+"-"+Date.now().toString(36);
    const n={id:slug,slug,title:title.trim(),author:"عالم الروايات",genre:"",categories:[],icon:"✦",description:"",
      intro:[],cover:"",status:"قريباً — قيد التأسيس",contentDir:"content/novels/"+slug+"/chapters",
      outputDir:"novels",chapterPrefix:slug+"-chapter-",indexPath:"novels/"+slug+".html",customPage:false,chapters:[]};
    manifest.novels.push(n); selectedNovel=n.id; selectedChapter=null;
    persist();renderNovels();fillNovel();renderChapters();status("أُضيفت الرواية إلى المصدر الرئيسي. أكمل بياناتها ثم صدّر novels.json.");
  }
  function addChapter() {
    const n=activeNovel();if(!n)return;
    const next=Math.max(0,...(n.chapters||[]).map(c=>c.number))+1;
    const title="الفصل "+next;n.chapters=n.chapters||[];n.chapters.push({number:next,title,url:""});
    selectedChapter=next;changed.set(chapterPath(n,next),"# "+title+"\n\n");
    persist();renderChapters();$("chapterNumber").value=next;$("chapterTitle").value=title;$("chapterContent").value="# "+title+"\n\n";
    status("تم إنشاء فصل جديد. احفظه ثم صدّر ملفه.");
  }
  function exportAll() {
    if(!manifest)return; exportManifest();
    let delay=0;
    for(const [path,content] of changed) {
      const novel=manifest.novels.find(n=>path.startsWith(n.contentDir+"/"));
      const safeName=(novel?.slug||"novel")+"-"+path.split("/").pop();
      setTimeout(()=>download(safeName,content),delay);delay+=350;
    }
    status("يتم تنزيل ملف البيانات والفصول بأسماء فريدة. ضع كل فصل داخل مجلده المحدد في content/novels/.");
  }

  $("novelForm").addEventListener("submit",saveNovel);
  $("addNovel").addEventListener("click",addNovel);
  $("addChapter").addEventListener("click",addChapter);
  $("saveChapter").addEventListener("click",saveChapter);
  $("downloadChapter").addEventListener("click",()=>{saveChapter();const n=activeNovel();if(n&&selectedChapter!==null)download(n.slug+"-"+fileName(selectedChapter),changed.get(chapterPath(n,selectedChapter)));});
  $("exportManifest").addEventListener("click",exportManifest);
  $("exportAll").addEventListener("click",exportAll);
  $("removeNovel").addEventListener("click",()=>{
    const n=activeNovel();if(!n||!confirm("حذف "+n.title+" من الفهرس فقط؟ لن تُحذف ملفات الفصول المنشورة."))return;
    manifest.novels=manifest.novels.filter(item=>item.id!==n.id);selectedNovel=manifest.novels[0]?.id||null;selectedChapter=null;
    persist();renderNovels();fillNovel();renderChapters();
  });
  $("discardDrafts").addEventListener("click",()=>{
    if(!confirm("حذف المسودات المحلية والعودة إلى بيانات المستودع؟"))return;
    localStorage.removeItem(KEY);location.reload();
  });

  fetch("content/novels.json?v="+Date.now()).then(response=>{if(!response.ok)throw Error("manifest");return response.json();})
    .then(async data=>{
      manifest=data;
      await Promise.all(manifest.novels.map(discoverChapters));
      if(restore())status("تم استرجاع مسوداتك المحلية. راجع عدد الفصول قبل التصدير.");
      else status("تم تحميل بيانات الروايات واكتشاف ملفات الفصول من GitHub.");
      selectedNovel=manifest.novels[0]?.id||null;renderNovels();fillNovel();renderChapters();
    }).catch(()=>status("تعذر تحميل ملف بيانات الروايات أو اكتشاف الفصول. افتح اللوحة من الموقع المنشور.",true));
})();