let pdfObj;
let loadingTask;
let max;
let nowPage;
let scale = 1;
let docURL = "../session/viewSorce/" + sesId;
window.onload = async function(){
    nowPage = document.getElementById('nowPage');
    loadingTask = pdfjsLib.getDocument(url);
    await loadingTask.promise.then(function(pdf) {
        pdfObj = pdf;
    });
    max = pdfObj._pdfInfo.numPages;
    document.getElementById('max_data').value = max;
    for(let i=1; i <= max; i++){
        newRow(i);
    }
}
function newRow(num){
    let table = document.getElementById('slidelist');
    let newRow = table.insertRow();

    let th_data = document.createElement('th');
    th_data.innerText = num;
    th_data.setAttribute('width', '5%');
    newRow.appendChild(th_data);

    let td_data = newRow.insertCell();
    td_data.setAttribute('width', '50%');
    td_data.innerHTML = '<canvas id="the-canvas'+ num +'" width="100%"></canvas>';

    td_data = newRow.insertCell();
    td_data.innerHTML = '<textarea class="full" id="textarea'+ num +'" name="data[]"></textarea>';
    getDocment(num);
    editAreaLoader.init({
        id : "textarea"+num       // テキストエリアのID
        ,syntax: "js"          // シンタックスタイプ
        ,start_highlight: true  // ハイライト開始
    });
    writePDF(num);
}
function writePDF(pageN){
    pdfObj.getPage(pageN).then(async function(page){
        let viewport = page.getViewport({scale: scale});
        let canvas = document.getElementById('the-canvas' + String(pageN));
        let context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        let renderContext = {
            canvasContext: context,
            viewport: viewport
        }
        page.render(renderContext);
    });
}
function getDocment(page){
    let textarea = document.getElementById('textarea' + page);
    $.post(docURL,
        {page: page},
        function(data){
            if(!data.error){
                textarea.value = data.content;
            }else{
                if(data.error == "データなし"){
                    textarea.value = "";
                }else{
                    textarea.value = "データの読み込みに失敗" + data.error;
                }
            }
        }
    );
}