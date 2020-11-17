var express = require('express');
var router = express.Router();
var mysql = require('mysql2/promise');
var passport = require('passport');
var bodyParser = require('body-parser');
const crypto = require("crypto");
const bcrypt = require('bcrypt');
//const flash = require('express-flash');
var flash = require('connect-flash');
const e = require('express');
require('date-utils');

//関数
let title = '輪講支援システム';

let mysql_setting = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'slide'
};

/* GET home page. */
router.get('/', isNotLogined ,function(req, res, next) {
  let remoteAddress = req.connection.remoteAddress;
  console.log(remoteAddress + ': アクセス->トップページ');
  if(req.protocol == "http"){
    res.redirect("https://jupiter.tntetsu-lab.cs.kanagawa-it.ac.jp/slidesystem/");
  }
  res.render('index', {
    title: title
  });
});

//DB等初期設定
router.get('/init', async function(req, res, next){
  let remoteAddress = req.connection.remoteAddress;
  let content = '未実装';
  //CREATE TABLE IF NOT EXISTS account (id VARCHAR(256) NOT NULL, name VARCHAR(256) NOT NULL, password VARCHAR(256) NOT NULL, PRIMARY KEY(id), UNIQUE(id))
  //DROP table IF EXISTS session
  //CREATE TABLE IF NOT EXISTS session (id VARCHAR(256) NOT NULL,session_name MEDIUMTEXT NOT NULL, actor VARCHAR(256) NOT NULL, online TINYINT(1) DEFAULT '0' NOT NULL, PRIMARY KEY(id), UNIQUE(id))
  
  //アカウントテーブル
  let row1 = await querySQL('CREATE TABLE IF NOT EXISTS account (id VARCHAR(10) NOT NULL, name VARCHAR(256) NOT NULL,furi VARCHAR(256), password VARCHAR(256) NOT NULL, PRIMARY KEY(id), UNIQUE(id))');
  let row2 = await querySQL("CREATE TABLE IF NOT EXISTS session (id VARCHAR(100) NOT NULL, session_name MEDIUMTEXT NOT NULL, actor VARCHAR(256) NOT NULL,path VARCHAR(256) NOT NULL DEFAULT '/slide/test.pdf', page VARCHAR(256) DEFAULT NULL, viewDoc LONGTEXT NULL, online TINYINT(1) DEFAULT '0' NOT NULL, PRIMARY KEY(id), UNIQUE(id))");
  let row3 = await querySQL('CREATE TABLE IF NOT EXISTS session_rel (id INT(11) NOT NULL AUTO_INCREMENT, sesId VARCHAR(256) NOT NULL, page INT(11) NOT NULL, content LONGTEXT NOT NULL, PRIMARY KEY(id))');
  let row4 = await querySQL('CREATE TABLE IF NOT EXISTS bookmark (id INT(11) NOT NULL AUTO_INCREMENT, sesId VARCHAR(256) NOT NULL, page INT(11) NOT NULL, user VARCHAR(256) NOT NULL, PRIMARY KEY(id))');
  let row5 = await querySQL('CREATE TABLE IF NOT EXISTS joining (id INT(11) NOT NULL AUTO_INCREMENT, sesId longtext NOT NULL, uId INT(11) NOT NULL, PRIMARY KEY(id))');
  //console.log(row1);
  //console.log(row2);
  if(!isset(row1.error)){
    content = 'account テーブルが用意できました.<br>';
  }else{
    content = 'account テーブルの用意に失敗しました.<br>' + row1.error + '<br>';
  }
  if(!isset(row2.error)){
    content += 'session テーブルが用意できました.<br>';
  }else{
    content += 'session テーブルの用意に失敗しました.<br>' + row2.error + '<br>';
  }
  if(!isset(row3.error)){
    content += 'session_rel テーブルが用意できました.<br>';
  }else{
    content += 'session_rel テーブルの用意に失敗しました.<br>' + row3.error + '<br>';
  }
  if(!isset(row4.error)){
    content += 'bookmark テーブルが用意できました.<br>';
  }else{
    content += 'bookmark テーブルの用意に失敗しました.<br>' + row4.error + '<br>';
  }
  if(!isset(row5.error)){
    content += 'joining テーブルが用意できました.<br>';
  }else{
    content += 'joining テーブルの用意に失敗しました.<br>' + row4.error + '<br>';
  }

  res.render('blank', {
    title: title,
    content: content,
    link: './'
  });
  console.log(remoteAddress + ': 処理->初期設定');
});

//登録画面
router.get('/regist', isNotLogined, function(req, res, next){
  let remoteAddress = req.connection.remoteAddress;
  console.log(remoteAddress + ': アクセス->登録画面');
  res.render('regist', {
    title: title + ' 利用者登録'
  });
});

