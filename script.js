const novels=[
 {title:"صعود قديس العوالم السبع",author:"عالم الروايات",genre:"فانتازيا • مغامرة",icon:"✦",source:"أصلية",link:"novels/saint-of-seven-worlds.html"},
 {title:"ناروتو: إرث العوالم",author:"عالم الروايات",genre:"مغامرة • خيال • ناروتو",icon:"忍",source:"رواية جديدة",link:"naruto-legacy-of-worlds/chapter-1/"}
];
const books=document.getElementById("books"),search=document.getElementById("search");
function render(list=novels){
 books.innerHTML=list.map(function(n){
   const action=n.link ? "location.href='"+n.link+"'" : "";
   const status=n.link ? "اقرأ الآن" : "قريبًا";
   return '<article class="book" tabindex="0" onclick="'+action+'"><div class="cover">'+n.icon+'</div><div class="book-info"><h3>'+n.title+'</h3><p>'+n.author+' — '+n.genre+'</p><small>'+status+'</small></div></article>';
 }).join("");
}
search.addEventListener("input",function(e){const q=e.target.value.trim().toLowerCase();render(novels.filter(function(n){return (n.title+n.genre+n.author).toLowerCase().includes(q)}))});
document.getElementById("showAll").addEventListener("click",function(){search.value="";render()});
render();