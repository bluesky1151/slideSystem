var express = require('express');
var router = express.Router();
var fs = require('fs');
var mysql = require('mysql2/promise');
var bodyParser = require('body-parser');
let crypto = require("crypto");
let url = require('url');
require('date-utils');
const bcrypt = require('bcrypt');
const e = require('express');
const { createConnection } = require('net');
const { use } = require('passport');
let async = require('async');
let PDFJS = require('pdfjs-dist');
const multer = require('multer');
const { route } = require('.');
const { listen } = require('../app');
const { connect } = require('http2');
const upload = multer({dest: __dirname + '/../public/slide'});



//let pdfcontoroll = require('pdf.js-controller');

//関数
let title = '輪講支援システム';

//設定読み込み
let sqlSetting = require("../mysql");
let mysql_setting = sqlSetting;


/* GET users listing. */
router.get('/', isLogined,  async function(req, res, next) {
  let remoteAddress = req.connection.remoteAddress;
  let id = req.session.passport.user;
  let host = req.get('Host');
  let url = req.protocol + '://' + host;
  //console.log(id);
  console.log(remoteAddress + ': アクセス->ポータル');
  //ユーザ情報取得
  //let [row1] = await connection.query('SELECT * FROM account WHERE id=? LIMIT 1', [id]);
  let row1 = await querySQL('SELECT * FROM account WHERE id=? LIMIT 1', [id]);
  //console.log(row1);
  let userData = row1[0];
  //開催中のセッション取得
  //let [row2] = await connection.query('SELECT session.id, session.session_name, account.name FROM session INNER JOIN account ON session.actor = account.id WHERE online=1');
  let row2 = await querySQL('SELECT session.id, session.session_name, account.name, session.page FROM session INNER JOIN account ON session.actor = account.id WHERE online=1');
  let session_list = row2;
  //自分のセッション取得
  //let [row3] = await connection.query('SELECT * FROM session WHERE actor=?', [id]);
  let row3 = await querySQL('SELECT * FROM session WHERE actor=?', [id]);
  let mysession = row3;
  //console.log(row1);
  if(isset(row1.error) || isset(row2.error) || isset(row3.error)){
    console.log('ポータル->DBエラー');
    res.render('blank', {
      title: title,
      content: 'データベースエラー',
      link: '../'
    });
  }else{
    res.render('portal', {
      title: title,
      data: userData,
      session_list: session_list,
      mysession: mysession,
      url: url
    });
  }
/*
  connection.query('SELECT * FROM account WHERE id=?', [id], function (error, results, fields) {
    if(error == null){
      result = results[0];
      connection.query('SELECT session.id, session.session_name, account.name FROM session INNER JOIN account ON session.actor = account.id WHERE online=1', function(error, results2, fields){
        if(error == null){
          let session_list = results2;
          connection.query('SELECT * FROM session WHERE actor=?',[id], function(error, results2, fields){
            if(error == null){
              //console.log(results2);
              let mysession = results2;
              //console.log(mysession);
              res.render('portal', {
                title: title,
                data: result,
                session_list: session_list,
                mysession: mysession
              });
            }else{
              res.redirect('../');
            }
          });
        }else{
          res.redirect('../');
        }
      });
    }else{
      res.redirect('../');
    }
  });
*/
});

//ログアウト
router.get('/logout', isLogined, function(req, res, next){
  let remoteAddress = req.connection.remoteAddress;
  console.log(remoteAddress + ': 処理->ログアウト');
  req.logout();
  res.redirect('../');
});

router.get('/make_session', isLogined, async function(req, res, next){
  let remoteAddress = req.connection.remoteAddress;
  let id = req.session.passport.user;
  console.log(remoteAddress + ': 処理->セッション管理');
  let data = await querySQL('SELECT * FROM account WHERE id=?', [id]);
  res.render('change_session', {
    title: title,
    data: data[0]
  });
});

