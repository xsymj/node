var http = require("http");
var querystring = require("querystring"); 
var url = require("url");
var crypto = require("crypto");
var redis_pool = require("../utils/connection_pool").redis_pool;
var reqWithTimeOut = require('../utils/reqWithTimeOut').reqWithTimeOut;
var config = require('../config').config;
var common = require('../utils/common');
var nodeuuid = require('node-uuid');
var MsgArrayTool  = require("../utils/msglist");
var logger = require('../utils/log').logger; 
process.on('uncaughtException', function (err) {
	//var timestamp=new Date().getTime();
	//logger.info("{'timestap':'"+timestamp+"','error':'出现错误'}");
	console.log(err);
});

/**
	请求PHP接口入口
*/
function post_method(request,response){
	var data = getData(request);
	var tokentype = getTokenType(request,response);
	if (data&&tokentype) {
		if(data=='getArea'){
			var city = areaType(request);
			if (city==null || city=='') {
				getRedisProvince(response);
			}else{
				getRedisCity(city,response);
			}
		}else{
			http_request_post(request,response,data,tokentype);
		}
		
	}else{
		var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
		logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'数据格式出错！'}");
		MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'数据格式出错！'}");
		resposeData(response,"数据格式出错！","",0,"NONE","-1");
	}
}

function areaType(request){
	var postData = request.body;
	var city = postData.data.city;
	return city;
}
/**
	请求分发
*/
function http_request_post(request,response,api,tokentype){
			var postData = request.body;
			var data2 = postData.data;
	//var hmac = JSON.parse(postData.body).hmac;
	//var md5 = decodeMD5(postData);
	//console.log(md5);
	//if (md5 == hmac) {
			if (tokentype=='2' || tokentype=='4') {
			//有状态请求和注销入口
				var body = postData.body;
				console.log(typeof body);
				var token = body.token;
				token = config.prefix+token;
				console.log(token);
				if (tokentype=='4') {
					delRedisKey(token,response,"");
				}
				else{
					getRedisData(token,request,response,api,data2,'API_GETWAY',tokentype);
				}
		}else{
			//登录和无状态请求入口
			var token = "";
			console.log(data2);
			console.log(JSON.stringify(data2));
			var content = common.encrMD5(JSON.stringify(data2),api);
			console.log(content);
			var object = bindData1(api,data2,content,'API_GETWAY',response);
			var data  = querystring.stringify(object,sep = '&', eq = '=');
			post1(request,response,data,tokentype,token,'');
		}	
}  


function post1(request,response,data,tokentype,token,obj){
	var body = request.body; 
	var call = body.call;
	var api = call.api;
	console.log("api__"+api);
	getRedisApi(request,response,data,tokentype,token,api,obj);
}

/*function decodeMD5(postData){
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
}*/

function post(request,response,data,tokentype,token,options){
	console.log("options_______"+options);
	if (options=='') {
	var options = {
			host : config.host, // 远端服务器域名
			port : config.port, // 远端服务器端口号
			method : 'POST', // 请求方式
			//path : config.path, // 访问远端服务器地址
			headers : {
				'Connection' : 'keep-alive',
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Content-Length' : data.length,
				'User-Agent' : 'API_GETWAY'
			}
		}; 
	}
	var req = reqWithTimeOut(options,20000,function(res){
		var status = res.statusCode; // 服务器返回的状态码
		var resultStr = ""; // 接收返回结果
		var flag = "";
		res.setEncoding('utf-8');
		res.on('data', function(chunk) { // 开始接收服务器返回数据的事件处理
			resultStr = resultStr + chunk;
		});
		res.on('end', function() { // 接收完服务器返回数据的事件处理
				console.log("服务端返回的数据："+resultStr);
					if (resultStr==null || resultStr =='') {
						var obj = {};
						obj.reqkey='error';
						obj.response ='';
						obj.status = '6';
						resultStr = JSON.stringify(obj);
					}
					var jsonObject = JSON.parse(resultStr);
					if (jsonObject.reqkey==null || jsonObject.reqkey=='') {
						var str = repParams(jsonObject,"");
						logger.info(str);
						MsgArrayTool.push1(str);
					}else{
						var str = repParams(jsonObject,jsonObject.reqkey);
						logger.info(str);
						MsgArrayTool.push1(str);
					}
				try{
					var json123 = JSON.parse(resultStr);
					if(json123.status!='0'){
						if (Number(json123.status)<1000) {
							repData(json123.status,response,json123,'连接超时，请稍后再试');
						}else{
							repData(json123.status,response,json123,json123.message);
						}
					}else{
						if (tokentype=='1') {
							setexRedisData(resultStr,response);
						}
						if (tokentype=='2') {
					  	    setRedisExpire(token,response,json123); 
						}
						if (tokentype == '3') {
						   repData(0,response,json123,'ok');
						}
						if (tokentype == '4') {
							delRedisKey(token,response,json123);
					   }
					}
				}
				catch(e){
					//} else {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'服务器返回非json格式'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'服务器返回非json格式'}");
					resposeData(response,"服务器返回非json格式","",0,"NONE","-1");
				//}
				}	
				
			}); 
	});
	req.on('error', function(e) {
		var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
		logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'请求出现异常'}");
		MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'请求出现异常'}");
		resposeData(response,"请求出现异常","",0,"NONE","-4");
	});
	req.on('timeout', function(e) {
		
	});
	console.log("传给客户端参数:"+data);
	req.write(data); 
	req.end();
}

