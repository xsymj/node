var express = require('express');
var router = express.Router();
var api_general_handlers=require("../handlers/api_general_handlers");
var apiweb_general_handlers=require("../handlers/apiweb_general_handlers");
var apiweb_general_handlers_json=require("../handlers/api_general_handlers_json");
var api_java=require("../handlers/api_java");
var routerweb=require("../handlers/routerweb");
/* POST home page. */
router.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});
router.post('/Api/getway/clientTest',api_general_handlers.post_method_test);
router.post('/Api/getway/client',api_general_handlers.post_method);
router.post('/Api/getway/webClient',apiweb_general_handlers.post_method);
router.get('/Api/getway/routerweb',routerweb.routerweb);
router.post('/Api/getway/javatest',api_java.post_method);
router.post('/Api/getway/clientJson',apiweb_general_handlers_json.post_method);
module.exports = router;
