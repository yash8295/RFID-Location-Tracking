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
const axios = require('axios');
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

function addZeros(str)
{
	var temp='';
	for(let i=0;i<4-str.length;i++) 
	{
		temp+='0';
	}
	for(i=0;i<str.length;i++)
		temp+=str[i];
	console.log(temp);
	return temp;
}

function getIST()
{
	var indiaTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
	var time = new Date(indiaTime);
	return time;
}

//Create Express Service
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.set('views', path.join(__dirname,'public'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,'public')));

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(session({
	secret: "aezakmihesoyam",
	resave: true,
	saveUninitialized: true
	}));

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
	status : String,
	gender : String,
	phoneno : String,
	pic_id : String,
	createdBy : String
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

var schoolSchema = Schema({
	
	name: String,
	code: String,
	state : String,
	city : String,
	added_by : String,
	status : String,
	
	
});

var studentSchema = Schema({
	
	name : String,
	standard : String,
	roll_no : String,
	contact : String,
	school_code : String,
	admission_no : String,
	pic_id : String,
	added_by : String,
	status : String
	
	
});

var stateSchema = Schema({
	
	state : String,
	cities : [String]
});

var logSchema = Schema({
	
	email : String,
	log : [{
		time : Date,
		action : String
		}]
});

var userdetails = mongoose.model('userDetails',userSchema,'usersdetails');
var otpdetails = mongoose.model('otpDetails',otpSchema,'otpdetails');
var admindetails = mongoose.model('adminDetails',adminSchema,'admindetails');
var schooldetails = mongoose.model('schoolDetails',schoolSchema,'schooldetails');
var studentdetails = mongoose.model('studentDetails',studentSchema,'studentdetails');
var statedetails = mongoose.model('stateDetails',stateSchema,'statedetails');
var logdetails = mongoose.model('logDetails',logSchema,'logdetails');

//------------------------------------//

//----------------------Website----------------------//

app.get(['/',''],function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
			res.redirect('/Admin_Profile');
	}
	else
	{
		res.sendFile('/index.html');
	}
	
});

app.post('/loginAdmin',function(req,res){
	
	var body = req.body;
	var email = body.email;
	var userPassword = body.password;	
	
	
	admindetails.find({email:email,status:'Active'}).exec(function(err,data){
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
					req.session.pic_id=data[0].pic_id;
					
					//console.log(req.session);
					var time=getIST();
					
					var log={
							time:time,
							action : 'Logged In'
						}
						console.log(log);
					
					logdetails.updateOne({email:email},{$push:{log:log}})
					.then(savedData=>{
						
						console.log(savedData);
						
						console.log('Login Successful');
						res.send('/Admin_Profile');
						
					});
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
	
	if(req.session.role=='SuperAdmin')
	{
		var body = req.body;
		//console.log(body);
		var email = body.email;
		var name = body.name;
		var temp='';
		for(let i=0;i<name.length;i++)
		{
			if(i==0)
				temp+=name[i].toUpperCase();
			else
				temp+=name[i];
		}
		name=temp;
		var plain_password = body.password;
		var role = body.role;
		var status = 'Active';
		var phoneno=body.phoneno;
		var gender=body.gender;
		var city=body.city;
		var createdBy=req.session.adminEmail!=''?req.session.adminEmail:'Advanced Rest Client';
		
		
		//console.log(password,salt,checkHashPassword(plain_password,salt).passwordHash);
		admindetails.find({email:email}).exec(function(err,data){
			if(err)
				throw err;
			else
			{
				if(data.length!=0)
				{
					
					console.log('Admin Already Registered');
					res.send('0');
				}
				else
				{
					var passwordData = getSecuredPassword(plain_password);
					var password=passwordData.password;
					var salt=passwordData.salt;
					
					var pic_id = name[0].toUpperCase()+'.jpg';
					
					var newAdminDetails = new admindetails({
						name:name,
						email:email,
						password:password,
						salt:salt,
						role:role,
						status:status,
						gender:gender,
						phoneno:phoneno,
						pic_id:pic_id,
						createdBy:createdBy
					});
					
					newAdminDetails.save()
					.then(savedData=>{
						
						var time=getIST();
						
						var newLogDetails = new logdetails({
							email : email,
							log : [{
								time : time,
								action : 'Admin Registered'
							}]
						});
						
						newLogDetails.save()
						.then(temp=>{
							
							var log={
								time:time,
								action : 'Added Admin '+name
							}
							
							logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
							.then(savedData=>{
								
								console.log(savedData);
								res.send('Admin Registered Successfully');
								
							});
							
						});
					})
					
				}
			}
		})
	}
	else
		res.send('NO');
	
});

app.get('/Admin_Profile',function(req,res){
	
	//console.log(req.session);
	
	
	if(req.session.isAdminLogin==1)
	{
		admindetails.find({email:req.session.adminEmail}).exec(function(err,udata){
			if(err)
				throw err;
			else
			{
				console.log('\n\n\n',udata,'\n\n\n');
				res.render('\Admin_details',{data:udata,role:req.session.role});
			}
		})
	}
	else
		res.redirect('/');
	
});

app.get('/addAdmin',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		console.log('Add User');
		res.render('\Add_Admin',{role:req.session.role});
	}
	else
		res.redirect('/');
	
});