function repParams(jsonObject,reqkey){
	var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
		var reqObject = {};
		reqObject.timestap=timestamp;
		reqObject.platform="web_getway";
		reqObject.reqkey=reqkey;
		reqObject.callType = "rep";
	    reqObject.resParams=jsonObject;
	    return JSON.stringify(reqObject);
}

/**	
	返回数据组装
*/
function repData(status,response,data,message){
		var obj = {};
		var cacheParam = {};
		cacheParam.exprie = 0;
		cacheParam.type = "NONE";
		obj.cache = cacheParam;
		obj.msg = "ok";
		obj.message = message;
		obj.status = status;
		if (data=="" || data==null) {
			obj.data = "";
			obj.reqkey = "";
		}else{
			obj.data = data.response;
			obj.reqkey = data.reqkey;
		}
		response.statusCode = 200;
		response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
		response.write(JSON.stringify(obj));
		response.end();
}

function bindData(func1,params1,client,response){
		var obj = {};
	//console.log("3",JSON.stringify(params1));
		var params2 = JSON.stringify(params1);
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

function bindData1(func1,params1,content,client,response){
		var obj = {};
		obj.func = func1;
		obj.method = 'queue';
		obj.params = JSON.stringify(params1);
		obj.signKey = content;
		obj.info = 'yd_getway';
		obj.sysname = params1.device;
		console.log("获取params"+JSON.stringify(obj));
		return obj;
}

/*function  getRedisDataTest(api,response){
	    console.log(111);
		redis_pool.acquire(function(err,client){
			if (err) {
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
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
			});
			}
		});
}
*/
function setexRedisData(resultStr,response){
		var value = nodeuuid.v4();
		var token = config.prefix+value;
		var obj = isTureData(resultStr);
		console.log("111"+token);
			redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				console.log("222"+token);
				client.setex(token,3600*24*7,JSON.stringify(obj),function(err,data){
				redis_pool.release(client);
				if (err || data == null) {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
				else if (!err && data!=null) {
					console.log("存入状态"+data);
					var resObj = JSON.parse(resultStr);
					var dataObj = resObj.response;
					dataObj.token = value;
					console.log(typeof dataObj);
					repData(0,response,resObj,'ok');
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
				logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.del(token,function(err,data){
				redis_pool.release(client);
				if (err || data == null) {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
				else if (!err && data!=null) {
					repData(0,response,resultObj,'ok');
				}
			});
			}
		});
}

function setRedisExpire(token,response,resultObj){
	redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.expire(token,3600*24*7,function(err,data){
				redis_pool.release(client);
				if (err || data == null) {
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
					resposeData(response,"缓存处理异常","",0,"NONE","-3");
				}
				else if (!err && data!=null) {
					repData(0,response,resultObj,'ok');
				}
			});
			}
		});
}


