var crypto = require("crypto");
var config = require('../config').config;
exports.isJson= function(response,data,fname){	
	try{
    	var json_obj =JSON.parse(data);
    	return json_obj;
    }catch(e){
		return false;
    }
}

exports.encrMD5 = function(data,api){
	var md5 = crypto.createHash('md5');
	md5.update(data+config.singn_key+api,'utf8');
	var content = md5.digest('hex');
	return content;
}

exports.format = function(format,date){
var o = {
"M+" : date.getMonth()+1, //month
"d+" : date.getDate(), //day
"h+" : date.getHours(), //hour
"m+" : date.getMinutes(), //minute
"s+" : date.getSeconds(), //second
"q+" : Math.floor((date.getMonth()+3)/3), //quarter
"S" : date.getMilliseconds() //millisecond
}

if(/(y+)/.test(format)) {
format = format.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
}

for(var k in o) {
if(new RegExp("("+ k +")").test(format)) {
format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
}
}
return format;
} 