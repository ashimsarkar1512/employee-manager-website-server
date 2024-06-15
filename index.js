const express = require('express');
const app=express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port=process.env.PORT || 5000;



// middleware

app.use(cors());
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ljh6ijp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("StaffLinkUser").collection("users");
    const assetCollection = client.db("StaffLinkUser").collection("assets");

    app.post('/users', async(req,res)=>{
      const user=req.body;
      const result=await userCollection.insertOne(user);
      res.send(result)
    })
    app.post('/assets', async(req,res)=>{
      const asset=req.body;
      const result=await assetCollection.insertOne(asset);
      res.send(result)
    })
   
     app.get('/assets',async(req,res)=>{
      const result=await assetCollection.find().toArray()
      res.send(result)
     })



     app.patch('/assets/:id',async(req,res)=>{
      const item=req.body;
      const id=req.params.id
      const filter ={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          name:item.name,
          type:item.type,
          quantity:item.quantity,
       
          image:item.image

        }
       
      }
      const result=await assetCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

   





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
   res.send('assignment-12 is running')
})

app.listen(port, ()=>{
            console.log(`assignment is sitting on port ${port}`);
})