const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const data= new Schema({
    name:{
    type:String,
    required:true,
    },
    email:{
    type: String,
    required:true,
    },
    pass:{
    type: String,
    required:true,
    },
    age:{
    type:Number,
    required:true,
    }
});

const userdata=mongoose.model("finkit_users",data);


module.exports=userdata;