app.post('/getAdmins',function(req,res){
	
	if(req.session.role=='SuperAdmin')
	{
		admindetails.find({},{email:1})
		.exec(function(err,data)
		{
			console.log(data);
			res.send(data);
			
		});
	}
	else
		res.send('You Are Authorised to use this resource');
	
});

app.get('/adminList',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		res.render('\adminList',{role:req.session.role});
	}
	else
		res.redirect('/');
	
});

app.post('/getAdminData',function(req,res){
	
	//console.log(req.body.columns);
	var tCount,fCount;
	var size=parseInt(req.body.length);
	var start=parseInt(req.body.start);
	var serby=req.body.columns[parseInt(req.body.order[0].column)].name.toString();
	var ser=req.body.search.value;
	var sRole=req.body.role;
	var sStatus=req.body.status;
	admindetails.count({}).exec(function(err,totalCount)
	{
		if(err)
			res.send(err);
		tCount=totalCount;
	});
	var fin={email :new RegExp('^'+ser+'.*$', "i"),role : new RegExp('^'+sRole+'.*$', "i"),status : new RegExp('^'+sStatus+'.*$', "i")};
	admindetails.count(fin).exec(function(err,totalCount)
	{
		if(err)
			res.send(err);
		fCount=totalCount;
	});
	if(serby=='email')
	{	
		var obj={'email':req.body.order[0].dir};
	}
	else if(serby=='phoneno')
	{	
		var obj={'phoneno':req.body.order[0].dir};
	}
	else if(serby=='name')
	{	
		var obj={'name':req.body.order[0].dir};
	}
	else if(serby=='status')
	{	
		var obj={'status':req.body.order[0].dir};
	}
	else
	{	
		var obj={'role':req.body.order[0].dir};
	}
	admindetails.find(fin).skip(start).sort(obj).limit(size).exec(function(err,data){
		if(err)
		{
			res.send(err);
		}
		var totalPages=Math.ceil(fCount/size);
		res.send({pageLength:size,recordsTotal:tCount,recordsFiltered:fCount,data: data});
	});
	
	
});

app.get('/SwitchAdmin',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		var first = req.session.role;
		if(req.session.role=='SuperAdmin')
		{
			req.session.role='SAdmin';
		}
		else if(req.session.role=='SAdmin')
		{
			req.session.role='SuperAdmin';
		}
		var second = req.session.role;
		
		var action='Switched From '+first+' to '+second;
		
		var log={
			time:getIST(),
			action:action
		}
		
		logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
		.then(savedData=>{
			res.redirect('/Admin_Profile');
		})
	}
	
});

