import { User } from "../entities/User";
import { Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType, Query } from "type-graphql";
import argon2 from "argon2";
import { MyContext } from "../types";
import { COOKIE_NAME } from "../constants";
import sendEmail from "../utils/sendEMail";
import jwt from "jsonwebtoken";

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
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UserInput) options: UserInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const hashedPassword = await argon2.hash(options.password);

    const user = em.create(User, {
      username: options.username,
      email: options.email,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      return {
        errors: [{ field: "name", message: error.message }],
      };
    }

    // login user after register
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options", () => LoginInput) options: LoginInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });

    if (!user) {
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

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        res.clearCookie(COOKIE_NAME);
        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Arg("email") email: string, @Ctx() { em }: MyContext): Promise<Boolean> {
    const user = await em.findOne(User, { email });

    if (!user) {
      // no user with this email
      return false;
    }

    const SECRET = `${user.createdAt}${user.id}${user.password}`;
    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
    console.log(token);

    await sendEmail(
      email,
      `<a href="http://localhost:3000/reset-password/${token}">reset password</a> this link expires in an hour`
    );
    return true;
  }

  @Mutation(() => UserResponse)
  async resetPassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    let userId = -1;
    try {
      const payload = jwt.decode(token);
      userId = payload.userId;
    } catch (error) {
      return {
        errors: [
          {
            field: "token",
            message: "invalid token at decode",
          },
        ],
      };
    }

    const user = await em.findOne(User, { id: userId });
    if (!user) {
      console.log("user does not exist");
      return {
        errors: [
          {
            field: "token",
            message: "user does not exist",
          },
        ],
      };
    }

    const SECRET = `${user.createdAt}${user.id}${user.password}`;

    try {
      jwt.verify(token, SECRET);
    } catch (error) {
      console.log(error);
      return {
        errors: [
          {
            field: "token",
            message: "invalid token at verify",
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(newPassword);
    user.password = hashedPassword;

    await em.persistAndFlush(user);

    // log in user after password reset
    req.session.userId = user.id;

    return { user };
  }
}
