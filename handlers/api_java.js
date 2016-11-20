
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

/**
	客户端测试入口
*/
function post_method_test(request, response) {
	
	//test123.test();
	var data = getData(request,response);
	var param = data.split('.');
	if (param[0]=='Bll') {
		if (data) {
			getRedisDataTest(data,response);
			//http_request_post(request,response,data);
		}else{
			resposeData(response,"数据格式出错！","",0,"NONE","-1");
		}
	}else{

	}
}	

/**
	请求PHP接口入口
*/
function post_method(request,response){
	var data = getData(request,response);
	var tokentype = getTokenType(request,response);
	console.log("123123123___"+data);
	if (data&&tokentype) {
		http_request_post(request,response,data,tokentype);
	}else{
		var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
		//sendLog("{'count':'"+request.query.a+"','timestap':'"+timestamp+"','platform':'yd_getway','error':'数据格式出错！'}",response,"",0,"NONE","-1");
		logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'数据格式出错！'}");
		MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'数据格式出错！'}");
		resposeData(response,"{'message':'数据格式出错！'}","",0,"NONE","-1");
	}
}
/**
	请求分发
*/
function http_request_post(request,response,api,tokentype){
	
	var postData = request.body;
	console.log(postData);
	var data2 = postData.data;
			if (tokentype=='2' || tokentype=='4') {
			//有状态请求和注销入口
			console.log('1111'+data2);
			var body = postData.body;
			var token = JSON.parse(body).token;
			getRedisData(token,request,response,api,data2,'API_GETWAY',tokentype);
		}else{
			//登录和无状态请求入口
			var token = "";
			var content = common.encrMD5(data2,api);
			var object = bindData1(api,data2,content,'API_GETWAY');
			var data  = querystring.stringify(object,sep = '&', eq = '=');
			post(request,response,data,tokentype,token);
		}
}

function decodeMD5(postData){
		var obj = {};
		var call = postData.call;
		var body = postData.body;
		var dataObj = JSON.parse(body);
		delete dataObj['hmac'];
		var data = postData.data;
		var data1 = JSON.stringify(dataObj);
		var content = data1+call+data+config.md5Key;
		var md5 = crypto.createHash('md5');
		md5.update(content,'utf8');
		var content1 = md5.digest('hex');
		return content1;
}

function post(request,response,data,tokentype,token){
	 var data123 = getData(request,response);
	 var api = data123.split(".");
	 var path = "/subserver/"+api[3]+"/"+api[4];
	 console.log("zxczxczxc___"+path);
	 console.log("data___________"+data);
	var options = {
			host : '172.16.40.123', // 远端服务器域名
			port : 8081, // 远端服务器端口号
			method : 'POST', // 请求方式
			path : path, // 访问远端服务器地址
			headers : {
				'Connection' : 'keep-alive',
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Content-Length' : data.length,
				'User-Agent' : 'API_GETWAY'
			}
		}; 
	var req = reqWithTimeOut(options,20000,function(res){
		var status = res.statusCode; // 服务器返回的状态码
		var resultStr = ""; // 接收返回结果
		var flag = "";
		res.setEncoding('utf-8');
		res.on('data', function(chunk) { // 开始接收服务器返回数据的事件处理
			resultStr = resultStr + chunk;
		});
		res.on('end', function() { // 接收完服务器返回数据的事件处理
				//console.log(resultStr);
				console.log("123123______________"+resultStr);
				//console.log(json123);
				//var resultObj = common.isJson(response, resultStr, 'general'); // 判断返回结果是否是json格式
				//if (resultObj) { // 返回结果是json格式
				try{
					var json123 = JSON.parse(resultStr);
					if(json123.status!='0'){
						repData(json123.status,response,json123);
					}else{
						if (tokentype=='1') {
							setexRedisData(resultStr,response);
						}
						if (tokentype=='2') {
					  	    setRedisExpire(token,response,json123); 
						}
						if (tokentype == '3') {
						   repData(0,response,json123);
						}
						if (tokentype == '4') {
							delRedisKey(token,response,json123);
					   }
					}
				}
				catch(e){
						//} else {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'服务器返回非json格式'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'服务器返回非json格式'}");
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'服务器返回非json格式'}",response,"",0,"NONE","-2");
					resposeData(response,"服务器返回非json格式","",0,"NONE","-1");
				}	
			});
	});
	req.on('error', function(e) {
		var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
		logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'请求出现异常'}");
		MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'请求出现异常'}");
		//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'请求出现异常'}",response,"",0,"NONE","-1");
		resposeData(response,"请求出现异常","",0,"NONE","-2");
	});
	req.on('timeout', function(e) {
		
	});
	console.log("传给客户端参数:"+data);
	req.write(data + "\n"); 
	req.end();
}
/**	
	返回数据组装
*/
function repData(status,response,data){
	
		var obj = {};
		var cacheParam = {};
		cacheParam.exprie = 0;
		cacheParam.type = "NONE";
		obj.cache = cacheParam;
		obj.msg = data.message;
		obj.status = status;
		obj.data = data.response;
		response.statusCode = 200;
		response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
		response.write(JSON.stringify(obj));
		response.end();
	}