//登録
router.post('/regist', isNotLogined, async function(req, res, next){
  let status ='未処理';
  let content = '未処理';
  let remoteAddress = req.connection.remoteAddress;
  console.log(remoteAddress + ': 処理->登録');
  //console.log(req.body);

  //登録処理
  let id = isset(req.body.id) ? req.body.id : null;
  let password = isset(req.body.password) ? req.body.password : null;
  let password2 = isset(req.body.password2) ? req.body.password2 : null;
  let name = isset(req.body.name) ? escape_html(req.body.name) : null;
  let furi = isset(req.body.furi) ? escape_html(req.body.furi) : null;

  if(id || password || password2 || name || furi){
    if(password == password2){
      let re = new RegExp(/^[0-9]{7}$/);
      let result = re.test(id);
      console.log(result);
      if(result){
        let hash = bcrypt.hashSync(password, 10);
        //console.log(hash);
        let hide_pass = '';
        for(let i = 0; i < password.length; i++){
          hide_pass += '*';
        }
        let row1 = await querySQL('SELECT * FROM account WHERE id=?', [id]);
        //console.log(row1);
          if(!isset(row1.error)){
            if(row1.length == 0){
              let connection = await mysql.createConnection(mysql_setting);
              let row2 = await connection.query('INSERT INTO account (id, name, furi, password) VALUES (?, ?, ?, ?)', [id, name, furi, hash]); 
              //console.log(row2);
              if(!isset(row2.error)){
                status = '登録完了';
                content = '登録が完了しました.<br>';
                content += '<table border="1" class="normal">';
                content += '<tr><th>学籍番号</th><th>名前</th><th>パスワード</th></tr>';
                content += '<tr><td>'+id+'</td><td>'+ name +'</td><td>'+hide_pass+'</td></tr>';
                content += '</table>';
                console.log(remoteAddress + ' STATUS: ' + content);
                res.render('blank', {
                  title: title + status,
                  content: content,
                  link: './'
                });
              }else{
                status = '登録失敗';
              content = 'データベースエラー: ' + row2.error;
              console.log(remoteAddress + ' STATUS: ' + content);
              res.render('blank', {
                title: title + status,
                content: content,
                link: './regist'
              });
              }
            }else{
              status = '登録失敗';
              content = '学籍番号が重複しています。';
              console.log(remoteAddress + ' STATUS: ' + content);
              res.render('blank', {
                title: title + status,
                content: content,
                link: './regist'
              });
            }
          }else{
            status = '登録失敗';
            content = 'データベースエラー: ' + row1.error;
            console.log(remoteAddress + ' STATUS: ' + content);
            res.render('blank', {
              title: title + status,
              content: content,
              link: './regist'
            });
          }
      }else{
        status = '登録失敗';
        content = '学籍番号がフォーマットに一致していません。';
        console.log(remoteAddress + ' STATUS: ' + content);
        res.render('blank', {
          title: title + status,
          content: content,
          link: './regist'
        });
      }
    }else{
      status = '登録失敗';
      content = 'パスワードが一致していません。';
      console.log(remoteAddress + ' STATUS: ' + content);
      res.render('blank', {
        title: title + status,
        content: content,
        link: './regist'
      });
    }
  }else{
    status = '登録失敗';
    content = '値が不足しているため、登録できませんでした。';
    console.log(remoteAddress + ' STATUS: ' + content);
    res.render('blank', {
      title: title + status,
      content: content,
      link: './regist'
    });
  }
  
});

//ログイン画面
router.get('/login', isNotLogined, function(req, res, next){
  let remoteAddress = req.connection.remoteAddress;
  //console.log(message);
  console.log(remoteAddress + ': アクセス->ログイン画面');
  res.render('login', {
    title: title + ' ログイン'
  });
});

router.post('/login', isNotLogined, passport.authenticate('local',
  {
    successRedirect: './users/',
    failureRedirect: './login',
    session: true,
  }
));

module.exports = router;

function isset(data) {
  if (data === "" || data === null || data === undefined) {
    return false;
  } else {
    return true;
  }
};

async function isNotLogined(req, res, next){
  let url = 'https://jupiter.tntetsu-lab.cs.kanagawa-it.ac.jp/slidesystem/users/';
  if(req.session.passport == undefined){
    next();
  }else{
    if(req.session.passport.user == undefined){
      next();
    }else{
      let data = await querySQL('SELECT id FROM account WHERE id=?', [req.session.passport.user]); data = data[0].id;
      console.log(data);
      if(data){
        res.redirect(url);
      }else{
        next();
      }
    }
  }
}

async function querySQL(sql, data = null){
  //console.log('connection: query');
  let connection = await mysql.createConnection(mysql_setting);
  //console.log('querySQL: connection');
  let result;
  try{
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