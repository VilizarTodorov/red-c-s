import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { PORT } from "./constants";
import { ApolloServer } from "apollo-server-express";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/Post";
import { UserResolver } from "./resolvers/User";
import { buildSchema } from "type-graphql";
import session from "express-session";
import { MyContext } from "./types";
import cors from "cors";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";
import { Updoot } from "./entities/Updoot";
import createUserLoader from "./utils/createUserLoader";
import createUpdootLoader from "./utils/createUpdootLoader";

const main = async () => {
  const connection = await createConnection({
    type: "postgres",
    database: "reddit2",
    username: "postgres",
    password: "5550155",
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, "/migrations/*")],
    entities: [Post, User, Updoot],
  });

  await connection.runMigrations();

  // Post.delete({})

  const app = express();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    session({
      // add storage for production
      //uses memory storage per default
      name: COOKIE_NAME,
      secret: "my secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365, // one year
        httpOnly: true,
        secure: __prod__, // cookie only works in https
        sameSite: "lax",
      },
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({ resolvers: [HelloResolver, PostResolver, UserResolver], validate: false }),
    context: ({ req, res }): MyContext => ({ req, res, userLoader: createUserLoader(),updootLoader:createUpdootLoader() }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(PORT, () => {
    console.log(`listening on port:${PORT}`);
  });
};

main();
