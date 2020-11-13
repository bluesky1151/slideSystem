//let url = "/slide/test.pdf";
let pageN = 1;
let pdfObj;
let loadingTask;
let max;
let nowPage;
let pageProg;
let scale = 1;
let token = Math.random().toString(32).substring(2);
let SorcePage = "../viewSorce/" + sesId;
let actorPage = "../actorCheck/" + sesId;
let bookmPage = "../bookmarkcheck/" + sesId;
let getBookmark = "../bookmarkList/" + sesId;
let doExe = 0;
let joiningTable;

const emoteList = [
    '👍', '👎'
];
const statusList = [
    '演習完了', 'HELP!', '待った！', '🙋', ''
];

const socket = io.connect('http://jupiter.tntetsu-lab.cs.kanagawa-it.ac.jp', {path: "/slidesystem/socket.io"});
//console.log(url);
console.log(token);
hljs.initHighlightingOnLoad();

//キー監視
document.addEventListener('keydown', function(event){
    //キーの情報
    //console.log(event);
    //ページ変更
    if(doExe == 1){
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
    $('.tooltip').tooltip();
    let viewDoc = document.getElementById('viewDoc');
    let viewDocCont = replace_url(nl2br(escape_html(decodeURI(viewDoc_text))));
    let joiningTable = document.getElementById('joining');
    pageProg = document.getElementById('pageProg');
    //url = document.getElementById('pptx').value;
    //console.log(url);
    nowPage = document.getElementById('nowPage');
    loadingTask = pdfjsLib.getDocument(url);
    await loadingTask.promise.then(function(pdf) {
        pdfObj = pdf;
    });
    max = pdfObj._pdfInfo.numPages;
    pageProg.setAttribute('max', max);
    document.getElementById('maxPage').innerText = ' ' + String(max) + ' ';
    writePDF();
    SorceData();
    bookmarking();
    viewDoc.innerHTML = viewDocCont;
}
socket.on('connect', ()=>{
    console.log('connect');
    socket.emit('join_view', {id: uid, name: uname, furi: furi, sesId: sesId});
    socket.emit('isdoExe', {id: uid, name: uname, sesId: sesId});
    socket.emit('sync', {sesId: sesId, id: uid});
});

socket.on('join_view', (data)=>{
    //console.log(data);
    if(data.sesId == sesId){
        let joiningList = data.joining;
        $('#joining tr').remove();
        for(let i in joiningList){
            let newRow = joining.insertRow();
            newRow.setAttribute('id', 'joiner'+ joiningList[i].uId);

            let newTH = document.createElement('th');
            newTH.innerText = joiningList[i].uId;
            newRow.appendChild(newTH);

            let  newCell = newRow.insertCell();
            newCell.innerHTML = '<p title="'+ joiningList[i].furi +'">' + joiningList[i].name + '</p>';
            
            newCell = newRow.insertCell();
            newCell.setAttribute('id', 'emotion'+joiningList[i].uId);

            newCell = newRow.insertCell();
            newCell.setAttribute('id', 'status'+joiningList[i].uId);
        }
    }
});

socket.on('actor2dissconnect', (data)=>{
    if(data.sesId == sesId){
        $('#joiner' + data.id).remove();
    }
});
socket.on('actor2viewer', async function(data){
    //console.log(data);
    if(sesId == data.sesId){
        $.post(actorPage,
            {},
            function(ajaxdata){
                if(ajaxdata == data.user){
                    pageN = data.page;
                    nowPage.innerText = ' ' + String(pageN) + ' ';
                    writePDF();
                    SorceData();
                }
            }
        );
    }
});
socket.on('sync2viewer', function(data){
    //console.log(data);
    if(data.sesId == sesId && data.id == uid){
        pageN = data.page;
        nowPage.innerText = ' ' + String(pageN) + ' ';
        //writePDF();
    }
});
socket.on('session_end', async function(data){
    console.log(sesId + "==" + data.sesId);
    if(sesId == data.sesId){
        socket.emit('disconnect_user',{id: uid}); 
        console.log(alert('このセッションは終了しました'));
        await socket.on('disconnect', () => {
            console.log('disconnect');
            //console.log(alert('このセッションは終了しました'));
            //location.href="../../";
        });
        location.href="../../";
    }
});
socket.on('join2viewer', function(data){
    if(data.sesId == sesId){
        socket.emit('join_view_all', {id: uid, name: uname, sesId: sesId});
    }
});
socket.on('doExe2Viewer', function(data){
    if(data.sesId == sesId){
        StartExe();
    }
});
//リロード検知
$(window).on('beforeunload', function() {
    socket.emit('disconnect_user',{id: uid, sesId: sesId}); 
    socket.on('disconnect', () => {
        //console.log('disconnect');
    });
});
//演習開始
socket.on('StartExe', function(data){
    console.log(data);
    if(data.sesId == sesId){
        StartExe();
    }
});
socket.on('EndExe', function(data){
    console.log(data);
    if(data.sesId == sesId){
        EndExe();
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
        //エモート出力
        document.getElementById('status' + data.id).innerHTML = '<p id="' + data.statusId + '">' + statusList[data.status] + '</p>';
    }
});
socket.on('deleteStatus2all', function(data){
    //console.log(data);
    if(data.sesId == sesId){
        console.log($('#'+data.statusId).remove());
    }
});
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
    //nowPage.innerText = ' ' + String(pageN) + ' ';
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
    pageProg.value=pageN;
    nowPage.innerText = ' ' + String(pageN) + ' ';
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
async function bookmark(){
    $.post(bookmPage,
        {page: pageN},
        function(data){
            if(!data.error){
                if(data.result){
                    socket.emit('addBookmark', {uid: uid, sesId: sesId, page: pageN});
                    bookmarking();
                }else{
                    alert('ブックマークはすでにされています');
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
//bookmarkin
function bookmarking(){
    let bookmarking = document.getElementById('bookmarking_list');
    let listIndex = 1;
    $('#bookmarking tr').remove();
    let newRow = bookmarking.insertRow();
    let newTH = document.createElement('th');
    newTH.innerText = 'No.';
    newRow.appendChild(newTH);
    newTH = document.createElement('th');
    newTH.innerText = 'ページ';
    newRow.appendChild(newTH);
    newTH = document.createElement('th');
    newTH.innerText = 'サムネイル';
    newRow.appendChild(newTH);
    newTH = document.createElement('th');
    newTH.innerText = '表示';
    newRow.appendChild(newTH);
    newTH = document.createElement('th');
    newTH.innerText = '解除';
    newRow.appendChild(newTH);
    $.post(getBookmark,
        {},
        function(data){
            //console.log(data);
            for(let i in data){
                //console.log(data[i]);
                newRow = bookmarking.insertRow();
                newRow.setAttribute('id', 'book'+String(i));

                //No.
                newCell = newRow.insertCell();
                newCell.innerText = String(listIndex);

                //ページ番号
                newCell = newRow.insertCell();
                newCell.innerText = data[i].page;

                newCell = newRow.insertCell();
                newCell.innerHTML = '<canvas class="thumbCanvas" id="Thumbcanvas'+ listIndex +'" style="border:1px solid black;"></canvas>';
                bookThumb(data[i].page, document.getElementById('Thumbcanvas' + String(listIndex)));

                newCell = newRow.insertCell();
                newCell.innerHTML = '<button name="viewButton" onclick="viewButtonOn('+data[i].page+')" class="link-button">表示</button>';

                newCell = newRow.insertCell();
                newCell.innerHTML = '<button class="link-button" onclick="deleteBookmark('+ data[i].id +')">解除</button>';
                listIndex++;
            }
        }
    );
}
function viewButtonOn(Num){
    if(doExe){
        pageN = Num;
        writePDF();
    }else{
        alert('演習中ではありません');
    }
}
function changeTabs(num){
    let j = document.getElementById('viewing_tab');
    let b = document.getElementById('bookmark_tab');
    switch(num){
        case 1:
            //参加者
            j.setAttribute('class', 'anything_button_on');
            b.setAttribute('class', 'anything_button_off');
            $('#viewing').fadeIn(100);
            $('#bookmarking').fadeOut(0);
            break;
        case 2:
            //ブックマークリスト
            j.setAttribute('class', 'anything_button_off');
            b.setAttribute('class', 'anything_button_on');
            $('#viewing').fadeOut(0);
            $('#bookmarking').fadeIn(100);
            break;
    }
}
function bookThumb(page, elem){
    pdfObj.getPage(page).then(async function(page){
        let viewport = page.getViewport({scale: scale});
        let canvas = elem;
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
function StartExe(){
    let header_ = document.getElementById('header_');
    doExe = 1;
    header_.setAttribute('style', 'background-color: orchid');
    $('#Changebutton').fadeIn(100);
    alert("演習が開始されました");
}
function EndExe(){
    let header_ = document.getElementById('header_');
    doExe = 0;
    header_.removeAttribute('style');
    $('#Changebutton').fadeOut(100);
    alert("演習が終了されました");
}
function deleteBookmark(id){
    socket.emit('deleteBookmark', {uid: uid, id: id});
    bookmarking();
}
function emote(id){
    //console.log(id);
    socket.emit('emote', {id: uid, name: uname, sesId: sesId, emote: id})
}
function status(id){
    socket.emit('status', {id: uid, name: uname, sesId: sesId, status: id, statusId: Math.random().toString(32).substring(2)})
}