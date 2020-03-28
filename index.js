var mongodb = require('mongodb');
var ObjectId = mongodb.ObjectId ;
var express = require('express');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var nodemailer=require('nodemailer');
var session = require('express-session');
var path=require('path');
var ejs = require('ejs');
//var mongoDB = 'mongodb://localhost:27017'; //27017 is default port
var mongoDB="mongodb+srv://Yash:4gsYRxEVyEYzabc4@cluster0-wynku.mongodb.net/RFID_Demo?retryWrites=true&w=majority";
/*
mongodb+srv://Yash:4gsYRxEVyEYzabc4@cluster0-wynku.mongodb.net/RFID_Demo?retryWrites=true&w=majority
*/

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
		service:'gmail',
		secure:false,
		port:25,
		auth:{
			user:'togetherconnect0@gmail.com',
			pass:'connect123!'
		},
		tls:{
			rejectUnauthorized:false
		}
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

//-----------------------------------------------------//

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

function getSecuredPassword(plain_password)
{
		var hash_data = saltHashPassword(plain_password);
		var password=hash_data.passwordHash;
		var salt=hash_data.salt;
		return{
			salt:salt,
			password:password
		};
};

//Create Express Service
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.set('views', path.join(__dirname,'public'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,'public')));

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(session({secret: "aezakmihesoyam"}));

//Create MongoDB Client
var MongoClient = mongodb.MongoClient;

//Connection URL
//var url = 'mongodb://localhost:27017'; //27017 is default port

mongoose.connection.on('error',(err)=>{
	console.log("DB Connection Error");
});

var Schema = mongoose.Schema;

var adminSchema = Schema({
	email : String,
	name : String,
	password : String,
	salt : String,
	role : String,
	status : String
});

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
	salt : String
});

var userdetails = mongoose.model('userDetails',userSchema,'usersdetails');
var otpdetails = mongoose.model('otpDetails',otpSchema,'otpdetails');
var admindetails = mongoose.model('adminDetails',adminSchema,'admindetails');

//------------------------------------//

//----------------------Website----------------------//

app.get('/',function(req,res){
	
	req.session.isAdminLogin=0;
	req.session.adminName='';
	req.session.adminEmail='';
	res.sendFile('/index.html')
	
});

app.post('/loginAdmin',function(req,res){
	
	var body = req.body;
	var email = body.email;
	var userPassword = body.password;
	
	admindetails.find({email:email}).exec(function(err,data){
		if(err)
			throw err;
		else
		{
			if(data.length==0)
			{
				console.log('No User Found');
				res.send('NO');
			}
			else
			{
				var encrypted_password = data[0].password;
				var hashed_password = checkHashPassword(userPassword,data[0].salt).passwordHash;
				if(encrypted_password==hashed_password)
				{
					req.session.isAdminLogin=1;
					req.session.adminName=data[0].name;
					req.session.adminEmail=email;
					req.session.role=data[0].role;
					
					//console.log(req.session);
					
					console.log('Login Successful');
					res.send('/Admin_Profile');
				}
				else
				{
					console.log('User Not Authorised');
					res.send('NO');
				}
			}
		}
	});
	
});

app.post('/registerAdmin',function(req,res){
	
	var body = req.body;
	var email = body.email;
	var name = body.name;
	var plain_password = body.password;
	var role = body.role;
	
	
	//console.log(password,salt,checkHashPassword(plain_password,salt).passwordHash);
	admindetails.find({email:email}).exec(function(err,data){
		if(err)
			throw err;
		else
		{
			if(data.length!=0)
			{
				res.send('Admin Email Already Registered');
			}
			else
			{
				var passwordData = getSecuredPassword(plain_password);
				var password=passwordData.password;
				var salt=passwordData.salt;
				
				var newAdminDetails = new admindetails({
					name:name,
					email:email,
					password:password,
					salt:salt,
					role:role
				});
				
				newAdminDetails.save()
				.then(savedData=>{
					res.send('Admin Registered Successfully');
				})
				
			}
		}
	})
	
});

app.get('/Admin_Profile',function(req,res){
	
	console.log(req.session);
	
	if(req.session.isAdminLogin==1)
	{
		admindetails.find({email:req.session.adminEmail}).exec(function(err,udata){
			if(err)
				throw err;
			else
			{
				console.log('\n\n\n',udata,'\n\n\n');
				res.render('\Admin_details',{data:udata});
			}
		})
	}
	else
		res.redirect('/');
	
});

//--------------------------------------------------//

//----------------------App--------------------------//
//----------------------Register---------------------//

app.post('/registerUser',(req,res,next)=>{
			
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

	app.post('/loginUser',(req,res,next)=>{
		
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
					req.session.isUserLogin=1;
					req.session.userName=updata[0].name;
					req.session.userEmail=email;
					
					
					
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

//------------------Log Out---------------------//

app.post('/logout',function(req,res){
	
	req.session.isLogin=0;
	req.session.email='';
	req.session.name='';
	
})

//----------------------------------------------//

//--------------------Check OTP---------------------

app.post('/verifyOtp',function(req,res){
	
	var body=req.body;
	var email=req.session.email;
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