let pageN = 1;
let pdfObj;
let loadingTask;
let max;
let nowPage;
let scale = 1;
let SorcePage = "../viewSorce/" + sesId;
let pageProgress;
let joining;
let Exercising = false;
const socket = io.connect('http://jupiter.tntetsu-lab.cs.kanagawa-it.ac.jp', {path: "/slidesystem/socket.io"});


const emoteList = [
    '👍', '👎'
];
const statusList = [
    '演習完了', 'HELP!', '待った！', '🙋', ''
];

hljs.initHighlightingOnLoad();
socket.on('connect', ()=>{
    console.log('connect');
    socket.emit('join_actor', {sesId: sesId, actor: uid});
});
socket.on('join_view', (data)=>{
    if(data.sesId == sesId){
        let joiningList = data.joining;
        $('#joining tr').remove();
        for(let i in joiningList){
            newRow = joining.insertRow();
            newRow.setAttribute('id', 'joiner'+ joiningList[i].uId);

            newTH = document.createElement('th');
            newTH.innerText = joiningList[i].uId;
            newRow.appendChild(newTH);

            newCell = newRow.insertCell();
            newCell.innerHTML = '<p title="'+ joiningList[i].furi +'">' + joiningList[i].name + '</p>';
            
            newCell = newRow.insertCell();
            newCell.setAttribute('id', 'emotion'+joiningList[i].uId);

            newCell = newRow.insertCell();
            newCell.setAttribute('id', 'status'+joiningList[i].uId);
        }
    }
});
socket.on('join_view_all', (data)=>{
    if(data.sesId == sesId){
        let joiningList = data.joining;
        $('#joining tr').remove();
        for(let i in joiningList){
            newRow = joining.insertRow();
            newRow.setAttribute('id', 'joiner'+ joiningList[i].uId);

            newTH = document.createElement('th');
            newTH.innerText = joiningList[i].uId;
            newRow.appendChild(newTH);

            newCell = newRow.insertCell();
            newCell.innerHTML = '<p title="'+ joiningList[i].furi +'">' + joiningList[i].name + '</p>';
            
            newCell = newRow.insertCell();
            newCell.setAttribute('id', 'emotion'+joiningList[i].uId);
        }
    }
});
socket.on('sync2actor', function(data){
    console.log(data);
    if(data.sesId == sesId){
        socket.emit('sync2viewer', {page: pageN, sesId: data.sesId, id: data.id});
    }
});
socket.on('actor2dissconnect', (data)=>{
    if(data.sesId == sesId){
        $('#joiner' + data.id).remove();
    }
});

//演習中か？
socket.on('isdoExe', (data)=>{
    if(data.sesId == sesId){
        if(Exercising){
            socket.emit('doExe2Viewer', data);
        }
    }
});
socket.on('emote2all', function(data){
    if(data.sesId == sesId){
        //エモート出力
        document.getElementById('emotion' + data.id).innerText = emoteList[data.emote];
        setTimeout(()=>{
            //console.log(data);
            document.getElementById('emotion' + data.id).innerText = "";
        },10000)
    }
});
socket.on('status2all', function(data){
    if(data.sesId == sesId){
        //ステータス出力
        console.log(data.status);
        if(data.status != 4){
            document.getElementById('status' + data.id).innerHTML = '<button class="link-button" onclick="deleteState(\''+data.statusId+'\')" id="' + data.statusId + '">' + statusList[data.status] + '</button>';
        }else{
            document.getElementById('status' + data.id).innerText = "";
        }
    }
});
socket.on('deleteStatus2all', function(data){
    //console.log(data);
    if(data.sesId == sesId){
        console.log($('#'+data.statusId).remove());
    }
});
//リロード検知
$(window).on('beforeunload', function() {
    socket.emit('disconnect_actor',{id: uid, sesId: sesId}); 
    socket.on('disconnect', () => {
        //console.log('disconnect');
    });
});
//キー監視
document.addEventListener('keydown', function(event){
    //キーの情報
    //console.log(event);
    //ページ変更
    if(Exercising == 0){
        switch(event.key){
            case 'ArrowRight':  //右矢印
            case 'ArrowDown':   //下矢印
            case 'Enter':       //エンターキー
                //次のページ
                pageChange(2);
                break;
            case 'ArrowLeft':   //左矢印
            case 'ArrowUp':     //上矢印
                //前のページ
                pageChange(1);
                break;
        }
    }
});

