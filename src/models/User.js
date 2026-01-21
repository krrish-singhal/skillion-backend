import mongoose from "mongoose";

const userSchema=mongoose.Schema({
    _id:{
        type:String,
        required:true,
    },
    name:{
        firstName:{
            type:String,
            required:true,
              trim: true,
        },
        lastName:{
            type:String,
              trim: true,
        }
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase: true,
        trim: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please enter a valid email address"
        ]
    },
    imageUrl:{
        type:String,
        required:true,
    },
    enrolledCourses:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Course'
    }]
});

export default mongoose.model('User',userSchema);