router.post('/make_session', isLogined, upload.single('file'), async function(req, res, next){
  let ses_name = isset(req.body.title) ? req.body.title : null;
  let p = isset(req.body.p1) && isset(req.body.p2) ? req.body.p1 + ' - ' + req.body.p2 : null;
  let relSorce = isset(req.body.relSorce) ? req.body.relSorce : null;
  let sesID = randomSTR();
  let fpath = '/slide/' + sesID + '.pdf';
  let remoteAddress = req.connection.remoteAddress;
  let connection = await mysql.createConnection(mysql_setting);
  let id = req.session.passport.user;
  console.log(remoteAddress + ': 処理->セッション作成');

  if(ses_name && p){
    await fs.rename(req.file.path, __dirname + '/../public/slide/' + sesID + '.pdf', async function(err){
      if(err) console.log(err);
    });
    let result = await connection.query('INSERT INTO session (id, session_name, actor, path, page, viewDoc) VALUE (?,?,?,?,?,?)', [sesID, ses_name, id, fpath, p, relSorce]);
    //console.log(result);
    if(!isset(result.error)){
      res.redirect('./edit/'+sesID);
    }else{
      fs.unlinkSync(__dirname + '/../public/slide/' + sesID + '.pdf');
      res.render('blank', {
        title: '登録失敗',
        content: 'DBエラー: ' + result.error,
        link: './'
      });
    }
  }else{
    fs.unlinkSync(req.file.path);
    res.render('blank',{
      title: title + '　セッション作成失敗',
      content: '登録失敗: 値が不足しています',
      link: './'
    });
  }
});

router.get('/edit/:sesId', isLogined, async function(req, res, next){
  let id = req.session.passport.user;
  let sesId = req.params.sesId;
  let remoteAddress = req.connection.remoteAddress;
  let SesInfo = await querySQL('SELECT * FROM session WHERE id=?',[sesId]);
  console.log(remoteAddress + ': アクセス->セッション編集');
  SesInfo = SesInfo[0];
  if(SesInfo){
    let data = {
      id: SesInfo.id,
      title: SesInfo.session_name,
      path: SesInfo.path,
      page: SesInfo.page,
      viewDoc: SesInfo.viewDoc
    };
    if(id == SesInfo.actor){
      res.render('edit_session',{
        title: SesInfo.session_name + ' 編集',
        url: SesInfo.path,
        uid: id,
        data: data
      });
    }else{
      //権限なし
      res.render('blank', {
        title: title,
        content: 'このセッションを編集する権限がありません',
        link: '../'
      });
    }
  }else{
    //該当無し
    res.render('blank', {
      title: title,
      content: 'セッションIDが不正です。',
      link: '../'
    });
  }
});
router.post('/edit/:sesId', isLogined, async function(req, res, next){
  //データ送信後
  let id = req.session.passport.user;
  let sessionId = req.params.sesId;
  let title = isset(req.body.title) ? req.body.title : null;
  let p = isset(req.body.p) ? req.body.p : null;
  let max = isset(req.body.max_data) ? req.body.max_data : null;
  let viewDoc = isset(req.body.viewDoc) ? req.body.viewDoc : "";
  let data = req.body;
  data = data["data[]"];
  let remoteAddress = req.connection.remoteAddress;
  console.log(remoteAddress + ': 処理->セッション編集');
  let connection = await mysql.createConnection(mysql_setting);
  //console.log(req.body);
  //console.log(data);

  let rslt = await querySQL('SELECT * FROM session WHERE id=?', [sessionId]);
  let sesInfo = rslt[0];
  if(rslt){
    if(sesInfo.actor == id){
      //権限あり
      if(title && p && max){
        let update_r = await connection.query('UPDATE session SET session_name = ?, page = ?, viewDoc = ? WHERE id=?', [ title, p, viewDoc, sessionId]);
        let delete_rel = await connection.query('DELETE FROM session_rel WHERE sesId=?', [sessionId]);
        for(let i = 0; i < max; i++){
          if(data[i] != ""){
            let content = data[i];
            content = content;
            let result = await connection.query('INSERT INTO session_rel (sesId, page, content) VALUE (?,?,?)', [sessionId, i+1, content]);
          }
        }
        res.render('blank', {
          title: title,
          content: '編集が完了しました。',
          link: '../'
        });
      }else{
        req.render('blank', {
          title: title,
          content: '値が足りません',
          link: '../'
        });
      }
    }else{
      req.render('blank', {
        title: title,
        content: 'このセッションを編集する権限がありません。',
        link: '../'
      });
    }
  }else{
    req.render('blank', {
      title: title,
      content: 'セッションIDが不正です。',
      link: '../'
    });
  }
});

