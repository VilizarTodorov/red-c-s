import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import mikroOrmConfig from "./mikro-orm.config";

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  orm.getMigrator().up();

  const firstPost = orm.em.create(Post, { title: "firstTitle" });
  await orm.em.persistAndFlush(firstPost);
};

main();

console.log("hello world 23");
