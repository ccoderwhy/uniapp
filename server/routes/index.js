var express = require('express');
var router = express.Router();
var connection = require('../db/sql.js');
var user = require('../db/UserSql.js');
var jwt_decode = require('jwt-decode');

//验证码
let code = '';
//接入短信的sdk
var QcloudSms = require("qcloudsms_js");

router.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  //Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'application/json;charset=utf-8');
  next();
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//加入购物车
router.post('/api/addCart', function(req, res, next) {
	let token = req.headers.token;
	let phone = jwt_decode(token);
	//商品id
	let goods_id = req.body.goods_id;
	//用户输入的商品数量
	let num = req.body.num;
	connection.query(`select * from user where phone = ${phone.name}`, function (error, results, fields) {
		//当前用户id
		let userId = results[0].id;
		connection.query(`select * from goods_search where id = ${goods_id}`, function (err, result) {
			let name = result[0].name;
			let imgUrl = result[0].imgUrl;
			let pprice = result[0].pprice;
			//查询当前用户之前是否添加过这个商品
			connection.query(`select * from goods_cart where uId = ${userId} and goods_id = ${goods_id}`, function (err, data) {
				if( data.length > 0){
					//如果当前用户已经添加过本商品,就让数量增加
					connection.query(`update goods_cart set num = replace(num,${data[0].num},${ parseInt(num) + parseInt(data[0].num) }) where id = ${data[0].id}`, function (e, r) {
						res.json({
							data:{
								success:"加入成功"
							}
						})
					})
				}else{
					//如果当前用户之前没有加入过本商品,需要添加进入
					connection.query('insert into goods_cart (uId,goods_id,name,imgUrl,pprice,num) values ("'+userId+'","'+goods_id+'","'+name+'","'+imgUrl+'","'+pprice+'","'+num+'")', function (err, data) {
						res.json({
							data:{
								success:"加入成功"
							}
						})
					})
				}
			})
		})
	})
})

//1. 当前用户
//2. 当前用户--->哪一个商品的数量发展变化  [查询]   原来的数量
//3. 替换 ===> 把前端给的值拿过来, 把原来数量替换掉
//修改当前用户购物车商品数量
router.post('/api/updateNumCart', function(req, res, next) {
	let token = req.headers.token;
	let phone = jwt_decode(token);
	//商品id
	let goodsId = req.body.goodsId;
	//用户输入的商品数量
	let num = req.body.num;
	connection.query(`select * from user where phone = ${phone.name}`, function (error, results, fields) {
		//当前用户id
		let userId = results[0].id;
		connection.query(`select * from goods_cart where uId = ${userId} and goods_id = ${goodsId}`, function (err, result) {
			//数据中当前的数量
			let goods_num = result[0].num;
			//当前的id号
			let id = result[0].id;
			//修改[替换]
			connection.query(`update goods_cart set num = replace(num,${goods_num},${num}) where id = ${id}`, function (e, r) {
				res.json({
					data:{
						success:true
					}
				})
			})
		})
	})
})

//获取当前用户购物车列表
router.post('/api/selectCart', function(req, res, next) {
	let token = req.headers.token;
	let phone = jwt_decode(token);
	connection.query(`select * from user where phone = ${phone.name}`, function (error, results, fields) {
		//当前用户id
		let userId = results[0].id;
		console.log( userId )
		connection.query(`select * from goods_cart where uId = ${userId}`, function (err, result) {
			res.json({
				data:result
			})
		})
	})
})

//当前用户修改收货地址
router.post('/api/updateAddress', function(req, res, next) {
	let token = req.headers.token;
	let phone = jwt_decode(token);
	let name = req.body.name;
	let tel = req.body.tel;
	let province = req.body.province;
	let city = req.body.city;
	let district = req.body.district;
	let address = req.body.address;
	let isDefault = req.body.isDefault;
	let id = req.body.id;
	
	//获取userId
	connection.query(`select * from user where phone = ${phone.name}`, function (error, results, fields) {
		let userId = results[0].id;
		connection.query(`select * from address where userId = ${userId} and isDefault = ${isDefault}`, function (err, result) {
			let childId = result[0].id;
			connection.query(`update address set isDefault = replace(isDefault,"1","0") where id = ${childId}`, function (e, r) {
				let updateSql = `update address set name = ?,tel = ?,province = ?,city = ?,district = ?,address = ?,isDefault = ?,userId = ? where id = ${id}`
				connection.query(updateSql,[name,tel,province,city,district,address,isDefault,userId],function (err, result) {
					res.send({
						data:{
							success:'成功'
						}
					})
				})
			})
		})
	})
})

