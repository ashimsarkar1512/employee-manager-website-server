const express = require('express');
const app=express();
const cors = require('cors');
const jwt=require('jsonwebtoken')
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port=process.env.PORT || 5000;



// middleware

app.use(cors(
  {
    origin: [
      "http://localhost:5173",
      'http://localhost:5174',
     "https://assignment-12-category-0007-server.vercel.app"
    ],
    
  }
));
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
    // await client.connect();

    const userCollection = client.db("StaffLinkUser").collection("users");
    const productCollection = client.db("StaffLinkUser").collection("requestAsset");
    const paymentCollection = client.db("StaffLinkUser").collection("payments");
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

  //    app.get("/users/:email", async (request, response) => {
  //     const email = request.params.email;

  //     if (email !== request.decoded.email) {
  //         return response.status(403).send({ message: "unauthorized" });
  //     }

  //     const query = { email: email };
  //     const user = await userCollection.findOne(query);
  //     let employee = false;
  //     if (user?.email && user?.role === "employee") {
  //         employee = user;
  //     }
  //     // console.log(hr);
  //     response.send(employee);
  // });


  app.get("/users/:email", async (req, res) => {
    const email = req.params.email;
    console.log(email);
    const query = { email: email };
    const user = await userCollection.findOne(query);
    res.send(user);
  });
    

    app.post('/users', async(req,res)=>{
      const user=req.body;
      const result=await userCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users',async(req,res)=>{
      const query = { role: "employee" };
        const result = await userCollection.find(query).toArray();
      res.send(result)
    })
  

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const { company_name, company_logo } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          company_name,
          company_logo,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

  
    // app.patch('/users/:id', async (req, res) => {
      
    //     const { id } = req.params;
    //     const { companyName, companyLogo, addedBy, affiliate } = req.body;
    
    //     const result = await db.collection('users').updateOne(
    //       { _id: new ObjectId(id) },
    //       {
    //         $set: {
    //           companyName,
    //           companyLogo,
    //           addedBy,
    //           affiliate
    //         }
    //       }
    //     );
    
    //    res.send(result)
    // });

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
    


    


    

     app.get('/products',async(req,res)=>{
      const result=await employeeCollection.find().toArray()
      res.send(result)
     })

     app.post('/requestAsset', async(req,res)=>{
      const assets=req.body;
      const result=await productCollection.insertOne(assets);
      res.send(result)
    })


     app.get('/requestAsset', async(req,res)=>{
      const {email}=req.query;
      const query={email:email}
           
      const result=await productCollection.find(query).toArray();
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


    app.put('/requestAsset/approve/:id', async (req, res) => {
      try {
          const { id } = req.params;
          const { hrEmail } = req.body;
          const approvalDate = new Date().toISOString();
          const updatedRequest = await productCollection.findOneAndUpdate(
              { _id: new ObjectId(id) },
              { $set: { status: 'approved', approvalDate: approvalDate, email: hrEmail } },
              { returnOriginal: false }
          );
          res.json({ success: true, data: updatedRequest.value });
      } catch (err) {
          console.error('Error approving request:', err);
          res.status(500).json({ error: 'Failed to approve request' });
      }
  });
    app.put('/requestAsset/reject/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updatedRequest = await productCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { status: 'rejected' } },
          { returnOriginal: false }
        );
        res.json({ success: true, data: updatedRequest.value });
      } catch (err) {
        res.status(500).json({ error: 'Failed to reject request' });
      }
    });

   

    
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



     app.get('/assets/:id', async(req,res)=>{
      const id=req.params.id
       const query={_id:new ObjectId(id)}
       const result=await assetCollection.findOne(query)
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


    // Payment
    app.post("/create-payment-intent",  async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;

      const session = client.startSession();
      session.startTransaction();

      try {
        const paymentResult = await paymentCollection.insertOne(payment, {
          session,
        });

        const filter = { email: payment.hr_email };
        const updateDoc = {
          $set: {
            payment_status: true,
            payment_info: {
              transactionId: payment.transactionId,
              payment_from_company: payment.payment_from_company,
              payment_for_package: payment.payment_for_package,
              date: payment.date,
              price: payment.price,
            },
          },
        };

        const userResult = await userCollection.updateOne(filter, updateDoc, {
          session,
        });

        if (paymentResult.insertedId && userResult.modifiedCount === 1) {
          await session.commitTransaction();
          res.send({ paymentResult });
        } else {
          throw new Error("Payment or user update failed");
        }
      } catch (error) {
        await session.abortTransaction();
        res.status(500).send({ message: error.message });
      } finally {
        session.endSession();
      }
    });

    // Increase Limit
    app.put("/payments",  async (req, res) => {
      const {
        email,
        additionalLimit,
        transactionId,
        payment_from_company,
        payment_for_package,
        price,
      } = req.body;

      console.log("Received payment update request:", req.body);

      if (
        !email ||
        !transactionId ||
        !payment_from_company ||
        !payment_for_package ||
        !price
      ) {
        console.error("Missing required fields in payment update request.");
        return res.status(400).send({ message: "Missing required fields." });
      }

      const session = client.startSession();
      session.startTransaction();

      try {
        const filter = { email: email };
        const updateDoc = {
          $set: {
            "payment_info.transactionId": transactionId,
            "payment_info.payment_from_company": payment_from_company,
            "payment_info.payment_for_package": payment_for_package,
            "payment_info.date": new Date(),
            "payment_info.price": price,
            packages: payment_for_package, // Update the packages field
          },
          $inc: {
            limit: additionalLimit,
          },
        };

        const userResult = await userCollection.updateOne(filter, updateDoc, {
          session,
        });

        if (userResult.modifiedCount !== 1) {
          throw new Error("Failed to update user payment info");
        }

        const payment = {
          hr_email: email,
          transactionId,
          payment_from_company,
          payment_for_package,
          date: new Date(),
          price,
          payment_status: true,
        };

        const paymentResult = await paymentCollection.insertOne(payment, {
          session,
        });

        if (!paymentResult.insertedId) {
          throw new Error("Failed to insert payment record");
        }

        await session.commitTransaction();
        res.send({ userResult, paymentResult });
      } catch (error) {
        console.error("Error processing payment update:", error);
        await session.abortTransaction();
        res.status(500).send({ message: error.message });
      } finally {
        session.endSession();
      }
    });



   





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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