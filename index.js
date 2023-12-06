const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParsar = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId, MaxKey } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// midddleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://motocross.web.app",
      "https://motocross.firebaseapp.com",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParsar());

// custom middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ error: "unAuthorized" });
  }
  jwt.verify(token, process.env.MOTO_CROSS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: "unAuthorized" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.MOTO_CROSS_DB_USER}:${process.env.MOTO_CROSS_DB_PASS}@cluster0.qzinma9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const productCollection = client.db("motoCrossDB").collection("products");
    const cartCollection = client.db("motoCrossDB").collection("cartProduct");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.MOTO_CROSS_SECRET_TOKEN, {
        expiresIn: "10h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true });
    });

    app.post("/logOut", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/products", async (req, res) => {
      const brandName = req.query.brand;
      const query = {brand: brandName}
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/count", async (req, res) => {
      const result = await productCollection.estimatedDocumentCount();
      res.send({ result });
    });

    app.get("/allProducts", async (req, res) => {
      console.log(req.query);
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await productCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });


    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.put("/product/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedProduct = {
        $set: {
          photo: product.photo,
          name: product.name,
          brand: product.brand,
          type: product.type,
          price: product.price,
          rating: product.rating,
        },
      };
      const result = await productCollection.updateOne(
        filter,
        updatedProduct,
        option
      );
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    app.get("/cart/:user", verifyToken, async (req, res) => {
      const user = req?.params?.user;
      console.log(user, "from 155");
      if (req?.user.email !== user) {
        return res.status(403).send({ error: "forbidden access" });
      }
      const query = { currentUser: user };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const cartProduct = req.body;
      console.log(cartProduct);
      const result = await cartCollection.insertOne(cartProduct);
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("api is running on UI server");
});

app.listen(port, (req, res) => {
  console.log("api is running on PORT :", port);
});
