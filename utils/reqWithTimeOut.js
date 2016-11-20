var http = require('http');

exports.reqWithTimeOut = function(options,timeout,callback){
	var timeoutEventId,
	req = http.request(options,function(res){
		 res.on('end',function(){
            clearTimeout(timeoutEventId);
           // console.log('response end...');
        });
        
        res.on('close',function(){
            clearTimeout(timeoutEventId);
           // console.log('response close...');
        });
        
        res.on('abort',function(){
            console.log('abort...');
        });
        
        callback(res);
	});
	  req.on('timeout',function(e){
        if(req.res){
            req.res('abort');
        }
        req.abort();
    });
    
    
    timeoutEventId=setTimeout(function(){
        req.emit('timeout',{message:'have been timeout...'});
    },timeout);
    
    return req;
}