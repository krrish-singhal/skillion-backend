import mongoose from 'mongoose'

const connectToDB = async()=>{
    mongoose.connection.on("connected",()=>{
        console.log("Mongo DB Connected");
    })

    await mongoose.connect(process.env.MONGODB_URI);
}

export default connectToDB 