//当前用户新增收货地址
router.post('/api/addAddress', function(req, res, next) {
	
	let token = req.headers.token;
	let phone = jwt_decode(token);
	let name = req.body.name;
	let tel = req.body.tel;
	let province = req.body.province;
	let city = req.body.city;
	let district = req.body.district;
	let address = req.body.address;
	let isDefault = req.body.isDefault;
	
	connection.query(`select * from user where phone = ${phone.name}`, function (error, results, fields) {
		let id = results[0].id;
		let sqlInert = 'insert into address (name,tel,province,city,district,address,isDefault,userId) values ("'+name+'","'+tel+'","'+province+'","'+city+'","'+district+'","'+address+'","'+isDefault+'","'+id+'")';
		connection.query(sqlInert, function (err, result, field) {
			res.send({
				data:{
					success:"成功"
				}
			})
		})
	})
})

//当前用户查询收货地址
router.post('/api/selectAddress', function(req, res, next) {
	
	let token = req.headers.token;
	let phone = jwt_decode(token);
	
	connection.query(`select * from user where phone = ${phone.name}`, function (error, results, fields) {
		let id = results[0].id;
		connection.query(`select * from address where userId = ${id}`, function (err, result, field) {
			res.send({
				data:result
			})
		})
	})
})

//第三发登录
router.post('/api/loginother', function(req, res, next) {
	//前端给后端的数据
	let params = {
		provider:req.body.provider,//登录方式
		openid:req.body.openid,//用户身份id
		nickName:req.body.nickName,//用户昵称
		avatarUrl:req.body.avatarUrl//用户头像
	};
	//查询数据库中有没有此用户
	connection.query( user.queryUserName( params ) , function (error, results, fields) {
		if( results.length > 0){
			//数据库中存在      : 读取
			connection.query( user.queryUserName( params ) , function (e, r) {
				res.send({
					data:r[0]
				})
			})
		}else{
			//数据库中[不]存在  : 存储 ==>读取
			connection.query( user.insertData( params ) , function (er, result) {
				connection.query( user.queryUserName( params ) , function (e, r) {
					res.send({
						data:r[0]
					})
				})
			})
		}
	})
	
})

//注册===>增加一条数据
router.post('/api/addUser', function(req, res, next) {
	//前端给后端的数据
	let params = {
		userName : req.body.userName,
		userCode : req.body.code
	};
	if(  params.userCode == code   ){
		connection.query( user.insertData( params ) , function (error, results, fields) {
			connection.query( user.queryUserName( params ) , function (err, result) {
				res.send({
					data:{
						success:true,
						msg:"注册成功",
						data:result[0]
					}
				})
			})
		})
	}
	
})

//发送验证码
router.post('/api/code', function(req, res, next) {
	//前端给后端的数据
	let params = {
		userName : req.body.userName
	};
	// 短信应用 SDK AppID
	var appid = 1400187558;  // SDK AppID 以1400开头
	// 短信应用 SDK AppKey
	var appkey = "dc9dc3391896235ddc2325685047edc7";
	// 需要发送短信的手机号码
	var phoneNumbers = [params.userName];
	// 短信模板 ID，需要在短信控制台中申请
	var templateId = 298000;  // NOTE: 这里的模板ID`7839`只是示例，真实的模板 ID 需要在短信控制台中申请
	// 签名
	var smsSign = "三人行慕课";  // NOTE: 签名参数使用的是`签名内容`，而不是`签名ID`。这里的签名"腾讯云"只是示例，真实的签名需要在短信控制台申请
	// 实例化 QcloudSms
	var qcloudsms = QcloudSms(appid, appkey);
	// 设置请求回调处理, 这里只是演示，用户需要自定义相应处理回调
	function callback(err, ress, resData) {
	  if (err) {
	      console.log("err: ", err);
	  } else {
		  code = ress.req.body.params[0];
	      res.send({
			  data:{
				  success:true,
				  code:code
			  }
		  })
	  }
	}
	var ssender = qcloudsms.SmsSingleSender();
	var paramss = [  Math.floor( Math.random()*(9999-1000))+1000 ];//发送的验证码
	ssender.sendWithParam("86", phoneNumbers[0], templateId,
	paramss, smsSign, "", "", callback); 
	
})

