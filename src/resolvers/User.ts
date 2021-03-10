import { User } from "../entities/User";
import { Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType } from "type-graphql";
import argon2 from "argon2";
import { MyContext } from "../types";

@InputType()
class UserInput {
  @Field()
  username: string;

  @Field()
  password: string;

  @Field()
  email: string;
}

@InputType()
class LoginInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => User)
  async register(@Arg("options", () => UserInput) options: UserInput, @Ctx() { em }: MyContext): Promise<User> {
    const hashedPassword = await argon2.hash(options.password);

    const user = em.create(User, {
      username: options.username,
      email: options.email,
      password: hashedPassword,
    });

    await em.persistAndFlush(user);
    return user;
  }

  @Mutation(() => UserResponse)
  async login(@Arg("options", () => LoginInput) options: LoginInput, @Ctx() { em }: MyContext): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });

    if (!user) {
      console.log("a");
      return {
        errors: [{ field: "username", message: "Cannot find user" }],
      };
    }

    const isPasswordValid = await argon2.verify(user.password, options.password);

    if (!isPasswordValid) {
      return {
        errors: [{ field: "name", message: "Username or password is incorrect" }],
      };
    }

    return { user };
  }
}
