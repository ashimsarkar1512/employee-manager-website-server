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
     "https://assignment-12-category-0007-server.vercel.app",
     'https://assignment-12-category-7.web.app'
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
   
    const assetCollection = client.db("StaffLinkUser").collection("assets");





    app.post('/jwt', async(req,res)=>{
      const user=req.body
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({token})
    })

 // Verify Token
 const verifyToken = (request, response, next) => {
  // console.log("vToken", request.headers.authorization);
  if (!request.headers.authorization) {
    return response.status(401).send({ message: "forbidden access 1" });
  }
  const token = request.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return response.status(401).send({ message: "forbidden access 2" });
    }
    request.decoded = decoded;
    next();
  });
};

// Verify HR
const verifyHR = async (request, response, next) => {
  const email = request.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isHR = user?.role === "hr";
  if (!isHR) {
    return response.status(403).send({ message: "forbidden 1" });
  }
  next();
};

// Verify Employee
const verifyEmployee = async (request, response, next) => {
  const email = request.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isEmployee = user?.role === "employee";
  if (!isEmployee) {
    return response.status(403).send({ message: "forbidden 2" });
  }
  next();
};

// Create User
app.post("/users", async (request, response) => {
  const user = request.body;
  const emailQuery = { email: user.email };
  const companyQuery = { company_name: user.company_name };
  const role = user.role;

  const existingUser = await userCollection.findOne(emailQuery);
  const existingCompany = await userCollection.findOne(companyQuery);

  if (existingUser) {
    return response.send({
      message: "User Already Exists!",
      insertedId: null,
    });
  }

  if (role == "hr" && existingCompany) {
    return response.send({
      message: "Company Name Already Exists!",
      insertedId: null,
    });
  }

  const result = await userCollection.insertOne(user);
  response.send(result);
});

// Get Users
app.get("/users", verifyToken, verifyHR, async (request, response) => {
  const result = await userCollection.find().toArray();
  response.send(result);
});

// HR User
app.get("/users/hr/:email", async (request, response) => {
  const email = request.params.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let hr = false;
  if (user) {
    hr = user?.role === "hr";
  }
  response.send({ hr });
});

// Employee User
app.get("/users/employee/:email", async (request, response) => {
  const email = request.params.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let employee = false;
  if (user) {
    employee = user?.role === "employee";
  }
  response.send({ employee });
});

// Get An User Data
app.get("/users/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  res.send(user);
});

