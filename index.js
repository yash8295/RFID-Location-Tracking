var mongodb = require('mongodb');
var ObjectId = mongodb.ObjectId ;
var express = require('express');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var nodemailer=require('nodemailer');
//var mongoDB = 'mongodb://localhost:27017'; //27017 is default port
var mongoDB="mongodb+srv://Yash:4gsYRxEVyEYzabc4@cluster0-wynku.mongodb.net/RFID_Demo?retryWrites=true&w=majority";
mongoose.connect(mongoDB,{useNewUrlParser:true,useUnifiedTopology: true});
var port=3000;

//---------------Node Mailer----------------//
function generateOTP()
{
	var digits = '0123456789'; 
    let OTP = ''; 
    for (let i = 0; i < 6; i++ ) { 
        OTP += digits[Math.floor(Math.random() * 10)]; 
    } 
    return OTP; 
}

function sendNewUserMail(To,Name)
{
	var otp=generateOTP();
	console.log(otp);
	var mailOptions={
		from:'togetherconnect0@gmail.com',
		to:To,
		subject:'<Our Name> ID Login ['+otp.substring(0,3)+' '+otp.substring(3)+']',
		text:'Hey there '+Name+',\n You have requested to register '+To+' in <Our Name>\nVerification code- '+otp+'\n\nThis is a system generated mail. Please do not reply to this mail.\nThanks'
	}
	var transporter=nodemailer.createTransport({
		service:'Yandex',
		auth:{
			user:'togetherconnect@yandex.com',
			pass:'connect123!'
		},
	});

	transporter.sendMail(mailOptions,function(err,info){
		if(err)
		{
			console.log(err);
			throw err;
		}
		else
			console.log('Email sent '+info.response);
	});
	return otp;
}

//--------------------//

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

mongoose.connection.on('error',(err)=>{
	console.log("DB Connection Error");
});

mongoose.connection.on('connected',(err)=>{
	console.log("DB connected Successfully");
});

//----------------Schemas--------------------//
var Schema=mongoose.Schema;

var userSchema = Schema({
	name: String,
	email: String,
	password: String,
	salt : String,
	verifiedOTP : String
});

var otpSchema = Schema({
	email : String,
	otp : String,
})

var userdetails=mongoose.model('userDetails',userSchema,'users');
var otpdetails = mongoose.model('otpDetails',otpSchema,'otp');

//------------------------------------//

//----------------------Register---------------------//

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
					
					var toReturn;
					
					var newUserDetails=new userdetails({
						name:name,
						email:email,
						salt:salt,
						password:password,
						verifiedOTP : '0'
					});
					
					newUserDetails.save()
					.then(savedData =>{
						toReturn+='Registration Successful';
					})
					
					/*userdetails
					.insert(insertJSON,function(err,data){
							res.json('Registration Successful');
							console.log('Registration Successful');
					})*/
					var otp = 0; 
					var otp=sendNewUserMail(data.email,data.name);
					
						var newOtpDetails=new otpdetails({
							email:email,
							otp:otp,
						});
						newOtpDetails.save()
						.then(savedData=>{
							toReturn+='\nOtp Saved';
						})
						res.json('Registration Successful');
						console.log('Registration Successful');
				}
			})
			
		});
//-------------------------------------------//
		
//----------------------Login---------------------//		

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
		
//-------------------------------------------//

//--------------------Check OTP---------------------

app.post('/checkOtp',function(req,res){
	
	var body=req.body;
	var email=body.email;
	var otp=body.otp;
	
	otpdetails.find({email:email,otp:otp})
	.exec(function(err,data){
		if(err)
		{
			console.log(err);
			throw err;
		}
		else
		{
			if(data.length==0)
			{
				res.json('Wrong OTP');
				console.log('Wrong OTP');
			}
			else
			{
				userdetails.updateOne({email:email},{$set:{verifiedOTP:'1'}})
				.exec(function(err,data){
					if(err)
						throw err;
					else
					{
						otpdetails.deleteOne({email:email})
						.exec(function(err,data){
							if(err)
								throw err;
							else
							{
								res.json('OTP Verified');
								console.log('OTP Verified');
							}
						})
						
					}
				})
			}
		}
	})
	
});

//--------------------------------------------//

app.listen(process.env.PORT || port,()=>{console.log("Listening on port "+port);});