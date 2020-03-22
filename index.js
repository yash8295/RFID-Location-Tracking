var mongodb = require('mongodb');
var ObjectId = mongodb.ObjectId ;
var express = require('express');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
//var mongoDB = 'mongodb://localhost:27017'; //27017 is default port
var mongoDB="mongodb+srv://Yash:4gsYRxEVyEYzabc4@cluster0-wynku.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(mongoDB,{useNewUrlParser:true});
var port=3000;

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
var url = 'mongodb://localhost:27017'; //27017 is default port

mongoose.connection.on('error',(err)=>{
	console.log("DB Connection Error");
});

mongoose.connection.on('connected',(err)=>{
	console.log("DB connected Successfully");
});
var Schema=mongoose.Schema;

var userSchema = Schema({
	name: String,
	email: String,
	password: String,
	salt : String
});

var userdetails=mongoose.model('userDetails',userSchema,'users');

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
			
			userdetails.find({'email':email}).count(function(err,number){
				if(err)
					console.log(err);
				else if(number!=0)
				{
					res.json('Email already exists');
					console.log('Email already exists');
				}
				else
				{
					
					var newUserDetails=new userdetails({
						name:name,
						email:email,
						salt:salt,
						password:password
					});
					
					newUserDetails.save()
					.then(savedData =>{
						res.json('Registration Successful');
						console.log('Registration Successful');
					})
					
					/*userdetails
					.insert(insertJSON,function(err,data){
							res.json('Registration Successful');
							console.log('Registration Successful');
					})*/
				}
			})
			
		});
		
		app.post('/login',(req,res,next)=>{
			
			var data=req.body;
			
			var email=data.email;
			var userPassword=data.password;
			
			userdetails.find({email:email}).exec(function(err,updata){
				if(err)
					throw err;
				if(updata.length==0)
				{
					res.json('No User Found');
					console.log('No User Found');
				}
				else
				{
					var salt=updata[0].salt;
					//console.log(salt);
					//console.log(updata);
					var encrypted_password=updata[0].password;
					var hashed_password=checkHashPassword(userPassword,salt).passwordHash;
					//var hashed_password=encrypted_password
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
				}
			});
			
			//Check Email Exists
			/*userdetails
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
					
						userdetails
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
			})*/
			
		});	

/*MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
	var db = client.db('Demo_RFID');	
	
	if(err)
		console.log('Unable to connect to Mongo DB');
	else{
		
		//Register
		
		
		//Start Web Server
		
		})
	}
	
})*/

app.listen(process.env.PORT || port,()=>{console.log("Listening on port "+port);});