app.get('/changePassword',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		res.render('\Change_Pass',{role:req.session.role});
	}
	else
		res.redirect('/');
	
});

app.put('/changePass',function(req,res){
	
	
	var body=req.body;
	var plain_password=body.oldPassword;
	//console.log(req.session.adminEmail);
	var new_password=body.newPassword;
	console.log(req.body);
	
	admindetails.findOne({email:req.session.adminEmail})
	.exec(function(err,data){
		
		if(err)
			throw err;
		else
		{
			console.log(data);
			var encrypted_password=data.password;
			var salt=data.salt;
			var hashed_password = checkHashPassword(plain_password,data.salt).passwordHash;
			if(encrypted_password==hashed_password)
			{
				var passwordData = getSecuredPassword(new_password);
				var password=passwordData.password;
				salt=passwordData.salt;
				
				//encrypted_password=password;
				//hashed_password=checkHashPassword(new_password,salt).passwordHash
				//console.log(encrypted_password,'\n\n',hashed_password,'\n\n',new_password);
				admindetails.updateOne({email:req.session.adminEmail},{$set:{password:password,salt:salt}})
				.exec(function(err,data){
					if(err)
						throw err;
					
					var log=
					{
						time:getIST(),
						action:'Changed Password'
					}
					
					logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
					.then(savedData=>{
						res.send('Password Changed');
					})
				});
			}
			else
				res.send('NO');
		}
		
	});
	
});

app.get('/AddStudent',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		
		schooldetails.find({})
		.exec(function(err,data){
			if(err)
				throw err;
			else
			{
				console.log(data);
				data.sort(function(a, b){
					var nameA=a.name.toLowerCase(), nameB=b.name.toLowerCase()
					if (nameA < nameB) //sort string ascending
						return -1 
					if (nameA > nameB)
						return 1
					return 0 //default return value (no sorting)
				})
				res.render('\Add_Student',{school:data,role:req.session.role});
			}
		});
		
	}
	else
		res.redirect('/');
	
	
});

app.post('/Add_Student',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		var body=req.body;
		console.log(body);
		
		var name=body.name;
		var school_code=body.school_id;
		var standard=body.std;
		var roll=body.roll;
		var contact=body.contact;
		var admission_no=body.admission_no;
		
		/*name : String,
		class : String,
		roll_no : String,
		contact : String,
		school_code : String,
		pic_id : String*/
		
		studentdetails.findOne({school_code:school_code,admission_no:admission_no})
		.exec(function(err,data){
			
			if(err)
				throw err;
			else
			{
				if(data!=null)
					res.send('Already Registered');
				else
				{
					var newStudentDetails = new studentdetails({
						name:name,
						school_code:school_code,
						standard:standard,
						roll_no:roll,
						contact:contact,
						admission_no:admission_no,
						pic_id:name[0].toUpperCase()+'.jpg',
						added_by : req.session.adminEmail,
						status : 'Active'
					});
					
					newStudentDetails.save()
					.then(savedData=>{
						
						var action='Added Student school_code : '+school_code+', admission_no : '+admission_no;
						
						var log={
							time:getIST(),
							action:action
						}
						logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
						.then(savedData=>{
							console.log('Student Added');
							res.send('Done');
						})
						
					});
				}
			}
			
		})
	}
	else
		res.send("No Data Found");
	
	
});

app.get('/addSchool',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		statedetails.find({},{state:1})
		.exec(function(err,data){
			
			if(err)
				throw err;
			else
			{
				
				//console.log(data);
				
				data.sort(function(a,b){
					
					var state1=a.state.toLowerCase();
					var state2=b.state.toLowerCase();
					if(state1<state2)
						return -1;
					if(state1>state2)
						return 1;
					return 0;
				});
				
				res.render('\Add_School',{states:data,role:req.session.role});
			}
			
		});
	}
	else
		res.redirect('/');
	
});

