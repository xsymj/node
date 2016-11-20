var bs = require('../lib/node-beanstalkd')
  , client = new bs.Client();

exports.test = function(){
		client.connect('172.16.40.141:11300', function (err, conn) {
  if(err) {
    console.log('Error connecting to beanstalkd.');
    console.log('Make sure that beanstalkd is running.');
  } else {
    var data = {
      data: {
        name: "node-beanstalkd"
      }
    };
    var priority = 0;
    var delay = 0; // number of seconds delay
    var timeToRun = 1;
    conn.put(priority, delay, timeToRun, JSON.stringify(data), function (err, id) {
      if(err) {
        console.log('Error putting job.');
      } else {
        console.log('Produced Job ' + id);
        console.log('trying:', id + 3);
        conn.reserve(function (err, id, json) {
          if(err) {
            console.log('Error reserving job.');
          } else {
            console.log('Consumed Job ' + id);
            console.log('Job Data: ' + json);
            console.log('Name: ' + JSON.parse(json).data.name);
         /*   conn.destroy(id, function (err) {
              if(err) {
                console.log('Error destroying job.');
              } else {
                console.log('Destroyed Job');
          }
        });*/
      }
    });
  }
});
}
});
client.on('close', function (has_err) {
  if(has_err) {
    console.log('Connection closed with an error.');
  } else {
    console.log('Connection was closed successfully.');
  }
});
}

