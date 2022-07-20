import { TodoAPI } from "@/datasources";
import { Resolvers, TodoStatus } from "@/types";

export const resolvers: Resolvers = {
  Query: {
    todos: (_, args, { dataSources: { todoAPI } }, info) => {
      const parsed = TodoAPI.getsUserTodos(args);

      return todoAPI.getsUserTodos({ ...parsed, info });
    },
    todo: (_, args, { dataSources: { todoAPI } }) => {
      const parsed = TodoAPI.get(args);

      return todoAPI.get(parsed);
    },
  },
  Mutation: {
    createTodo: (_, args, { dataSources: { todoAPI } }) => {
      const parsed = TodoAPI.create({ userId: args.userId, ...args.input });

      return todoAPI.create(parsed);
    },
    updateTodo: (_, args, { dataSources: { todoAPI } }) => {
      const parsed = TodoAPI.update({ id: args.id, ...args.input });

      return todoAPI.update(parsed);
    },
    deleteTodo: (_, args, { dataSources: { todoAPI } }) => {
      const parsed = TodoAPI.delete(args);

      return todoAPI.delete(parsed);
    },
    completeTodo: (_, args, { dataSources: { todoAPI } }) => {
      const parsed = TodoAPI.update(args);

      return todoAPI.update({ ...parsed, status: TodoStatus.Done });
    },
    uncompleteTodo: (_, args, { dataSources: { todoAPI } }) => {
      const parsed = TodoAPI.update(args);

      return todoAPI.update({ ...parsed, status: TodoStatus.Pending });
    },
  },
  Todo: {
    user: ({ userId }, _, { dataSources: { userAPI } }) => {
      return userAPI.get({ id: userId });
    },
  },
};