//注册验证手机号是否存在
router.post('/api/registered', function(req, res, next) {
	
	//前端给后端的数据
	let params = {
		userName : req.body.phone
	};
	//查询手机号是否存在
	connection.query( user.queryUserName( params ) , function (error, results, fields) {
		if( results.length > 0 ){
			res.send({
				data:{
					success:false,
					msg:"手机号已经存在"
				}
			})
		}else{
			res.send({
				data:{
					success:true
				}
			})
		}
	})
	
})
//用户登录
router.post('/api/login', function(req, res, next) {
	
	//前端给后端的数据
	let params = {
		userName : req.body.userName,
		userPwd  : req.body.userPwd
	}
	//查询用户名或者手机号存在不存在
	 connection.query( user.queryUserName( params ) , function (error, results, fields) {
		if( results.length > 0 ){
			 connection.query( user.queryUserPwd( params ) , function (err, result) {
				 if(  result.length > 0 ){
					 res.send({
					 	data:{
					 		success:true,
					 		msg:"登录成功",
							data:result[0]
					 	}
					 })
				 }else{
					 res.send({
						data:{
							success:false,
							msg:"密码不正确"
						}
					 })
				 }
			 })
		}else{
			res.send({
				data:{
					success:false,
					msg:"用户名或手机号不存在"
				}
			})
		}
	 })
});


router.get('/api/goods/id', function(req, res, next) {
  let id = req.query.id;
  connection.query("select * from goods_search where id="+id+"", function (error, results, fields) {
    if (error) throw error;
    res.send({
  	  code:"0",
  	  data:results
    })
  });
});



router.get('/api/goods/list', function(req, res, next) {
   res.json({
	   code:0,
	   data:[
		   {
			   id:1,
			   name:"家居家纺",
			   data:[
				   {
					   name:"家纺",
					   list:[
						   {
							   id:1,
							   name:"毛巾/浴巾",
							   imgUrl:"../../static/img/list1.jpg"
						   },
						   {
							   id:2,
							   name:"枕头",
							   imgUrl:"../../static/img/list1.jpg"
						   }
					   ]
				   },
				   {
					   name:"生活用品",
					   list:[
						   {
							   id:1,
							   name:"浴室用品",
							   imgUrl:"../../static/img/list1.jpg"
						   },
						   {
							   id:2,
							   name:"洗晒",
							   imgUrl:"../../static/img/list1.jpg"
						   }
					   ]
				   }
			   ]
		   },
		   {
			   id:2,
			   name:"女装",
			   data:[
				   {
					   name:"裙装",
					   list:[
						   {
							   id:1,
							   name:"半身裙",
							   imgUrl:"../../static/img/list1.jpg"
						   },
						   {
							   id:2,
							   name:"连衣裙",
							   imgUrl:"../../static/img/list1.jpg"
						   }
					   ]
				   },
				   {
					   name:"上衣",
					   list:[
						   {
							   id:1,
							   name:"T恤",
							   imgUrl:"../../static/img/list1.jpg"
						   },
						   {
							   id:2,
							   name:"衬衫",
							   imgUrl:"../../static/img/list1.jpg"
						   }
					   ]
				   }
			   ]
		   }
	   ]
   })
});



router.get("/api/goods/search",function(req, res, next) {
	//desc降序     asc升序
	//获取对象的key
	let [goodsName,orderName] = Object.keys(req.query);
	//name参数的值
	let name = req.query.name;
	//orderName的key的值
	let order = req.query[orderName];
	
	connection.query("select * from goods_search where name like '%"+name+"%' order by "+orderName+" "+order+"", function (error, results, fields) {
	  if (error) throw error;
	  res.send({
		  code:"0",
		  data:results
	  })
	});
	
});