//削除
router.get('/delete/:ID', isLogined, async function(req, res, next){
  let sessionID = req.params.ID;
  let id = req.session.passport.user;
  let connection = await mysql.createConnection(mysql_setting);

  let sesInfo = await querySQL('SELECT * FROM session WHERE id=?',[sessionID]); sesInfo = sesInfo[0];
  if(sesInfo){
    if(sesInfo.actor == id){
      fs.unlinkSync(__dirname + '/../public/slide/' + sessionID + '.pdf');
      let delete1 = await connection.query('DELETE FROM session WHERE id=?', [sessionID]);
      let delete2 = await connection.query('DELETE FROM session_rel WHERE sesId=?', [sessionID]);
      let delete3 = await connection.query('DELETE FROM bookmark WHERE sesId=?', [sessionID]);
      res.redirect('../');
    }else{
      req.render('blank', {
        title: title,
        content: 'セッションを削除する権限がありません。',
        link: '../'
      });
    }
  }else{
    req.render('blank', {
      title: title,
      content: 'セッションIDが不正です。',
      link: '../'
    });
  }
});

//session
router.get('/session/view/:ID', isLogined, async function(req, res, next){
  let sessionID = req.params.ID;
  let id = req.session.passport.user;
  let remoteAddress = req.connection.remoteAddress;
  let userData = await querySQL('SELECT * FROM account WHERE id=?', [id]); userData = userData[0];
  let sessionData = await querySQL('SELECT * FROM session WHERE id=?', [sessionID]); sessionData = sessionData[0];
  
  console.log(remoteAddress + ': セッション参加->' + sessionID);
  if(sessionData){
    if(sessionData.viewDoc == null) sessionData.viewDoc = "";
    res.render('session/session_view', {
      title: title + ' 参加:' + sessionData.session_name,
      url: sessionData.path,
      viewDoc: encodeURI(sessionData.viewDoc),
      sesId: sessionID,
      uData: userData
    });
  }else{
    console.log(remoteAddress + ': アクセス->セッション参加 存在せず id=' + sessionID);
    res.render('blank', {
      title: title,
      link: '../../',
      content: 'セッションIDが不正です'
    });
  }
});
router.post('/session/actorCheck/:ID', isLogined, async function (req, res, next){
  let sessionID = req.params.ID;
  let actor = await querySQL('SELECT actor FROM session WHERE id=?', [sessionID]); actor = actor[0].actor;
  res.json(actor);
});

router.get('/session/show/:ID', isLogined, async function(req, res, next){
  let sessionID = req.params.ID;
  let id = req.session.passport.user;
  let remoteAddress = req.connection.remoteAddress;
  let userData = await querySQL('SELECT * FROM account WHERE id=?', [id]); userData = userData[0];
  let sessionData = await querySQL('SELECT * FROM session WHERE id=?', [sessionID]); sessionData = sessionData[0];
  if(sessionData){
    if(sessionData.actor == id){
      //権限あり
      if(sessionData.viewDoc == null) sessionData.viewDoc = "";
      console.log(remoteAddress + ': アクセス->セッション開催 id=' + sessionID);
      res.render('session/session_show', {
        title: title + ' 開催:' + sessionData.session_name,
        url: sessionData.path,
        viewDoc: encodeURI(sessionData.viewDoc),
        sesId: sessionID,
        uData: userData
      });
    }else{
      //権限なし
      console.log(remoteAddress + ': アクセス->セッション拒否 id=' + sessionID);
      res.render('blank', {
        title: title,
        link: '../../',
        content: 'このセッションを公開する権限がありません'
      });
    }
  }else{
    console.log(remoteAddress + ': アクセス->セッション開催 存在せず id=' + sessionID);
    res.render('blank', {
      title: title,
      link: '../../',
      content: 'セッションIDが不正です'
    });
  }
});

