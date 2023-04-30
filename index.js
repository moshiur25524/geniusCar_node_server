const express = require('express');
require('dotenv').config()
const app = express();
const jwt = require('jsonwebtoken')
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oesiy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Unauthorized access')
  }

  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).send('Unauthorized access')
    }
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {

    await client.connect();
    console.log("You successfully connected to MongoDB!");

    const serviceCollection = client.db('geniusCar').collection('services')
    const orderCollection = client.db('geniusCar').collection('orders')

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })

    app.get('/services', async (req, res) => {
      const services = await serviceCollection.find({}).toArray();
      res.send(services)
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const service = await serviceCollection.findOne({ _id: new ObjectId(id) })
      res.send(service)
    })

    // orders API
    app.get('/orders', verifyJWT, async (req, res) => {

      const decoded = req.decoded;
      console.log(decoded);
      if(decoded.email !== req.query.email){
        return res.status(403).send('Forbidden access')
      }

      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email
        }
      }
      const orders = await orderCollection.find(query).toArray();
      res.send(orders)
    })

    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result)
      console.log(result);
    })

    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const docItems = {
        $set: {
          status,
        }
      }

      const result = await orderCollection.updateOne({ _id: new ObjectId(id) }, docItems);
      res.send(result)
    })

    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const result = await orderCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result);
      console.log(result);
    })
  } finally {

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('The Genius server is running')
})

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
})