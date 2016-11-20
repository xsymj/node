exports.config = {
	webview_url:'h5.tests.dyw365.cn/orderpay.html',//外网//正式h5.dyw365.cn 测试h5.haixiaoshequ.com 开发：60.205.112.227
	host : 'api.haixiaoshequ.com', //内网(现在是外网) //正式api.dyw365.cn 测试api.haixiaoshequ.com
	payurl:'sp.haixiaoshequ.com/Wap/direct/', //内网(现在是外网) //正式sp.dyw365.cn  测试sp.haixiaoshequ.com/Wap/direct/
	java_payurl:'api.tests.dyw365.cn',
	port : 80,
	timeout : 3000,
	java_buy_host:'127.0.0.1',
	java_buy_port:'7011',
	java_sale_host:'127.0.0.1',
	java_sale_port:'7031',
	java_payserver_host:'127.0.0.1',
        java_payserver_port:'7041',
	nginx_url:'127.0.0.1',
	nginx_port:'90',
	singn_key : 'dayuwang',
	buy_program:'/subserver',
	sale_program:'/sales',
	payserver_program:'/payserver',
	ip : '172.16.40.116',
	md5Key : '5d315780c23a5a13ad195ea1344ec387',
	prefix : 'token_',
	//path: '/pay/aliPay/login',
	contentType : 'text/plain; charset=utf-8',
	redisHost : '127.0.0.1', // redis数据库IP //正式测试：04dedf7ca2054e3d.m.cnbja.kvstore.aliyuncs.com
	redisPort : '6379', // redis端口
	redis_options : {
		detect_buffers : true,
		connect_timeout : 3000
	},
	flume_host : '127.0.0.1', 
	flume_port: 44444,
	node_port : 3001,
} 