//首次第一次触底的数据
router.get('/api/index_list/1/data/2', function(req, res, next) {
	res.json({
		code:"0",
		data:[
			{
				type:"commodityList",
				data:[
					{
						id:1,
						imgUrl:"../../static/img/commodity1.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:2,
						imgUrl:"../../static/img/commodity2.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:3,
						imgUrl:"../../static/img/commodity3.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:4,
						imgUrl:"../../static/img/commodity4.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					}
				]
			}
		]
	})
})
//运动户外第二次触底的数据
router.get('/api/index_list/2/data/3', function(req, res, next) {
	res.json({
		code:"0",
		data:[
			{
				type:"commodityList",
				data:[
					{
						id:1,
						imgUrl:"../../static/img/commodity1.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:2,
						imgUrl:"../../static/img/commodity2.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:3,
						imgUrl:"../../static/img/commodity3.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:4,
						imgUrl:"../../static/img/commodity4.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					}
				]
			}
		]
	})
})
//运动户外第一次触底的数据
router.get('/api/index_list/2/data/2', function(req, res, next) {
	res.json({
		code:"0",
		data:[
			{
				type:"commodityList",
				data:[
					{
						id:1,
						imgUrl:"../../static/img/commodity1.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:2,
						imgUrl:"../../static/img/commodity2.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:3,
						imgUrl:"../../static/img/commodity3.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					},
					{
						id:4,
						imgUrl:"../../static/img/commodity4.jpg",
						name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						pprice:"299",
						oprice:"659",
						discount:"5.2"
					}
				]
			}
		]
	})
})
//运动户外第一次加载的数据
router.get('/api/index_list/2/data/1', function(req, res, next) {
  res.json({
	  code:"0",
	  data:[
		  {
			  type:"bannerList",
			  imgUrl:"../../static/img/banner1.jpg"
		  },
		  {
			  type:"iconsList",
			  data:[
				  {imgUrl:"../../static/img/icons1.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons2.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons3.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons4.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons5.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons6.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons7.png",name:"运动户外"},
				  {imgUrl:"../../static/img/icons8.png",name:"运动户外"}
			  ]
		  },
		  {
			  type:"hotList",
			  data:[
				  {
				  	id:1,
				  	imgUrl:"../../static/img/hot1.jpg",
				  	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
				  	pprice:"299",
				  	oprice:"659",
				  	discount:"5.2"
				  },
				  {
				  	id:2,
				  	imgUrl:"../../static/img/hot2.jpg",
				  	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
				  	pprice:"299",
				  	oprice:"659",
				  	discount:"5.2"
				  },
				  {
				  	id:3,
				  	imgUrl:"../../static/img/hot3.jpg",
				  	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
				  	pprice:"299",
				  	oprice:"659",
				  	discount:"5.2"
				  }
			  ]
		  },
		  {
			  type:"shopList",
			  data:[
				  {
					  bigUrl:"../../static/img/shop.jpg",
					  data:[
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 }
					  ]
				  },
				  {
					  bigUrl:"../../static/img/shop.jpg",
					  data:[
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 }
					  ]
				  }				  
			  ]
		  },
		  {
		  	type:"commodityList",
		  	data:[
		  		{
		  			id:1,
		  			imgUrl:"../../static/img/commodity1.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		},
		  		{
		  			id:2,
		  			imgUrl:"../../static/img/commodity2.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		},
		  		{
		  			id:3,
		  			imgUrl:"../../static/img/commodity3.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		},
		  		{
		  			id:4,
		  			imgUrl:"../../static/img/commodity4.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		}
		  	]
		  }
	  ]
  })
});
//服饰内衣第一次加载的数据
router.get('/api/index_list/3/data/1', function(req, res, next) {
  res.json({
	  code:"0",
	  data:[
		  {
			  type:"bannerList",
			  imgUrl:"../../static/img/banner1.jpg"
		  },
		  {
			  type:"iconsList",
			  data:[
				  {imgUrl:"../../static/img/icons1.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons2.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons3.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons4.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons5.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons6.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons7.png",name:"服饰内衣"},
				  {imgUrl:"../../static/img/icons8.png",name:"服饰内衣"}
			  ]
		  },
		  {
			  type:"hotList",
			  data:[
				  {
				  	id:1,
				  	imgUrl:"../../static/img/hot1.jpg",
				  	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
				  	pprice:"299",
				  	oprice:"659",
				  	discount:"5.2"
				  },
				  {
				  	id:2,
				  	imgUrl:"../../static/img/hot2.jpg",
				  	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
				  	pprice:"299",
				  	oprice:"659",
				  	discount:"5.2"
				  },
				  {
				  	id:3,
				  	imgUrl:"../../static/img/hot3.jpg",
				  	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
				  	pprice:"299",
				  	oprice:"659",
				  	discount:"5.2"
				  }
			  ]
		  },
		  {
			  type:"shopList",
			  data:[
				  {
					  bigUrl:"../../static/img/shop.jpg",
					  data:[
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 }
					  ]
				  },
				  {
					  bigUrl:"../../static/img/shop.jpg",
					  data:[
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:1,
						 	imgUrl:"../../static/img/shop1.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:2,
						 	imgUrl:"../../static/img/shop2.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:3,
						 	imgUrl:"../../static/img/shop3.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 },
						 {
						 	id:4,
						 	imgUrl:"../../static/img/shop4.jpg",
						 	name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
						 	pprice:"299",
						 	oprice:"659",
						 	discount:"5.2"
						 }
					  ]
				  }				  
			  ]
		  },
		  {
		  	type:"commodityList",
		  	data:[
		  		{
		  			id:1,
		  			imgUrl:"../../static/img/commodity1.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		},
		  		{
		  			id:2,
		  			imgUrl:"../../static/img/commodity2.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		},
		  		{
		  			id:3,
		  			imgUrl:"../../static/img/commodity3.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		},
		  		{
		  			id:4,
		  			imgUrl:"../../static/img/commodity4.jpg",
		  			name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
		  			pprice:"299",
		  			oprice:"659",
		  			discount:"5.2"
		  		}
		  	]
		  }
	  ]
  })
});
//首页(推荐)的数据
router.get("/api/index_list/data",function(req,res,next){
	res.send({
		"code":0,
		"data":{
			topBar:[
				{id:1,name:'推荐'},
				{id:2,name:'运动户外'},
				{id:3,name:'服饰内衣'},
				{id:4,name:'鞋靴箱包'},
				{id:5,name:'美妆个护'},
				{id:6,name:'家居数码'},
				{id:7,name:'食品母婴'}
			],
			data:[
				{
					type:"swiperList",
					data:[
						{imgUrl:'../../static/img/swiper1.jpg'},
						{imgUrl:'../../static/img/swiper2.jpg'},
						{imgUrl:'../../static/img/swiper3.jpg'}
					]
				},
				{
					type:"recommendList",
					data:[
						{
							bigUrl:"../../static/img/Children.jpg",
							data:[
								{imgUrl:"../../static/img/Children1.jpg"},
								{imgUrl:"../../static/img/Children2.jpg"},
								{imgUrl:"../../static/img/Children3.jpg"}
							]
						},
						{
							bigUrl:"../../static/img/Furnishing.jpg",
							data:[
								{imgUrl:"../../static/img/Furnishing1.jpg"},
								{imgUrl:"../../static/img/Furnishing2.jpg"},
								{imgUrl:"../../static/img/Furnishing3.jpg"}
							]
						}
					]
				},
				{
					type:"commodityList",
					data:[
						{
							id:1,
							imgUrl:"../../static/img/commodity1.jpg",
							name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
							pprice:"299",
							oprice:"659",
							discount:"5.2"
						},
						{
							id:2,
							imgUrl:"../../static/img/commodity2.jpg",
							name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
							pprice:"299",
							oprice:"659",
							discount:"5.2"
						},
						{
							id:3,
							imgUrl:"../../static/img/commodity3.jpg",
							name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
							pprice:"299",
							oprice:"659",
							discount:"5.2"
						},
						{
							id:4,
							imgUrl:"../../static/img/commodity4.jpg",
							name:"大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008大姨绒毛大款2020年必须买,不买你就不行了,爆款疯狂GG008",
							pprice:"299",
							oprice:"659",
							discount:"5.2"
						}
					]
				}
			]
		}
	})
});

module.exports = router;