window.onload = async function(){
    let viewDoc = document.getElementById('viewDoc');
    let viewDocCont = replace_url(nl2br(escape_html(decodeURI(viewDoc_text))));
    pageProgress = document.getElementById('pageProgress');
    joining = document.getElementById('joining');
    //url = document.getElementById('pptx').value;
    //console.log(url);
    nowPage = document.getElementById('nowPage');
    nowPage.innerText = "1";
    loadingTask = pdfjsLib.getDocument(url);
    await loadingTask.promise.then(function(pdf) {
        pdfObj = pdf;
    });
    max = pdfObj._pdfInfo.numPages;
    document.getElementById('maxPage').innerText = ' ' + String(max) + ' ';
    pageProgress.setAttribute('max', max);
    writePDF();
    SorceData();
    viewDoc.innerHTML = viewDocCont;
}
function reloadPDF(){
    writePDF();
}
function pageChange(str){
    switch(str){
        case 1:
            pageN--;
            if(pageN <= 0) pageN = max;
            writePDF();
            break;
        case 2:
            pageN++;
            if(pageN > max) pageN = 1;
            writePDF();
            break;
    }
    let data = {sesId: sesId, page: pageN, user: uid};
    //console.log(data);
    socket.emit('actor_data', data);
    nowPage.innerText = ' ' + String(pageN) + ' ';
    pageProgress.value = pageN;
    SorceData();
}
function writePDF(){
    pdfObj.getPage(pageN).then(async function(page){
        let viewport = page.getViewport({scale: scale});
        let canvas = document.getElementById('the-canvas');
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
function SorceData() {
    let lang;
    let sorceElem = document.getElementById('Sorce');
    $.post(SorcePage,
        {page: pageN},
        function(data){
            if(!data.error){
                //hljs.initHighlightingOnLoad();
                lang = hljs.highlightAuto(data.content);
                //console.log(lang);
                document.getElementById('Sorce').innerText = trimComment(data.content);
                document.getElementById('Sorce2').innerText = data.content;
                sorceElem.setAttribute('class', "hljs " + lang);
                hljs.highlightBlock(document.getElementById('Sorce'));
            }else{
                if(data.error == "データなし"){
                    document.getElementById('Sorce').innerText = "";
                }else{
                    console.log(data.error);
                }
            }
        }
    );
}
async function copyToClipboard(){
    let Sorce = document.getElementById('Sorce2');
    let range = document.createRange();
    range.selectNodeContents(Sorce);
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('Copy');
    selection.removeAllRanges();
}
function trimComment(str) {
	//                  コメント___________________ 文字列リテラル(")_______ 文字列リテラル(')_______ CDATA セクション________ 正規表現リテラル___________________________
	return str.replace(/(\/)(?:\*[\s\S]*?\*\/|\/.*)|"(?:\\[\s\S]|[^\\\n"])*"|'(?:\\[\s\S]|[^\\\n'])*'|<!\[CDATA\[[\s\S]*?\]\]>|\/(?:\\.|\[(?:\\.|[^\n\]])*\]|[^\n/])+\/\w*/g, function($0, $1) {
		return $1 ? '' : $0;
	});
}
function replace_url(str) {
    var regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g; // ']))/;
    var regexp_makeLink = function(all, url, h, href) {
        return '<a href="h' + href + '">' + url + '</a>';
    }
 
    return str.replace(regexp_url, regexp_makeLink);
}
function escape_html (string) {
    if(typeof string !== 'string') {
      return string;
    }
    return string.replace(/[&'`"<>]/g, function(match) {
      return {
        '&': '&amp;',
        "'": '&#x27;',
        '`': '&#x60;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;',
      }[match]
    });
  }
function nl2br(str) {
    str = str.replace(/\r\n/g, "<br />");
    str = str.replace(/(\n|\r)/g, "<br />");
    return str;
}
function Toonline(){
    socket.emit('openSession', {sesId: sesId, id: uid});
    let toOnline = document.getElementById('toOnline');
    toOnline.setAttribute('onclick', "ToOffline()");
    toOnline.innerText = "セッションを終了";
}
function ToOffline(){
    if(confirm('セッションを終了します。よろしいですか？')){
        location.href="../../";
    }
}
function StartExe(){
    let Button = document.getElementById('StartExe');
    socket.emit('StartExe', {sesId: sesId, id: uid});
    Button.setAttribute('onclick', "EndExe()");
    Button.innerText = "演習終了";
    $('#Changebutton').fadeOut(100);
    Exercising = true;
}
function EndExe(){
    //演習終了
    if(confirm("演習を終了します。よろしいですか？")){
        let Button = document.getElementById('StartExe');
        socket.emit('EndExe', {sesId: sesId, id: uid});
        Button.setAttribute('onclick', "StartExe()");
        Button.innerText = "演習開始";
        $('#Changebutton').fadeIn(100);
        Exercising = false;
    }
}
function reloadViewer(){
    $('#joining tr').remove();
    socket.emit('join_actor', {sesId: sesId, actor: uid});
}
function deleteState(id){
    //console.log(id);
    socket.emit('deleteStatus', {sesId: sesId, actor: uid, statusId: id})
}