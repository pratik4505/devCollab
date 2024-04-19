require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const Database=require('./config/database');
const PORT = process.env.PORT || 4000;
const MONGODB_URI=`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.0rkt5ow.mongodb.net/devcollab?retryWrites=true&w=majority`
const db = new Database(MONGODB_URI);
const passport=require('./config/passport-config');
const gitHubAuth=require('./routes/gitHubAuth')
const chatRoutes = require("./routes/chatRoutes");
db.connect().catch((err) =>
  console.error("Error connecting to database:", err)
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());

app.use('/auth',gitHubAuth);
app.use("/chat", chatRoutes);


app.get("/server-status", (req, res) => {
  res.status(200).json({ message: "Server is up and running!" });
});

app.listen(PORT, () => console.log(`Server up and running on port ${PORT}!`));
