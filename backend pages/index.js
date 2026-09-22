const express=require("express");
const app=express();
const path=require("path");
const mongoose=require("mongoose");
const pool=require('./db');
const session=require('express-session');
const MongoUrl="mongodb://127.0.0.1:27017/finkit";
const userdata=require("./models/schema");




pool.query("select 1",(err,res)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log('mysql connected');
    }
})





app.set("views",path.join(__dirname,"/views"));
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,"public")));
app.use(express.static(path.join(__dirname,"front pages")))
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(session({
    secret:"finkit-secret-key",
    resave:false,
    saveUninitialized:false
}));



main()
.then(()=>{
    console.log("Connected with mongoose");
})
.catch((err)=>{
    console.log(err);
})




async function main(){
    await mongoose.connect(MongoUrl);
}



const port=8080;

app.listen(port,(req,res)=>{
    console.log("service is running at port ",port);
    
});
app.get("/finkit",(req,res)=>{  // Root link
    console.log("service loaded");
    res.render("home.ejs");
});
app.get("/finkit/sipcalculator",(req,res)=>{ //loading SIP page 
    console.log("sip calculator is being called");
    
    res.render("sipC.ejs",{
        result:null,
        investAmt:null,
        investTime:null,
        Return:null
    });
});

app.post("/finkit/sipcalculator",(req,res)=>{ //SIP calculation logic
  
  let principle=req.body.p;
  let rate=req.body.r;
  let time=req.body.t;

  
    rate=rate/1200;
    time=time*12;
    
    let result=principle*(((1+rate)**time)-1)/rate;
    result=result.toFixed(2);
    let investTime=time;
    let investAmt=principle*time;
    let Return =result-investAmt;
    Return=Return.toFixed(2);
    let a=Math.floor(result);
    console.log("total value :",result);
    console.log("investment time in months :",investTime );
    console.log("investment amount :" , investAmt);
    console.log("return on investment :", Return);



res.render("sipC",{result,investAmt,investTime,Return} );

});

app.get("/finkit/emicalculator",(req,res)=>{ //loading emi page
   res.render("emiC",{
    result:null,
    principle:null,
    rate:null,
    time:null} );
    console.log("emi calculator is being called");
    console.log(req.body);
});

app.post("/finkit/emicalculator",(req,res)=>{ //emi calculation logic
    let p=principle=req.body.p;
    let r=rate=req.body.r;
    let t=time=req.body.t;

    r=r/1200;
    t=t*12;
    let result=(p*r*(1+r)**t)/(((1+r)**t)-1);
    let totalAmt=result*t;
    let interestPaid=totalAmt-p;
    totalAmt=totalAmt.toFixed(2);
    interestPaid=interestPaid.toFixed(2);
    result=result.toFixed(2);
    res.render("emiC",{result,principle,rate,time,totalAmt,interestPaid} );
    console.log("EMI :",result);
    console.log("Total Amount paid :",totalAmt);
    console.log("Interest Paid :",interestPaid);
    console.log("Principle :",p);
    console.log("Rate of Interest :",r);
    console.log("Time :",t);

})

function requirelogin(req,res,next){
    if(!req.session.userId){
        return res.send("please login first");
    }
    next();
}

app.get("/finkit/dashboard", requirelogin, (req, res) => {

    pool.query(
        "select sum(amount) as TotalIncome from transactions where user_id=? and type='income'",
        [req.session.userId],
        (err, TotalIncome) => {

            if (err) {
                console.log("failed to fetch income", err);
                return res.send("Failed to fetch income");
            }

            pool.query(
                "select sum(amount) as TotalExpense from transactions where user_id=? and type='expense'",
                [req.session.userId],
                (err, TotalExpense) => {

                    if (err) {
                        console.log("failed to fetch expense", err);
                        return res.send("Failed to fetch expense");
                    }

                    pool.query(
                        "select category, sum(amount) as total_expense from transactions where user_id=? and type='expense' group by category",
                        [req.session.userId],
                        (err, graphData) => {

                            if (err) {
                                console.log("failed to generate piechart", err);
                                return res.send("Failed to generate piechart");
                            }

                            let income = TotalIncome[0].TotalIncome || 0;
                            let expense = TotalExpense[0].TotalExpense || 0;
                            let balance = income - expense;

                            console.log("Income:", income);
                            console.log("Expense:", expense);
                            console.log("Balance:", balance);
                            console.log("Graph Data:", graphData);

                            res.render("dashboard.ejs", {
                                income: income,
                                expense: expense,
                                balance: balance,
                                graphData: graphData
                            });
                        }
                    );
                }
            );
        }
    );
});

app.get("/finkit/signup",(req,res)=>{ //loading sign up
    res.render("signup.ejs");
    console.log("User requested for signup");
});

app.post("/finkit/signup",async(req,res)=>{ //sign up logic
    let name=req.body.name;
    let email=req.body.email;
    let pass=req.body.pass;
    let age=req.body.age;

    
    let Euser= await userdata.findOne({email: email}); 
    if(Euser){
        return res.send("User already exist , please login");
        
    }
        let data={
            name:name,
            email:email,
            pass:pass,
            age:age
    };
        await userdata.insertOne(data);
        return res.send("you are registed please login now");
      


});

app.get("/finkit/login",(req,res)=>{ //loading login page
    res.render("login.ejs");
})



