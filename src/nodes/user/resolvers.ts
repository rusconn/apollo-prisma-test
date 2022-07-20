import { TodoAPI, UserAPI } from "@/datasources";
import type { Resolvers } from "@/types";

export const resolvers: Resolvers = {
  Query: {
    viewer: (_, __, { dataSources: { userAPI }, user }) => {
      return userAPI.get({ id: user.id });
    },
    users: (_, args, { dataSources: { userAPI } }, info) => {
      const parsed = UserAPI.gets(args);

      return userAPI.gets({ ...parsed, info });
    },
    user: (_, args, { dataSources: { userAPI } }) => {
      const parsed = UserAPI.get(args);

      return userAPI.get(parsed);
    },
  },
  Mutation: {
    createUser: (_, args, { dataSources: { userAPI } }) => {
      const parsed = UserAPI.create(args.input);

      return userAPI.create(parsed);
    },
    updateUser: (_, args, { dataSources: { userAPI } }) => {
      const parsed = UserAPI.update({ id: args.id, ...args.input });

      return userAPI.update(parsed);
    },
    deleteUser: (_, args, { dataSources: { userAPI } }) => {
      const parsed = UserAPI.delete(args);

      return userAPI.delete(parsed);
    },
  },
  User: {
    todos: ({ id }, args, { dataSources: { todoAPI } }, info) => {
      const parsed = TodoAPI.getsUserTodos({ ...args, userId: id });

      return todoAPI.getsUserTodos({ ...parsed, info });
    },
  },
};
