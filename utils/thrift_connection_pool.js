var poolModule = require('generic-pool');
var thrift = require("thrift");
var config = require('../config').config;
var Flume = require('../gen-nodejs/ThriftSourceProtocol');
//redis数据库连接池
var connection;
var paramObj={name: 'thrift',
		    create: function(callback){
					connection = thrift.createConnection(config.flume_host,config.flume_port,{
       				 transport: thrift.TFramedTransport,
       				 protocol: thrift.TCompactProtocol
				});
				var client = thrift.createClient(Flume, connection);
				callback(null,client);
		    },
		    destroy: function(client) {
		      return connection.end();
		    },
		    max: 100,						//最大链接数
		    idleTimeoutMillis: 3000,  		//空闲超时时间
		    reapIntervalMillis: 2000,  		//检查空闲链接的频率 秒
		    log: false
		}

var thrift_pool = poolModule.Pool(paramObj);

module.exports.thrift_pool = thrift_pool;