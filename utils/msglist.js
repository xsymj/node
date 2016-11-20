var thrift = require('thrift');
var ttypes = require('../gen-nodejs/ThriftSourceProtocol_types');
// JavaScript Document
/**
 * file:数组操作
 * author:chenxy
 * date:2016-05-25
*/

var __MsgArray__ = [];


//添加到最后一条
exports.push1 = function(msg){
	if(msg !== ""){
		__MsgArray__.push(msg);
		return true;
	}
	else{
		return false;
	}
};
//删除最后一条
exports.pop1 = function(){
	if(__MsgArray__.length > 0){
		__MsgArray__.pop();
		return true;
	}
	else{
		return false;
	}
};
//添加到第一条
exports.unshift1 = function(msg){
	__MsgArray__.unshift(msg);
	return true;
};
//删除第一条
exports.shift1 = function(){
	if(__MsgArray__.length > 0){
		__MsgArray__.shift();
		return true;
	}
	else{
		return false;
	}
};
//删除指定某条,从0开始
exports.remove = function(n){
	n = parseInt(n);
	if(n < 0 && __MsgArray__.length <= 0){
		//如果n<0，则不进行任何操作。
		return false;
	}
	else{
		__MsgArray__ = __MsgArray__.slice(0,n).concat(__MsgArray__.slice(n+1,__MsgArray__.length));
		return true;
	}
};
//获取总条数
exports.getCount = function(){
	return __MsgArray__.length;
};
//获取某一条
exports.getMsgByIndex = function(n){
	n = parseInt(n);
	if(n >= 0 && __MsgArray__.length > n){
		return __MsgArray__[n];
	}
	else{
		return [];
	}
};
//获取数组范围,从0开始
exports.getListByIndex = function(n,m){
	n = parseInt(n);
	m = parseInt(m);
	var eventlist1 = [];
	if(n >= 0 && m > 1){
		if(m >= n){
			if(m < __MsgArray__.length){
				var list = __MsgArray__.slice(n,m);
				__MsgArray__.splice(n,m);
				for (var i = 0; i < list.length; i++) {
     　　    		var myEvent = new ttypes.ThriftFlumeEvent();
					myEvent.headers = {};
					myEvent.body = list[i];
					eventlist1.push(myEvent);
				}
				return eventlist1;
			}
			else{
				var list = __MsgArray__;
				__MsgArray__ = [];
				for (var i = 0; i < list.length; i++) {
     　　    		var myEvent = new ttypes.ThriftFlumeEvent();
					myEvent.headers = {};
					myEvent.body = list[i];
					eventlist1.push(myEvent);
				}
				return eventlist1;
			}
		}
		else{
			return [];
		}
	}
	else{
		return [];
	}
};
//获取数组对象
exports.getAll = function(){
	return __MsgArray__;
};
//module.exports.MsgArrayTool = MsgArrayTool;