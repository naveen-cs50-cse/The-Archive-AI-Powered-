import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import routes from './routes/routes.js'
import authRoutes from './routes/auth.js';

const app=express();
const port=4000;

app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use('/api',routes);
app.use('/auth',authRoutes)

app.get('/',(req,res)=>{
    res.json("hello buddy");
})

app.listen(port,(err)=>{
    if(err)
    {
        console.log("failed to start server ",err)
    }
    else
    {
        console.log("server running at 4000");
    }
})