app.post('/getCities',function(req,res){
	
	var body=req.body;
	var state=body.state;
	statedetails.find({state:state},{cities:1})
	.exec(function(err,data){
		
		if(err)
		{
			throw err;
			res.send('err');
		}
		else
		{
			
			var cities=data[0].cities;
			//console.log(data);
			
			cities.sort(function(a,b)
			{
				a=a.toLowerCase();
				b=b.toLowerCase();
				if(a<b)
					return -1;
				if(a>b)
					return 1;
				return 0;
			});
			//console.log(cities);
			
			res.send(cities);
		}
		
	});
	
});

app.post('/Add_School',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
	
		var body=req.body;
		//console.log(body);
		var name = body.School_Name;
		var code=body.School_code;
		var state=body.state;
		var city=body.city;
		
		schooldetails.findOne({code:code},{name:1})
		.exec(function(err,data){
			
			if(err)
			{
				throw err;
				res.send('err');
			}
			else
			{		
				if(data!=null)
				{
					//console.log(data)
					console.log('Code Already Used');
					res.send(data.name);
				}
				else
				{
					var newSchoolDetails = new schooldetails({
						name : name,
						code : code,
						state:state,
						city:city,
						added_by: req.session.adminEmail,
						status : 'Active'
					});
					
					newSchoolDetails.save()
					.then(savedData=>{
						
						var action='Added School '+code;
						
						var log={
							time:getIST(),
							action:action
						}
						
						logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
						.then(savedData=>{
							
							console.log('School Added')
							res.send('Done');
							
						})
						
					})
				}
			}
			
		});
	}
	else
		res.send("You Can't do this");
	
});

app.get('/schoolList',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		res.render('\schoolList',{role:req.session.role});
	}
	else
		res.redirect('/');
	
});

app.post('/getSchoolData',function(req,res){
	
	//console.log(req.body);
	
	var tCount,fCount;
	var size=parseInt(req.body.length);
	var start=parseInt(req.body.start);
	var serby=req.body.columns[parseInt(req.body.order[0].column)].name.toString();
	var ser=req.body.search.value;
	var sStatus=req.body.status;
	schooldetails.count({}).exec(function(err,totalCount)
	{
		if(err)
			res.send(err);
		tCount=totalCount;
	});
	
	var fin={ 
			$or:[{name :new RegExp('^'+ser+'.*$', "i")},{state :new RegExp('^'+ser+'.*$', "i")},{city :new RegExp('^'+ser+'.*$', "i")},{code :new RegExp('^'+ser+'.*$', "i")}],
			status : new RegExp('^'+sStatus+'.*$', "i")
		};
		
	schooldetails.count(fin).exec(function(err,totalCount)
	{
		if(err)
			res.send(err);
		fCount=totalCount;
	});
	if(serby=='code')
	{	
		var obj={'code':req.body.order[0].dir};
	}
	else if(serby=='name')
	{	
		var obj={'name':req.body.order[0].dir};
	}
	else if(serby=='state')
	{	
		var obj={'state':req.body.order[0].dir};
	}
	else if(serby=='status')
	{	
		var obj={'status':req.body.order[0].dir};
	}
	else
	{	
		var obj={'city':req.body.order[0].dir};
	}
	schooldetails.find(fin).skip(start).sort(obj).limit(size).exec(function(err,data){
		if(err)
		{
			res.send(err);
		}
		var totalPages=Math.ceil(fCount/size);
		res.send({pageLength:size,recordsTotal:tCount,recordsFiltered:fCount,data: data});
	});
	
	
});

app.get('/studentList',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		res.render('\studentList',{role:req.session.role});
	}
	else
		res.redirect('/');
	
});

