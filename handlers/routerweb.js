
var http = require("http");
var querystring = require("querystring"); 
var url = require("url");
var crypto = require("crypto");
var redis_pool = require("../utils/connection_pool").redis_pool;
var reqWithTimeOut = require('../utils/reqWithTimeOut').reqWithTimeOut;
var config = require('../config').config;
var common = require('../utils/common');
var nodeuuid = require('node-uuid');
var thrift = require('thrift');
var Flume = require('../gen-nodejs/ThriftSourceProtocol');
var ttypes = require('../gen-nodejs/ThriftSourceProtocol_types');
var thrift_pool = require("../utils/thrift_connection_pool").thrift_pool;
var schedule = require("node-schedule");
var MsgArrayTool  = require("../utils/msglist");
var logger = require('../utils/log').logger; 
function routerweb(request,response){
  var params = request.query.params;
  logger.info(params);
  var obj = JSON.parse(params);
  var token = obj.token;
  var type = obj.type;
  var platform = obj.platform;
  var version = obj.version;
  var api = obj.api;
  var reqkey = obj.reqkey;
  var device = obj.device;
  if (reqkey=="" || reqkey==null) {
    reqkey = nodeuuid.v4();
  }
  var reqip = getRequestIPAddress(request);
  console.log(api);
  console.log(device);
  console.log(version);
  if (type=='webpay') {
    var url = obj.url;
    var url1 = url.toString().split("/");
   // url ="http://"+config.payurl +url;
    // url="http://"+config.java_payurl+""+config.payserver_program+url;
   url="http://"+config.java_payurl+""+config.payserver_program+"/"+url1[1]+"/"+url1[2]+"?op_code="+url1[4]+"&uc_code="+url1[6]+"&pay_method="+url1[8]+"&reqip="+reqip;
   console.log("java_payurl________"+url);
    token = config.prefix+token;
    web_pay(token,response,url);
    addLog("web_getway",version,device,reqkey,api,params);
  }
  if (type=='ydpay') {
    var opcode = obj.opcode;
    var platform = obj.platform;
    var url = "http://"+config.webview_url+"?opcode="+opcode+"&token="+token+"&platform="+platform;
    console.log(url);
    token = config.prefix+token;
    console.log(token);
    web_pay(token,response,url);
    addLog("yd_getway",version,device,reqkey,api,params);
  }
}

function addLog(platform,version,device,reqkey,api,data){
    var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
    logger.info("{'timestap':'"+timestamp+"','platform':'"+platform+"','version':'"+version+"','device':'"+device+"','reqkey':'"+reqkey+"','api':'"+api+"','reqParams':'"+data+"'}");
    MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'"+platform+"','version':'"+version+"','device':'"+device+"','reqkey':'"+reqkey+"','api':'"+api+"','reqParams':'"+data+"'}");
}

function  web_pay(token,response,url){
    redis_pool.acquire(function(err,client){
      if (err) {
        var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());a
        logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
        MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
        resposeData(response,"缓存处理异常","",0,"NONE","-3");
      }
      else{
        client.get(token,function(err,data){
        redis_pool.release(client);
        logger.info(url); 
         if (!err && data!=null) {
            response.location(url);
            response. statusCode=301;
            response.end();  
        }
        else if(data == null){
          var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
          logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'token对应的用户编码为空'}");
          MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'token对应的用户编码为空'}");
          resposeData(response,"token对应的用户编码为空","",0,"NONE","-2");
        }
        else if(err){
          var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
          logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
          MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
          resposeData(response,"缓存处理异常","",0,"NONE","-3");
        }
      });
      }
    });
}

function resposeData(response,msg1,data1,exprie1,type1,status){
  console.log(2);
  var object = {};
  var dataParam = {};
  var cacheParam = {};
  cacheParam.exprie = exprie1;
  cacheParam.type = type1;
  console.log(222);
  object.status = status;
  object.msg=msg1;
  object.data = data1;
  object.cache = cacheParam;
  console.log(JSON.stringify(object));
  response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8'});
  response.write(JSON.stringify(object));
  response.end();
}
function getRequestIPAddress(req){
        return '192.168.1.112';
    }

exports.routerweb = routerweb;
