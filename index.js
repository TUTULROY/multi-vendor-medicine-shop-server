const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);788877
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin:[
      'http://localhost:5173',
      'https://multi-vendor-medicine-shop.web.app'
      
  ],
 
}));
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.svv3meu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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


    const userCollection = client.db("medicineShopDB").collection("users");
    const menuCollection = client.db("medicineShopDB").collection("menu");
    const cartCollection = client.db("medicineShopDB").collection("carts");
    const categoryCollection = client.db("medicineShopDB").collection("category");
    const reviewCollection = client.db("medicineShopDB").collection("reviews");
    const paymentCollection = client.db("medicineShopDB").collection("payments");


    app.post('/jwt', async(req, res) =>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        });
        res.send({token});
      });


      //middleware
      const verifyToken = (req, res, next) => {
        // console.log('inside verify token', req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
      }

      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }

      app.get('/users', verifyToken, verifyAdmin, async (req, res)=>{
        // console.log(req.headers);
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
  
   
  
   
    app.post('/users', async(req, res) =>{
        const user = req.body;
       
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
            return res.send({message: 'user already  exists', insertedId: null })
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    });

    app.get('/users/seller/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let seller = false;
      if (user) {
        seller = user?.role === 'seller';
      }
      res.send({ seller });
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) =>{
        const id = req.params.id;
        
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set:{
            role: 'admin'
          }
        }
        const result= await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      })

    app.delete('/users/:id',verifyToken, verifyAdmin, async (req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query);
        res.send(result);
      })


      app.patch('/users/both/:id',verifyToken, verifyAdmin, async (req, res) =>{
        const id = req.params.id;
        const { role } = req.body;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set:{
            role: role
          }
        }
        const result= await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      })



    app.get('/menu', async (req, res)=>{
        const result = await menuCollection.find().toArray();
        res.send(result);
    })
    app.get('/menu/:email', async (req, res)=>{
      const query = { email: req.params.email }
        const result = await menuCollection.find(query).toArray();
        res.send(result);
    })

    app.get('/menu/:id', async(req, res) =>{
        const id = req.params.id;
        const query= {_id: new ObjectId(id)}
        const result = await menuCollection.findOne(query);
        res.send(result);
    }),

    app.post('/menu', async(req, res)=>{
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
  })

    app.get('/carts', async (req, res) =>{
        const email = req.query.email;
        const query = { email: email};
        const result = await cartCollection.find(query).toArray();
        res.send(result);
    })

    app.post('/carts', async(req, res)=>{
        const cart = req.body;
        const result = await cartCollection.insertOne(cart);
        res.send(result);
    })

    app.delete('/carts/:id', async (req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await cartCollection.deleteOne(query);
        res.send(result);
      })

      app.delete('/carts', async(req, res)=>{
        const email = req.query.email;
        const result = await cartCollection.deleteMany({email: email});
        res.send(result);
      })

    app.get('/category', async (req, res)=>{
        const result = await categoryCollection.find().toArray();
        res.send(result);
    })

    app.post('/category', async(req, res)=>{
        const category = req.body;
        const result = await categoryCollection.insertOne(category);
        res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    // payment
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.get('/payments', verifyToken, verifyAdmin, async (req, res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
  })

    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) =>{
      
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      console.log('payment info', payment)

      const query = {_id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollection.deleteMany(query);
      res.send({paymentResult , deleteResult});
    })

    app.patch('/payments/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          status: 'paid'
        }
      }
      const result= await paymentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


   app.get('/admin-stats', async (req, res) => {
    const users = await userCollection.estimatedDocumentCount();
    const menuItems = await menuCollection.estimatedDocumentCount();
    const orders = await paymentCollection.estimatedDocumentCount();
    const totalRevenue = await paymentCollection.aggregate([
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$price' }
            }
        }
    ]).toArray();
    const sales = await paymentCollection.find().toArray();
    
    
    res.send({
        users,
        menuItems,
        orders,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        sales
    });
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('T.R medicine is sitting')
})

app.listen(port, ()=>{
    console.log(`T.R medicine is sitting on port ${port}`);
})