app.post("/finkit/login",async (req,res)=>{ //login logic
    let email=req.body.email;
    let pass=req.body.pass;

    let Euser = await userdata.findOne({email : email});
    if(!Euser){
        return res.send("user doesnt exit , please check entered email or register");
    }

    if(Euser.pass===pass){
        req.session.userId=Euser._id.toString();
        req.session.userName=Euser.name;
        
        console.log("user logined : ",req.session.userName);
        console.log("user id",req.session.userId);

    }
    res.redirect("/finkit/dashboard");


});
app.get("/finkit/test-session", (req, res) => { //test session

    console.log("Session:", req.session);

    res.json({
        userId: req.session.userId,
        userName: req.session.userName,
        userEmail: req.session.userEmail
    });

});

app.get("/finkit/transactions",requirelogin,(req,res)=>{ //transactions
    console.log("user requested Transactions");
    pool.query("SELECT * FROM transactions WHERE user_id=?",[req.session.userId],
        (err,result)=>{
            if(err){
                console.log("failed to load transactions",err);

            }
            pool.query("select sum(amount) as TotalIncome from transactions where user_id=? and type='income'",[req.session.userId],
                (err,TotalIncome)=>{
                    if(err){
                        console.log("couldn't load income on transactions page",err);
                    }
                    pool.query("select sum(amount) as TotalExpense from transactions where user_id=? and type='expense'",[req.session.userId],
                        (err,TotalExpense)=>{
                            if(err){
                                console.log("couldm't load expense on transactions page",err);
                            }

                            pool.query("select category,sum(amount) as total_expense from transactions where user_id=? and type='expense' group by category",[req.session.userId],
                                (err,graphData)=>{
                                    if(err){
                                        console.log("failed to generate piechart",err);
                                    }

                                       let income=TotalIncome[0].TotalIncome;
                                        let expense=TotalExpense[0].TotalExpense;
                                        let balance=income-expense;
                                        
                                        res.render("transactions.ejs",{transactions:result,
                                            income:income,
                                            expense:expense,
                                            balance:balance,graphData:graphData});
                                }
                            )




                         
                        }
                    )
                     
                    
                    
                })
            console.log(result);
           


        });
    
        
        
    
});

app.get("/finkit/logout",(req,res)=>{ //logout
    req.session.destroy((err)=>{
        if(err){
        console.log(err);
        return res.send("Could not log out");
    }
    });

    console.log("user logged out");
    return res.redirect("/finkit");
})

app.post("/finkit/transactions",(req,res)=>{ //adding transactions to db
    let user_id=req.session.userId;
    let type=req.body.type;
    let amount=req.body.amount;
    let category=req.body.category || null;
    if(type==="Income"){
        category=null;
    }
    let date=req.body.date;
    let description=req.body.description;

    pool.query("INSERT INTO transactions (user_id,amount,type,category,description,transaction_date) VALUES (?,?,?,?,?,?)",[user_id,amount,type,category,description,date],
        (err,result)=>{
        if(err){
            console.log(err);
            return res.send("failed to insert data in database");
        }
        
        console.log("Data Inserted",result);
        res.redirect("/finkit/transactions");
            
        
    })

});

app.post("/finkit/delete-transaction",(req,res)=>{ //delete transaction

    let transactionId=req.body.transactionId;
    pool.query("delete from transactions where id=?",[transactionId],
        (err,result)=>{
            console.log("user deleted a  transaction",transactionId);
            if(err){
                console.log("Deleting transaction failed",err);
            }
            console.log(result);
            
        }
        
    )
    res.redirect('/finkit/transactions');
});


app.post("/finkit/edit-transaction",(req,res)=>{
    let transactionId=req.body.transactionId;
    let amount=req.body.amount;
    let type=req.body.type;
    let category=req.body.category;
    let date=req.body.date;
    let description=req.body.description;
    pool.query("update transactions set amount=?,type=?,category=?,transaction_date=?,description=? where id=?",[amount,type,category,date,description,transactionId],
        (err,result)=>{
            if(err){
                console.log("failed to edit transaction",err);
            }
        }
    )
    res.redirect('/finkit/transactions');
});

app.post("/finkit/transaction-filter",(req,res)=>{ //filter for transactions 
    let date=req.body.date;
    let userId=req.session.userId;
     pool.query("SELECT * FROM transactions WHERE user_id=? and transaction_date=?",[userId,date],
        (err,result)=>{
            if(err){
                console.log("failed to load transactions",err);

            }
            pool.query("select sum(amount) as TotalIncome from transactions where user_id=? and type='income'",[req.session.userId],
                (err,TotalIncome)=>{
                    if(err){
                        console.log("couldn't load income on transactions page",err);
                    }
                    pool.query("select sum(amount) as TotalExpense from transactions where user_id=? and type='expense'",[req.session.userId],
                        (err,TotalExpense)=>{
                            if(err){
                                console.log("couldm't load expense on transactions page",err);
                            }

                            pool.query("select category,sum(amount) as total_expense from transactions where user_id=? and type='expense' group by category",[req.session.userId],
                                (err,graphData)=>{
                                    if(err){
                                        console.log("failed to generate piechart",err);
                                    }

                                       let income=TotalIncome[0].TotalIncome;
                                        let expense=TotalExpense[0].TotalExpense;
                                        let balance=income-expense;
                                        
                                        res.render("transactions.ejs",{transactions:result,
                                            income:income,
                                            expense:expense,
                                            balance:balance,graphData:graphData});
                                }
                            )




                         
                        }
                    )
                     
                    
                    
                })
            console.log(result);
           


        });
})
