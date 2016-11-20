var poolModule = require('generic-pool');
var redis = require("redis");
var config = require('../config').config;
//redis数据库连接池
var paramObj={name: 'redis',
		    create: function(callback){
					var client = redis.createClient(config.redisPort, config.redisHost, config.redis_options);
					//client.auth("04dedf7ca2054e3d:Dyw123456");
					client.auth("78bbe31182e4f3852faea0c98e905299");
					setTimeout(function(){
						if(client.connected){
							callback(null,client);
						}else{
							callback(new Error('redis 创建链接失败'),null);
						}
					},config.redis_options.connect_timeout);
		    },
		    destroy: function(client) {
		      return client.quit();
		    },
		    max: 100,						//最大链接数
		    idleTimeoutMillis: 30000,  		//空闲超时时间
		    reapIntervalMillis: 2000,  		//检查空闲链接的频率 秒
		    log: true
		}

var redis_pool = poolModule.Pool(paramObj);

module.exports.redis_pool = redis_pool;