// Update User Name
app.patch("/users", verifyToken, async (req, res) => {
  const { email, name } = req.body;
  const filter = { email };
  const updateDoc = {
    $set: {
      name,
    },
  };
  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// Add An User To the Company
app.patch("/users/:id", verifyToken, verifyHR, async (req, res) => {
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

// Remove An User From the Company
app.patch("/users/:id", verifyToken, verifyHR, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $unset: {
      company_name: "",
      company_logo: "",
    },
  };
  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// Get Users by Company Name
app.get(
  "/users/company/:company_name",
  verifyToken,
  async (request, response) => {
    const companyName = request.params.company_name;
    const query = { company_name: companyName };
    const users = await userCollection.find(query).toArray();
    response.send(users);
  }
);
    app.post("/assets", verifyToken, verifyHR, async (req, res) => {
      const asset = req.body;
      const result = await assetCollection.insertOne(asset);
      res.send(result);
    });

    // Get Assets
    app.get("/assets", verifyToken, async (req, res) => {
      const { search, filter } = req.query;
      const userEmail = req.decoded.email;

      try {
        const user = await userCollection.findOne({ email: userEmail });

        if (!user || !user.company_name) {
          return res.status(400).send("User company not found");
        }

        const userCompany = user.company_name;

        let query = { company_name: userCompany };

        if (search) {
          query.product_name = { $regex: search, $options: "i" };
        }

        if (filter) {
          if (filter === "Available") {
            query.product_quantity = { $gt: 0 };
          } else if (filter === "Out Of Stock") {
            query.product_quantity = 0;
          } else if (filter === "Returnable") {
            query.product_type = "Returnable";
          } else if (filter === "Non-Returnable") {
            query.product_type = "Non-Returnable";
          }
        }

        const assets = await assetCollection.find(query).toArray();
        res.send(assets);
      } catch (error) {
        console.error("Error fetching assets:", error);
        res.status(500).send("Error fetching assets");
      }
    });

    // Get Assets with limited stock by company name
    app.get("/assets/limited-stock/:company_name", async (req, res) => {
      const companyName = req.params.company_name;

      try {
        const assets = await assetCollection
          .find({
            company_name: companyName,
            product_quantity: { $lt: 10 },
          })
          .toArray();

        res.send(assets);
      } catch (error) {
        console.error("Error fetching limited stock assets:", error);
        res.status(500).send({ error: "Error fetching limited stock assets" });
      }
    });

    // Get A Single Asset
    app.get("/assets/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const asset = await assetCollection.findOne({ _id: new ObjectId(id) });
      res.send(asset);
    });

    // Update an Asset
    app.put("/assets/:id", verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;
      const assetUpdates = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: assetUpdates,
      };
      const result = await assetCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete an asset by ID with company name verification
    app.delete("/assets/:id", verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;
      const asset = await assetCollection.findOne({ _id: new ObjectId(id) });
      const result = await assetCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });



    


     app.post(
      "/requestAsset",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        const requestedAsset = req.body;

        const session = client.startSession();
        session.startTransaction();

        try {
          const { asset_id } = requestedAsset;

          // Find the asset to check its current quantity
          const asset = await assetCollection.findOne(
            { _id: new ObjectId(asset_id) },
            { session }
          );

          if (!asset) {
            throw new Error("Asset not found");
          }

          const productQuantity = parseInt(asset.product_quantity);
          if (isNaN(productQuantity) || productQuantity === 0) {
            throw new Error("Asset is out of stock or has an invalid quantity");
          }

          // Insert the requested asset into the collection
          const insertResult = await productCollection.insertOne(
            requestedAsset,
            { session }
          );

          if (insertResult.insertedId) {
            // Decrease the quantity of the asset in the assets collection
            const assetResult = await assetCollection.updateOne(
              { _id: new ObjectId(asset_id) },
              { $inc: { product_quantity: -1 } },
              { session }
            );

            if (assetResult.modifiedCount === 1) {
              await session.commitTransaction();
              res.send(insertResult);
            } else {
              throw new Error("Failed to update asset quantity");
            }
          } else {
            throw new Error("Failed to insert requested asset");
          }
        } catch (error) {
          console.error("Transaction error:", error);
          await session.abortTransaction();
          res.status(500).send({ message: error.message });
        } finally {
          session.endSession();
        }
      }
    );

    // Approved or Rejected
    app.put(
      "/requestAsset/:id",
      verifyToken,
      verifyHR,
      async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        const session = client.startSession();
        session.startTransaction();

        try {
          const requestedAsset = await productCollection.findOne(
            { _id: new ObjectId(id) },
            { session }
          );

          if (!requestedAsset) {
            throw new Error("Requested asset not found");
          }

          // Prepare the update document
          const updateDoc = { $set: { status } };
          if (status === "Approved") {
            updateDoc.$set.approval_date = new Date();
          }

          // Update the status (and approval_date if approved) of the requested asset
          const updateResult = await  productCollection.updateOne(
            { _id: new ObjectId(id) },
            updateDoc,
            { session }
          );

          if (status === "Rejected") {
            // Increment the asset quantity if the status is Rejected
            const assetResult = await assetCollection.updateOne(
              { _id: new ObjectId(requestedAsset.asset_id) },
              { $inc: { product_quantity: 1 } },
              { session }
            );

            if (assetResult.modifiedCount !== 1) {
              throw new Error("Failed to update asset quantity");
            }
          }

          await session.commitTransaction();
          res.send(updateResult);
        } catch (error) {
          console.error("Transaction error:", error);
          await session.abortTransaction();
          res.status(500).send({ message: error.message });
        } finally {
          session.endSession();
        }
      }
    );

    // Get All Requested Assets
    app.get("/requestAsset", async (req, res) => {
      const { email, company_name } = req.query;
      let query = {};

      if (email && company_name) {
        query = {
          requester_email: email,
          requester_company: company_name,
        };
      }

      const requestedAssets = await  productCollection
        .find(query)
        .toArray();
      res.send(requestedAssets);
    });

    // Get All Requested Assets By Employee
    app.get("/filtered-requestAsset",verifyToken, async (req, res) => {
      const { company_name, assetName, status, assetType } = req.query;
      const query = {};

      // Get the email from the query parameter or the decoded JWT token
      const email = req.query.email || req.decoded.email;
      if (!email) {
        return res.status(400).send({ error: "Email not provided or invalid" });
      }
      query.requester_email = email;

      if (company_name) {
        query.requester_company = company_name;
      }

      if (assetName) {
        query.asset_name = { $regex: assetName, $options: "i" };
      }

      if (status) {
        query.status = status;
      }

      if (assetType === "Returnable") {
        query.asset_type = "Returnable";
      } else if (assetType === "Non-Returnable") {
        query.asset_type = "Non-Returnable";
      }

      try {
        const result = await  productCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ error: "Failed to fetch filtered requested assets" });
      }
    });

    // Cancel a Requested Asset
    app.put(
      "/requestAsset/:id/cancel",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        const { id } = req.params;

        const session = client.startSession();
        session.startTransaction();

        try {
          const requestedAsset = await  productCollection.findOne(
            { _id: new ObjectId(id) },
            { session }
          );

          if (!requestedAsset) {
            throw new Error("Requested asset not found");
          }

          // Update the status of the requested asset to "Cancelled"
          const updateResult = await  productCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "Cancelled" } },
            { session }
          );

          // Increment the asset quantity in the assets collection
          const assetResult = await assetCollection.updateOne(
            { _id: new ObjectId(requestedAsset.asset_id) },
            { $inc: { product_quantity: 1 } },
            { session }
          );

          if (
            updateResult.modifiedCount === 1 &&
            assetResult.modifiedCount === 1
          ) {
            await session.commitTransaction();
            res.send(updateResult);
          } else {
            throw new Error("Failed to update asset status or quantity");
          }
        } catch (error) {
          console.error("Transaction error:", error);
          await session.abortTransaction();
          res.status(500).send({ message: error.message });
        } finally {
          session.endSession();
        }
      }
    );

    // Return a Requested Asset
    app.put(
      "/requestAsset/:id/return",
      verifyToken,
      verifyEmployee,
      async (req, res) => {
        const { id } = req.params;

        const session = client.startSession();
        session.startTransaction();

        try {
          const requestedAsset = await  productCollection.findOne(
            { _id: new ObjectId(id) },
            { session }
          );

          if (!requestedAsset) {
            throw new Error("Requested asset not found");
          }

          // Check if the asset is already returned
          if (requestedAsset.status === "Returned") {
            throw new Error("Asset is already returned");
          }

          // Update the status of the requested asset to "Returned"
          const updateResult = await  productCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "Returned" } },
            { session }
          );

          // Increment the asset quantity in the assets collection
          const assetResult = await assetCollection.updateOne(
            { _id: new ObjectId(requestedAsset.asset_id) },
            { $inc: { product_quantity: 1 } },
            { session }
          );

          if (
            updateResult.modifiedCount === 1 &&
            assetResult.modifiedCount === 1
          ) {
            await session.commitTransaction();
            res.send(updateResult);
          } else {
            throw new Error("Failed to update asset status or quantity");
          }
        } catch (error) {
          console.error("Transaction error:", error);
          await session.abortTransaction();
          res.status(500).send({ message: error.message });
        } finally {
          session.endSession();
        }
      }
    );





    // Hr manager 


     


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