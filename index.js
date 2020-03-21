var mongodb = require('mongodb');
var ObjectId = mongodb.ObjectId ;
var express = require('express');
var crypto = require('crypto');
var bodyParser = require('body-parser');

var getRandomString = function(length){
	return crypto.randomBytes(Math.ceil(length/2))
	.toString('hex')
	.slice(0,length);
}

var sha512 = function(password,salt){
	var hash = crypto.createHmac('sha512',salt);
	hash.update(password);
	var value = hash.digest('hex');
	return{
		salt:salt,
		passwordHash:value
	};
};

function saltHashPassword(userPassword){
	var salt = getRandomString(16);
	var passwordData = sha512(userPassword,salt);
	return passwordData;
	
}

function checkHashPassword(userPassword,salt){
	var passwordData = sha512(userPassword,salt);
	return passwordData;
}

//Create Express Service
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//Create MongoDB Client
var MongoClient = mongodb.MongoClient;

//Connection URL
//var url = 'mongodb://localhost:27017'; //27017 is default port

var url = "mongodb+srv://Yash:sombxvBOXIPxrvVO@location-tracking-wynku.mongodb.net/Demo_RFID";


MongoClient.connect(url,{useNewUrlParser:true},function(err,client){

	var db = client.db('Demo_RFID');	
	
	if(err)
		console.log('Unable to connect to Mongo DB');
	else{
		
		//Register
		app.post('/register',(req,res,next)=>{
			
			var data = req.body;
			var plain_password = data.password;
			var hash_data = saltHashPassword(plain_password);
			var password = hash_data.passwordHash;
			var salt = hash_data.salt;
			
			var name = data.name;
			var email = data.email;
			
			var insertJSON = {
					'email':email,
					'password':password,
					'salt':salt,
					'name':name
			}
			
			db.collection('users')
			.find({'email':email}).count(function(err,number){
				if(err)
					console.log(err);
				else if(number!=0)
				{
					res.json('Email already exists');
					console.log('Email already exists');
				}
				else
				{
					db.collection('users')
					.insertOne(insertJSON,function(err,data){
							res.json('Registration Successful');
							console.log('Registration Successful');
					})
				}
			})
			
		});
		
		app.post('/login',(req,res,next)=>{
			
			var data=req.body;
			
			var email=data.email;
			var userPassword=data.password;
			
			//Check Email Exists
			db.collection('users')
			.find({'email':email}).count(function(err,number){
				if(err)
					console.log(err);
				else if(number==0)
				{
					res.json('Email not exists');
					console.log('Email not exists');
				}
				else
				{
					
						db.collection('users')
						.findOne({'email':email},function(err,user){
							var salt = user.salt;
							var hashed_password = checkHashPassword(userPassword,salt).passwordHash;
							var encrypted_password = user.password;
							if(hashed_password==encrypted_password)
							{
								res.json('Login Successful');
								console.log('Login Successful');
							}
							else
							{
								res.json('No User Found');
								console.log('No User Found');
							}
						})
				}
			})
			
		});
		
		//Start Web Server
		app.listen(3000,()=>{
			console.log('Connection Successful , Running on port 3000');
		})
	}
	
})
