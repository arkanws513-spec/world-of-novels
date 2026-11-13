"use strict";
(function(){
 const base="https://countapi.mileshilliard.com/api/v1/get/";
 const ns="world-of-novels";
 const $=id=>document.getElementById(id);
 async function read(key){
   const r=await fetch(base+encodeURIComponent(key),{mode:"cors",cache:"no-store"});
   if(!r.ok) throw new Error("تعذر قراءة العدّاد");
   const d=await r.json(); return Number(d.value)||0;
 }
 function item(name,value){return '<div class="stats-item"><span>'+name+'</span><strong>'+value.toLocaleString("ar-EG")+'</strong></div>';}
 async function run(){
   try{
     const total=await read(ns+"-total");
     $("totalViews").textContent=total.toLocaleString("ar-EG");
     const novels=[
       ["صعود قديس العوالم السبع",ns+"-novels-saint-of-seven-worlds-html"],
       ["ناروتو: إرث العوالم",ns+"-naruto-legacy-of-worlds"]
     ];
     const novelValues=await Promise.all(novels.map(async x=>[x[0],await read(x[1])]));
     $("novelStats").innerHTML=novelValues.map(x=>item(x[0],x[1])).join("");
     const chapters=[];
     for(let i=1;i<=30;i++) chapters.push(["قديس العوالم السبع — الفصل "+i,ns+"-novels-chapter-html-chapter-"+i]);
     chapters.push(["ناروتو: إرث العوالم — الفصل 1",ns+"-naruto-legacy-of-worlds-chapter-html-chapter-1"]);
     const values=await Promise.all(chapters.map(async x=>[x[0],await read(x[1])]));
     values.sort((a,b)=>b[1]-a[1]);
     $("chapterStats").innerHTML=values.slice(0,10).map(x=>item(x[0],x[1])).join("");
     $("statsStatus").textContent="آخر تحديث عند فتح هذه الصفحة.";
   }catch(e){
     $("totalViews").textContent="غير متاح مؤقتًا";
     $("novelStats").textContent="تعذر تحميل الإحصائيات الآن.";
     $("chapterStats").textContent="حاول تحديث الصفحة لاحقًا.";
     $("statsStatus").textContent="قد تكون خدمة العدّاد متوقفة مؤقتًا.";
   }
 }
 run();
})();