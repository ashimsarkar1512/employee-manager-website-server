const express = require('express');
const app=express();
const cors = require('cors');
const jwt=require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const productCollection = client.db("StaffLinkUser").collection("requestAsset");
    const employeeCollection = client.db("StaffLinkUser").collection("products");
    const assetCollection = client.db("StaffLinkUser").collection("assets");





    app.post('/jwt', async(req,res)=>{
      const user=req.body
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({token})
    })


    const verifyToken=(req,res,next)=>{
      console.log('inside verify token',req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message:"unauthorized access"})
      }
      const token=req.headers.authorization.split(' ')[1]
      console.log(token);
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err){
          return res.status(401).send({message:"unauthorized access"})
        }
        req.decoded=decoded;
        next()
      })
    }

    app.get('/users/hr/:email',verifyToken, async(req,res)=>{
      const email=req.params.email;
      if(email!== req.decoded.email){
        return res.status(403).send({message:'forbidden access'})
      }
      const query={email:email}
      const user=await userCollection.findOne(query)
      let hr=false
      if(user){
        hr=user?.role==='hr';
      }
      res.send({hr})
     })

          // employee

     app.get("/users/:email", verifyToken, async (request, response) => {
      const email = request.params.email;

      if (email !== request.decoded.email) {
          return response.status(403).send({ message: "unauthorized" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let employee = false;
      if (user?.email && user?.role === "employee") {
          employee = user;
      }
      // console.log(hr);
      response.send(employee);
  });
    

    app.post('/users', async(req,res)=>{
      const user=req.body;
      const result=await userCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users',verifyToken,async(req,res)=>{
      const result=await userCollection.find().toArray()
      res.send(result)
    })


    app.patch('/users/hr/:id',async(req,res)=>{
      const id=req.params.id
      const filter={_id:new ObjectId(id)}
      const updateDoc={
        $set:{
          role:'hr'
        }
      }
      const result=await userCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete('/users/:id',async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result=await userCollection.deleteOne(query)
      res.send(result)
    })


    // normal employee 
    //  app.post('/employee', async(req,res)=>{
    //   const request=req.body;
    //   const result =await employeeCollection.insertOne(request)
    //   res.send(result)
    //  })


     app.get('/products',async(req,res)=>{
      const result=await employeeCollection.find().toArray()
      res.send(result)
     })

     app.post('/requestAsset', async(req,res)=>{
      const assets=req.body;
      const result=await productCollection.insertOne(assets);
      res.send(result)
    })
    app.get('/requestAsset/:email',async(req,res)=>{
      const email=req.params.email
      const query={email:email}
      const result=await productCollection.find(query).toArray()
      console.log(result);
      res.send(result)

    })
    app.get('/requestAsset/:email',async(req,res)=>{
      const email=req.params.email
      const query={email:email,
        status:"pending"
      }
      const result=await productCollection.find(query).toArray()
      console.log(result);
      res.send(result)

    })

    app.get('/requestAsset/:email',async(req,res)=>{
      const email=req.params.email

      const query = {email:email,
         status: "pending" };

      const result=await productCollection.find(query).toArray()
      console.log(result);
      res.send(result)
    })

    
    app.put('/requestAsset/:id', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const query = { _id:(id) };
      const update = {
        $set: { status: status },
      };
 
    
      try {
        const result = await productCollection.updateOne(query, update);
        if (result.modifiedCount === 1) {
          res.send({ success: true, message: 'Status updated successfully' });
        } else {
          res.send({ success: false, message: 'No document matched the query' });
        }
      } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });
    




    // Hr manager 


    app.post('/assets', async(req,res)=>{
      const asset=req.body;
      const result=await assetCollection.insertOne(asset);
      res.send(result)
    })
   
   
     app.get('/assets',async(req,res)=>{
      const filter=req.query;
      console.log(filter);
      const query={}
      if (typeof filter.search === 'string' && filter.search.length > 0) {
        query.name = { $regex: filter.search, $options: 'i' };
      }

      if (typeof filter.type === 'string' && filter.type.length > 0) {
        query.type = { $regex: new RegExp(filter.type, 'i') };
      }
      const options={
          sort:{quantity:filter.sort==='asc'? 1:-1}
      }
      const result=await assetCollection.find(query,options).toArray()
      res.send(result)
     })



       app.get('/assets',async(req,res)=>{
  
      const result=await assetCollection.find().toArray()
      res.send(result)
     })


    //  app.get('/assets',async(req,res)=>{
    //   const filter=req.query.filter
    //   let query={}
    //   if(filter){
    //    query = { type: { $regex: new RegExp(filter, 'i') } };
       
    //   }
    //   const result=await assetCollection.find(query).toArray()
    //   res.send(result)
    //  })
 


     app.patch('/assets/:id',async(req,res)=>{
      const item=req.body;
      const id=req.params.id
      const filter ={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          name:item.name,
          type:item.type,
          quantity:item.quantity,
       
          date:item.date

        }
       
      }
      const result=await assetCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


    app.delete('/assets/:id',async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result=await assetCollection.deleteOne(query)
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