$(window).scroll(function() {
    let h = document.documentElement.scrollHeight;
    let now = $(this).scrollTop();
    let per = Math.round(now / h * 100);
    //console.log(now/h *100);
    if(per >= 30){
        if(document.getElementById('TopScroll') == null){
            $('body').after('<button type="button" title="ページ上部へ" id="TopScroll" onclick="toTop();"><img src="//jupiter.tntetsu-lab.cs.kanagawa-it.ac.jp/slidesystem/images/arrow.png"/></button>');
        }
    }else{
        if(document.getElementById('TopScroll') != null){
            $('#TopScroll').remove();
        }
    }
});
function toTop(){
    //console.log('scrolled!');
    $('html,body').animate({scrollTop: $('body').offset().top});
}