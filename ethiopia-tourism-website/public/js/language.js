function changeLanguage(){

var lang = document.getElementById("language").value;

var elements = document.querySelectorAll("[data-en]");

for(var i=0;i<elements.length;i++){

if(lang === "am"){
elements[i].innerText = elements[i].getAttribute("data-am");
}

else{
elements[i].innerText = elements[i].getAttribute("data-en");
}

}

}