function bindData(func1,params1,client){
		var obj = {};
		//console.log("3",JSON.stringify(params1));
		var params2 = JSON.stringify(params1);
		console.log("6666666"+params2);
		var content = common.encrMD5(params2,func1);
		obj.func = func1;
		obj.method = 'queue';
		obj.params = params2;
		obj.signKey = content;
		obj.info = 'yd_getway';
		obj.sysname = params1.device;
		console.log(JSON.stringify(obj));
		return obj;
	
}

function bindData1(func1,params1,content,client){
	
		var obj = {};
		obj.func = func1;
		obj.method = 'queue';
		obj.params = params1;
		obj.signKey = content;
		obj.info = 'yd_getway';
		obj.sysname = JSON.parse(params1).device;
		console.log("获取params"+JSON.stringify(obj));
		return obj;
}

function  getRedisDataTest(api,response){
		redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
				logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.get(api,function(err,data){
				redis_pool.release(client);
				 if (!err && data!=null) {
					 response.writeHead(200);
					 response.write(data);
					 response.end();
				}
				else{
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
			});
			}
		});
}

function setexRedisData(resultStr,response){
		var token = nodeuuid.v4();
		var obj = isTureData(resultStr);
		console.log("111"+token);
			redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
				logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				console.log("222"+token);
				client.setex(token,3600*24*7,JSON.stringify(obj),function(err,data){
				redis_pool.release(client);
				if (err || data == null) {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
				else if (!err && data!=null) {
					console.log("存入状态"+data);
					var resObj = JSON.parse(resultStr);
					var dataObj = resObj.response;
					dataObj.token = token;
					console.log(typeof dataObj);
					repData(0,response,resObj);
				}
			});
			}
		});
}

function isTureData(resultStr){
	var jsonObj = JSON.parse(resultStr);
	var obj = {};
	var response=jsonObj.response;
	var jsonCode = response.uc_code;
	obj.uc_code = jsonCode;
	//obj.uccode = uccode;
	return obj;	
}

function delRedisKey(token,response,resultObj){

	redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.del(token,function(err,data){
				redis_pool.release(client);
				if (err || data == null) {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
					//resposeData(response,"缓存处理异常","",0,"NONE","-3");
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
				else if (!err && data!=null) {
					repData(0,response,resultObj);
				}
			});
			}
		});
}

function setRedisExpire(token,response,resultObj){
	redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.expire(token,3600*24*7,function(err,data){
				redis_pool.release(client);
				if (err || data == null) {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
					//resposeData(response,"缓存处理异常","",0,"NONE","-3");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
				else if (!err && data!=null) {
					repData(0,response,resultObj);
				}
			});
			}
		});
}

function  getRedisData(token,request,response,api,params,client1,tokentype){
		redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.get(token,function(err,data){
				redis_pool.release(client);	
				 if (!err && data!=null) {
					var obj = JSON.parse(params);
					var jsonData = JSON.parse(data);
					obj.uc_code = jsonData.uc_code;	
					/*console.log("获取redis数据"+data);
					var object = bindData(api,obj,client1);*/
					var data1  = querystring.stringify(obj,sep = '&', eq = '=');
					post(request,response,data1,tokentype,token);
				}
				else if(data == null){
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'token为空'}",response,"",0,"NONE","-2");
					resposeData(response,"token为空","",0,"NONE","-2");
				}
				else if(err){
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
					//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
			});
			}
		});
}


function getData(request,response){
	try{
		var postData = request.body; 
		var call = postData.call;
		var api = JSON.parse(call).api;
		console.log(api);
		return api;
	}
	catch(e){
		console.log("解析客户端json数据出错："+e);
		return false;
	}
}

function getTokenType(request,response){
	try{
		var postData = request.body;
		var bodydata = postData.body;
		var tokentype = JSON.parse(bodydata).tokentype;
		console.log(tokentype);
		return tokentype;
	}
	catch(e){
		console.log("解析客户端json数据出错："+e);
		return false;
	}
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
	response.writeHead(200);
	response.write(JSON.stringify(object));
	response.end();
}

function sendLog(message,response,data1,exprie1,type1,status){
	var myEvent = new ttypes.ThriftFlumeEvent();
	myEvent.headers = {};
	myEvent.body = message;
	thrift_pool.acquire(function(err,client){
			if (err) {
				resposeData(response,"日志处理异常","",0,"NONE","-1");
			}
			else{
				client.append(myEvent, function(err,data) {
         		 thrift_pool.release(client);
					if (err) {
   							 resposeData(response,"日志处理异常","",0,"NONE","-1");
 					 } else {
    					console.log(data);
    					resposeData(response,message,data1,exprie1,type1,status);
  				}
		});
}
});
}

exports.post_method = post_method;