function  getRedisApi(request,response,postData,tokentype,token,api,obj){
		redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}");
				//sendLog("{'timestap':'"+timestamp+"','platform':'yd_getway','error':'缓存处理异常'}",response,"",0,"NONE","-3");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.hmget('java_api',api,function(err,data){
				redis_pool.release(client);	
				 if (!err && data!=null) {
					if (data==null || data=='') {
						console.log(111);
						post(request,response,postData,tokentype,token,'');
					}else{
						console.log("data"+data);
						var postData1;
						var reqip = getRequestIPAddress(request);
						if (tokentype=='1'||tokentype=='3') {
							var body = request.body;
							var data1 = body.data;
							data1.reqip = reqip;
							 postData1  = querystring.stringify(data1,sep = '&', eq = '=');
						}else{
							var body = request.body;
							var data1 = body.data;
							data1.uc_code = obj.uc_code;
							if (obj.hasOwnProperty('cuc_code')) {
								data1.cuc_code = obj.cuc_code;
							}
							if (obj.hasOwnProperty('sc_code')) {
								data1.sc_code = obj.sc_code;
							}
							if (data1.hasOwnProperty("info")) {
								data1.info = JSON.stringify(data1.info);
							}
							data1.reqip = reqip;
						    postData1  = querystring.stringify(data1,sep = '&', eq = '=');
						}
						console.log("postData1"+postData1);
						var url = data.toString().split("/");
						console.log("buy____________"+url);
						if (url[1]=="app") {

							console.log("buy____________");
							var options = {
								host : config.nginx_url, // 远端服务器域名
								port : config.nginx_port, // 远端服务器端口号
								method : 'POST', // 请求方式
								path : config.buy_program+data+"", // 访问远端服务器地址
								headers : {
									'Connection' : 'keep-alive',
									'Content-Type' : 'application/x-www-form-urlencoded',
									'User-Agent' : 'API_GETWAY'
								}
							};
						}else{
							console.log("sales____________");
							var options = {
								host : config.nginx_url, // 远端服务器域名
								port : config.nginx_port, // 远端服务器端口号
								method : 'POST', // 请求方式
								path : config.sale_program+data+"", // 访问远端服务器地址
								headers : {
									'Connection' : 'keep-alive',
									'Content-Type' : 'application/x-www-form-urlencoded',
									'User-Agent' : 'API_GETWAY'
								}
							};
						}
					post(request,response,postData1.trim(),tokentype,token,options);
					}
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


function  getRedisData(token,request,response,api,params,client1,tokentype){
		redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.get(token,function(err,data){
				redis_pool.release(client);	
				 if (!err && data!=null) {
					var obj = params;
					var jsonData = JSON.parse(data);
					obj.uc_code = jsonData.uc_code;	
					console.log("获取redis数据"+data);
					var object = bindData(api,obj,client1,response);
					var data1  = querystring.stringify(object,sep = '&', eq = '=');
					post1(request,response,data1,tokentype,token,obj);
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

  function  getRedisProvince(response){
		redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.get("province",function(err,data){
				redis_pool.release(client);	
				 if (!err && data!=null) {
					resposeData(response,"ok",data,0,"NONE","0");
				}
				else if(data == null){
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'token对应的用户编码为空'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'token对应的用户编码为空'}");
					resposeData(response,"缓存数据为空","",0,"NONE","-2");
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


function  getRedisCity(city,response){
		redis_pool.acquire(function(err,client){
			if (err) {
				var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
				logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'缓存处理异常'}");
				resposeData(response,"缓存处理异常","",0,"NONE","-3");
			}
			else{
				client.hmget('city',city,function(err,data){
				redis_pool.release(client);	
				 if (!err && data!=null) {
					resposeData(response,"ok",data,0,"NONE","0");
				}
				else if(data == null){
					var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
					logger.info("{'timestap':'"+timestamp+"','platform':'web_getway','error':'token对应的用户编码为空'}");
					MsgArrayTool.push1("{'timestap':'"+timestamp+"','platform':'web_getway','error':'token对应的用户编码为空'}");
					resposeData(response,"缓存数据为空","",0,"NONE","-2");
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

function getData(request){
	try{
		var reqkey;
		var postData = request.body;
		console.log(postData);
		var call = postData.call;
		var api = call.api;
		var data = postData.data;
		var body = postData.body;
		var reqip = getRequestIPAddress(request);
		if (data.hasOwnProperty('reqkey')) {
			reqkey = data.reqkey;
		}else{
			reqkey = nodeuuid.v4();
		}
		var device = postData.body.device;
		var version = postData.body.version;
		if (body.hasOwnProperty('token')) {
		var token = body.token;
		}else{
		var	token = "";
		}
		var logStr = reqParams(version,device,reqkey,api,postData,token,reqip);
		logger.info(logStr);
		MsgArrayTool.push1(logStr);
		return api;
	}
	catch(e){
		console.log("解析客户端json数据出错："+e);
		return false;
	}
}

function reqParams(version,device,reqkey,api,postData,token,reqip){
	var timestamp=common.format("yyyy-MM-dd hh:mm:ss",new Date());
	var reqObject = {};
	reqObject.timestap = timestamp;
	reqObject.platform = "web_getway";
	reqObject.version = version;
	reqObject.device = device;
	reqObject.reqkey = reqkey;
	reqObject.api = api;
	reqObject.token = token;
	reqObject.callType = "req";
	reqObject.reqParams = postData;
	reqObject.reqip = reqip;
	return JSON.stringify(reqObject);
}


function getTokenType(request,response){
	try{
		var postData = request.body;
		//var bodydata = postData.body;
		var tokentype = postData.body.tokentype;
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

function getRequestIPAddress(req){
        return req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    }

exports.post_method = post_method;