router.post('/session/viewSorce/:ID', async function(req, res, next){
  let sessionID = req.params.ID;
  let page = isset(req.body.page) ? req.body.page : null;
  if(page != null){
    let result = await querySQL('SELECT * FROM session_rel WHERE sesId=? and page=?', [sessionID, page]);
    let sorceData = result[0];
    if(sorceData){
      res.json(sorceData);
    }else{
      res.json({error: 'データなし'});
    }
  }else{
    res.json({error: '失敗'});
  }
});

//ブックマーク取得
router.post('/session/bookmarkcheck/:ID', async function(req, res, next){
  let sessionId = isset(req.params.ID) ? req.params.ID : null;
  let id = isset(req.session.passport.user) ? req.session.passport.user : null;
  let page = isset(req.body.page) ? req.body.page : null;
  if(sessionId && id && page){
    let connection = mysql.createConnection(mysql_setting);
    let data = await querySQL('SELECT * FROM bookmark WHERE sesId=? and page=? and user=?', [sessionId, page, id]); data = data[0];
    if(data){
      res.json({result: false});
    }else{
      res.json({result: true});
    }
  }else{
    res.json({error: 'データが不足しています'});
  }
});

//ブックマークリスト
router.post('/session/bookmarkList/:ID',isLogined, async function(req, res, next){
  let sessionId = isset(req.params.ID) ? req.params.ID : null;
  let id = req.session.passport.user;
  if(sessionId){
    let data = await querySQL('SELECT * FROM bookmark WHERE sesId=? and user=?', [sessionId, id]);
    res.json(data);
  }else{
    res.json({error: 'データが不足しています'});
  }
});

module.exports = router;

async function isLogined(req, res, next){
  let url = "https://jupiter.tntetsu-lab.cs.kanagawa-it.ac.jp/slidesystem/";

  if(req.session.passport != undefined){
    if(req.session.passport.user != undefined){
      //DB LOOK
      let data = await querySQL('SELECT id FROM account WHERE id=?', [req.session.passport.user]); data = data[0].id;
      if(data){
        next();
      }else{
        res.redirect(url);
      }
    }else{
      res.redirect(url);
    }
  }else{
    res.redirect(url);
  }
}
function isset(data) {
  if (data === "" || data === null || data === undefined) {
    return false;
  } else {
    return true;
  }
};
async function querySQL(sql, data = null){
  //console.log('connection: query');
  let connection = await mysql.createConnection(mysql_setting);
  //console.log('querySQL: connection');
  let result;
  try{
    //console.log(data);
    //console.log('querySQL: try');
    await connection.beginTransaction();
    //console.log('querySQL: beginTransaction');
    if(data){
      const [row] = await connection.query(sql, data);
      result = row;
    }else{
      const [row] = await connection.query(sql);
      result = row;
    }
    //console.log(result);
  }catch(err){
    await connection.rollback();
    console.log(err);
    result = {error: err};
  }finally{
    await connection.end();
    return result;
  }
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
function randomSTR(){
  const S="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const N=16;
  return Array.from(crypto.randomFillSync(new Uint8Array(N))).map((n)=>S[n%S.length]).join('');
}
function trimComment(str) {
	//                  コメント___________________ 文字列リテラル(")_______ 文字列リテラル(')_______ CDATA セクション________ 正規表現リテラル___________________________
	return str.replace(/(\/)(?:\*[\s\S]*?\*\/|\/.*)|"(?:\\[\s\S]|[^\\\n"])*"|'(?:\\[\s\S]|[^\\\n'])*'|<!\[CDATA\[[\s\S]*?\]\]>|\/(?:\\.|\[(?:\\.|[^\n\]])*\]|[^\n/])+\/\w*/g, function($0, $1) {
		return $1 ? '' : $0;
	});
}
