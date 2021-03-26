import DataLoader from "dataloader";
import { User } from "../entities/User";

const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUsers: Record<number, User> = {};
    users.forEach((user) => {
      userIdToUsers[user.id] = user;
    });

    return userIds.map((userId) => userIdToUsers[userId]);
  });

export default createUserLoader;
