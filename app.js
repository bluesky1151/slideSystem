var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('passport');
//var mysql = require('mysql');
let mysql = require('mysql2/promise');
let crypto = require("crypto");
const LocalStrategy = require('passport-local').Strategy;
var session = require('express-session'); // 追加
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

//設定読み込み
let sqlSetting = require("./mysql");
let mysql_setting = sqlSetting;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'hirashi' }));
app.use(passport.initialize()); //Expressを使用している場合はInitializeが必要
app.use(passport.session());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

passport.serializeUser(function (user, done) {
  //console.log('SESSION ADD: ' + user);
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  //console.log('SESSION DEL: ' + user);
  done(null, user);
});

//パスワード処理
passport.use(new LocalStrategy({
  userNameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async function (req, username, password, done) {
  process.nextTick(async function () {
    //console.log('社員番号: ' + username);
    //console.log('パスワード: ' + password);
    if(username == '') return done(null, false, {message: '学籍番号の入力は必須です。' });
    if(password == '') return done(null, false, {message: 'パスワードの入力は必須です。'});

    let row = await querySQL('SELECT * FROM account WHERE id=?', [username]);
    //console.log(row);
    if(!isset(row.error)){
      if(row.length > 0){
        result = row[0];
        if(bcrypt.compareSync(password, result.password)){
          console.log('LOGIN: ' + username);
          return done(null, username);
        }else return done(null, false, {message: 'パスワードが正しくありません'});
      }else return done(null, false, {message: '学籍番号が存在しません。'});
    }else return done(null, false, {message: 'データベースエラー'});
/*
    let connection = mysql.createConnection(mysql_setting);
    connection.connect();
    connection.query('SELECT * FROM account WHERE id=?', [username], (error, result, fields)=>{
      if(error == null){
        //console.log(result);
        if(result.length > 0){
          result = result[0];
          if(bcrypt.compareSync(password, result.password)){
            console.log('LOGIN: ' + username);
            return done(null, username);
          }else return done(null, false, {message: 'パスワードが正しくありません'});
        }else return done(null, false, {message: '学籍番号が存在しません。'});
      }else return done(null, false, {message: 'データベースエラー'});
    });
*/
  });
}));

module.exports = app;
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
function isset(data) {
  if (data === "" || data === null || data === undefined) {
    return false;
  } else {
    return true;
  }
};