app.post('/getStudentData',function(req,res){
	
	
	var tCount,fCount;
	var size=parseInt(req.body.length);
	var start=parseInt(req.body.start);
	var serby=req.body.columns[parseInt(req.body.order[0].column)].name.toString();
	var ser=req.body.search.value;
	var sStatus=req.body.status;
	//console.log(req.body.columns);
	studentdetails.count({}).exec(function(err,totalCount)
	{
		if(err)
			res.send(err);
		tCount=totalCount;
	});
	
	var fin={ 
			$or:[{name :new RegExp('^'+ser+'.*$', "i")},{school_code :new RegExp('^'+ser+'.*$', "i")},{admission_no :new RegExp('^'+ser+'.*$', "i")}],
			status : new RegExp('^'+sStatus+'.*$', "i")
		};
		
	studentdetails.count(fin).exec(function(err,totalCount)
	{
		if(err)
			res.send(err);
		fCount=totalCount;
	});
	if(serby=='school_code')
	{	
		var obj={'school_code':req.body.order[0].dir};
	}
	else if(serby=='name')
	{	
		var obj={'name':req.body.order[0].dir};
	}
	else if(serby=='contact')
	{	
		var obj={'contact':req.body.order[0].dir};
	}
	else if(serby=='status')
	{	
		var obj={'status':req.body.order[0].dir};
	}
	else
	{	
		var obj={'admission_no':req.body.order[0].dir};
	}
	studentdetails.find(fin).skip(start).sort(obj).limit(size).exec(function(err,data){
		if(err)
		{
			res.send(err);
		}
		var totalPages=Math.ceil(fCount/size);
		res.send({pageLength:size,recordsTotal:tCount,recordsFiltered:fCount,data: data});
	});
	
});

app.post('/setLog',function(req,res){
	
	
	req.session.log=req.body.email;
	
	res.send('Done');
	
});

app.get('/logs',function(req,res){
	
	console.log(req.session.log);
	
	if(req.session.isAdminLogin==1)
	{
		if(req.session.role=='SuperAdmin')
		{
			if(req.session.log!=undefined)
			{
						res.render('\Admin_Logs',{role:req.session.role,email:req.session.log});
			}
			else
				res.redirect('/adminList');
		}
		else
			res.redirect('/Admin_Profile');
	}
	else
		res.redirect('/');
	
});

app.post('/getLogData',function(req,res){
	
	
	logdetails.findOne({email:req.session.log},{log:1})
	.exec(function(err,data){
		
		if(err)
			throw err;
		//console.log(data);
		res.send(data);
		
	});
	
});


app.put('/activation',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		var body=req.body;
		var purpose=body.purpose.toLowerCase();
		var status=body.status;
		if(status=='Active')
			var actiontemp='Activated';
		else
			var actiontemp='Deactivated';
		
		if(purpose=='admin')
		{
			//console.log(body);
			var email = body.email;
				admindetails.updateOne({email:email},{$set:{status:status}})
				.exec(function(err,data){
					if(err)
						throw err;
					
					var action=actiontemp+' by '+req.session.adminEmail;
					
					var log=
					{
						time:getIST(),
						action:action
					}
					
					logdetails.updateOne({email:email},{$push:{log}})
					.then(savedData=>{
						
						log.action=actiontemp+' Admin '+email;
						
						logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
						.then(temp=>{
						
							console.log(email+' is now '+status);
							
						})
						
					})
				});
		}
		else if(purpose=='school')
		{
			var code=body.code;
			var status=body.status;
			
			schooldetails.updateOne({code:code},{$set:{status:status}})
			.exec(function(err,data)
			{
				if(err)
					throw err;
				else
				{
					var action = actiontemp+' School '+code;
					
					var log=
					{
						time:getIST(),
						action:action
					}
					
					logdetails.updateOne({email:req.session.adminEmail},{$push:{log}})
					.then(savedData=>{
						console.log(code+' is now '+status);
					})
				}
			});
		}
		else if(purpose=='student')
		{
			var school_code=body.school_code;
			var admission_no=body.admission_no;
			var status=body.status;
			
			studentdetails.updateOne({school_code:school_code,admission_no:admission_no},{$set:{status:status}})
			.exec(function(err,data){
				
				if(err)
					throw err;
				else
				{
					var action = actiontemp+' Student school_code :'+school_code+', admission_no :'+admission_no;
					
					var log=
					{
						time:getIST(),
						action:action
					}
					
					logdetails.updateOne({email:req.session.adminEmail},{$push:{log}})
					.then(savedData=>{
						console.log(school_code+' '+admission_no+' is now '+status);
					})
					
				}
				
			});
		}
	}
	else
		res.send('Get Out Here You Little ****');
	
});
	


