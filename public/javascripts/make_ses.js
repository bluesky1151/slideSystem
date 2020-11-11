window.onload = async () =>{
    let file = document.getElementById('file');
    $('.tooltip').tooltip();
    file.addEventListener('input', filecheck);
}
function filecheck(){
    let file = document.getElementById('file');
    let re = /.+\.(pdf|PDF)/;
    if(file.value){
        let result = re.test(file.value);
        if(!result){
            alert('このファイルは対応していません。\n 対応しているのはPDFファイルのみです.');
            file.value = null;
        }
    }
}