app.post('/home',function(req,res){
	var data={name:req.session.adminName,pic_id:req.session.pic_id,role:req.session.role}
	res.send(data);
});

app.post('/adminLogout',function(req,res){
	
	/*req.session.isAdminLogin=0;
	req.session.adminEmail='';
	req.session.adminName='';
	req.session.role='';
	req.session.pic_id='';*/
	
	var log={
		time:getIST(),
		action:'Logged Out'
	}
	
	logdetails.updateOne({email:req.session.adminEmail},{$push:{log:log}})
	.then(saveData=>{	
		req.session.destroy();	
		console.log('Logout');
		//console.log(req.session);
	})
	
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

		req.session.destroy();
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

//---------------Extras----------------------------//

app.get('/selectState',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		if(req.session.role=='Country')
		{
			statedetails.find({})
			.exec((err,data)=>{
				if(err)
					throw err;
				else
				{
					data.sort(function(a, b){
						var nameA=a.state.toLowerCase(), nameB=b.state.toLowerCase()
						if (nameA < nameB) //sort string ascending
							return -1 
						if (nameA > nameB)
							return 1
						return 0 //default return value (no sorting)
					});
					
					res.render('\Select_State',{states:data});
				}
				
			});
		}
		else
			res.redirect('/');
	}
	else
		res.redirect('/');
	
});

app.post('/StateSelected',function(req,res){
	
	var body = req.body;
	var state = body.state;
	req.session.state=state;
	if(req.session.state.length>0)
	{
		console.log(req.session.state);
		res.send('Done');
	}
	else
		res.send('No');
	
});

app.get('/addCities',function(req,res){
	
	if(req.session.isAdminLogin==1)
	{
		if(req.session.role=='Country')
		{
				res.render('\Add_Cities',{state:req.session.state})
		}
		else
			res.redirect('/');
	}
	else
		res.redirect('/');
	
});

app.post('/Add_City',function(req,res){
	
	var body=req.body;
	var state=body.state;
	var city=body.city;
	var flag=0;
	//console.log(body);
	
	statedetails.findOne({state:state})
	.exec(function(err,data){
		
		if(err)
			throw err;
		else
		{
			var cities=data.cities;
			//console.log(cities);
			cities.forEach((item)=>{
				
				if(item.toLowerCase()==city.toLowerCase()&&flag==0)
				{
					flag=1;
				}
			});
			if(flag==1)
				res.send('Already Exists');
			else
			{
				cities.push(city);
				statedetails.updateOne({state:state},{$set:{cities:cities}})
				.exec(function(err,data){
					if(err)
						throw err;
					else
					{
						//console.log(data);;
						res.send('Done');
					}
				})
			}
			//console.log(cities);
		}
		
	});
	
});

/*app.post('/addState',(req,res)=>{
	
	
	var state=req.body.state;
	
	statedetails.find({state:state})
	.exec((err,data)=>{
		if(err)
			throw err;
		else
		{
			if(data.length!=0)
			{
				console.log(data[0].cities);
				res.send('State Already Added');
			}
			else
			{
				var newStateDetails = new statedetails({		
					state:state,
					cities:[]
				});
				newStateDetails.save()
				.then(savedData=>{
					res.send('State Added Successfully');
				});
			}
		}
	});
});

*/

/*app.post('/getTime',function(req,res){
	
	logdetails.find({email:'test@gmail.com'})
	.exec(function(err,data){
		
		console.log(data);
		var log=data[0].log;
		var time=log[0].time;
		console.log(time.getHours());
		res.send('done');
		
	});
	
});*/

//-------------------------------------------------//

app.listen(process.env.PORT || port,()=>{console.log("Listening on port "+port);});